import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StaffGuard } from '../../common/guards/staff.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ComplaintStatus, IComplaint, IUser, PriorityLevel } from '@sanjeevani/shared-types';
import { SmsNotificationService } from '../../shared/sms-notification.service';

@Controller('api/v1/complaints')
@UseGuards(JwtAuthGuard, StaffGuard)
export class ComplaintsController {
  constructor(
    private dataStore: DataStoreService,
    private sms: SmsNotificationService,
  ) {}

  @Get()
  async getComplaints() {
    await this.dataStore.refreshIfStale();
    return this.dataStore.complaints;
  }

  @Get(':id')
  async getComplaintById(@Param('id') id: string) {
    await this.dataStore.refreshIfStale();
    const complaint = this.dataStore.complaints.find((c) => c.id === id || c.complaintNumber === id);
    if (!complaint) throw new NotFoundException(`Complaint not found: ${id}`);
    return complaint;
  }

  @Post()
  async createComplaint(
    @Body()
    body: {
      customerId: string;
      category: string;
      description: string;
      priority?: PriorityLevel;
    },
    @CurrentUser() user: IUser,
  ) {
    const customer = this.dataStore.customers.find((c) => c.id === body.customerId);
    const complaintNumber = this.dataStore.nextComplaintNumber();

    const newComplaint: IComplaint = {
      id: `CMP-${Date.now()}`,
      complaintNumber,
      customerId: customer?.id || body.customerId,
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'General Customer',
      customerNumber: customer?.customerNumber,
      category: body.category || 'Service Request',
      description: body.description,
      priority: body.priority || PriorityLevel.MEDIUM,
      status: ComplaintStatus.OPEN,
      createdAt: new Date().toISOString(),
    };

    this.dataStore.complaints.unshift(newComplaint);
    await this.dataStore.persistComplaint(newComplaint);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Staff',
      'COMPLAINT_CREATED',
      'Complaint',
      newComplaint.id,
      undefined,
      newComplaint,
      `Registered complaint #${newComplaint.complaintNumber} for customer ${newComplaint.customerNumber}`,
    );

    // SRS §24 & §37: Trigger immediate SMS acknowledgment to customer
    if (customer?.mobile) {
      this.sms
        .sendComplaintRegisteredSms({
          mobile: customer.mobile,
          customerName: `${customer.firstName} ${customer.lastName}`,
          complaintNumber: newComplaint.complaintNumber,
        })
        .catch((err) => console.warn('[SMS] Complaint SMS dispatch failed:', err));
    }

    return newComplaint;
  }

  /**
   * BUG-08 FIX: ASSIGN — Route complaint to a staff member (OPEN → ASSIGNED)
   * SRS §37 Step 2
   */
  @Patch(':id/assign')
  async assignComplaint(
    @Param('id') id: string,
    @Body() body: { assignedTo: string; assignedToName: string },
    @CurrentUser() user: IUser,
  ) {
    const complaint = this.dataStore.complaints.find((c) => c.id === id || c.complaintNumber === id);
    if (!complaint) throw new NotFoundException('Complaint not found');

    if (complaint.status !== ComplaintStatus.OPEN) {
      throw new BadRequestException(`Cannot assign complaint in status: ${complaint.status}. Must be OPEN.`);
    }
    if (!body.assignedTo) throw new BadRequestException('assignedTo (staff member ID) is required.');

    const oldVal = { ...complaint };
    complaint.status = ComplaintStatus.ASSIGNED;
    (complaint as any).assignedTo = body.assignedTo;
    (complaint as any).assignedToName = body.assignedToName || body.assignedTo;
    (complaint as any).assignedAt = new Date().toISOString();

    await this.dataStore.persistComplaint(complaint);
    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Manager',
      'COMPLAINT_ASSIGNED',
      'Complaint',
      complaint.id,
      oldVal,
      complaint,
      `Assigned complaint #${complaint.complaintNumber} to ${body.assignedToName || body.assignedTo}`,
    );

    return complaint;
  }

  /**
   * BUG-08 FIX: START INVESTIGATION — Move into investigation phase (ASSIGNED → UNDER_REVIEW)
   * SRS §37 Step 3
   */
  @Patch(':id/start-investigation')
  async startInvestigation(
    @Param('id') id: string,
    @Body() body: { notes: string },
    @CurrentUser() user: IUser,
  ) {
    const complaint = this.dataStore.complaints.find((c) => c.id === id || c.complaintNumber === id);
    if (!complaint) throw new NotFoundException('Complaint not found');

    if (complaint.status !== ComplaintStatus.ASSIGNED && complaint.status !== ComplaintStatus.OPEN) {
      throw new BadRequestException(`Cannot start investigation for complaint in status: ${complaint.status}.`);
    }

    const oldVal = { ...complaint };
    complaint.status = ComplaintStatus.IN_PROGRESS;
    (complaint as any).investigationNotes = body.notes;
    (complaint as any).investigationStartedAt = new Date().toISOString();

    await this.dataStore.persistComplaint(complaint);
    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Staff',
      'COMPLAINT_INVESTIGATION_STARTED',
      'Complaint',
      complaint.id,
      oldVal,
      complaint,
      `Investigation started for complaint #${complaint.complaintNumber}`,
    );

    return complaint;
  }

  /**
   * RESOLVE — Provide resolution text (UNDER_REVIEW/ASSIGNED/OPEN → RESOLVED)
   * SRS §37 Step 4
   */
  @Patch(':id/resolve')
  async resolveComplaint(
    @Param('id') id: string,
    @Body() body: { resolution: string },
    @CurrentUser() user: IUser,
  ) {
    const complaint = this.dataStore.complaints.find((c) => c.id === id || c.complaintNumber === id);
    if (!complaint) throw new NotFoundException('Complaint not found');

    if (!body.resolution || body.resolution.trim().length < 5) {
      throw new BadRequestException('A detailed resolution description (min 5 characters) is required.');
    }

    const oldVal = { ...complaint };
    complaint.status = ComplaintStatus.RESOLVED;
    complaint.resolution = body.resolution;
    complaint.resolvedAt = new Date().toISOString();

    await this.dataStore.persistComplaint(complaint);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Staff',
      'COMPLAINT_RESOLVED',
      'Complaint',
      complaint.id,
      oldVal,
      complaint,
      `Resolved complaint #${complaint.complaintNumber}: ${body.resolution}`,
    );

    return complaint;
  }

  /**
   * BUG-08 FIX: CLOSE — Final signed-off closure by manager (RESOLVED → CLOSED)
   * SRS §37 Step 5 — requires resolution to exist before closing
   */
  @Patch(':id/close')
  async closeComplaint(
    @Param('id') id: string,
    @Body() body: { closureNotes: string },
    @CurrentUser() user: IUser,
  ) {
    const complaint = this.dataStore.complaints.find((c) => c.id === id || c.complaintNumber === id);
    if (!complaint) throw new NotFoundException('Complaint not found');

    if (complaint.status !== ComplaintStatus.RESOLVED) {
      throw new BadRequestException(
        `Complaint must be RESOLVED before closing. Current status: ${complaint.status}. Please resolve it first.`,
      );
    }
    if (!body.closureNotes || body.closureNotes.trim().length < 5) {
      throw new BadRequestException('Closure notes (min 5 characters) are required for final closure.');
    }

    const oldVal = { ...complaint };
    complaint.status = ComplaintStatus.CLOSED;
    (complaint as any).closureNotes = body.closureNotes;
    (complaint as any).closedBy = user.id;
    (complaint as any).closedByName = user.employeeName;
    (complaint as any).closedAt = new Date().toISOString();

    await this.dataStore.persistComplaint(complaint);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Manager',
      'COMPLAINT_CLOSED',
      'Complaint',
      complaint.id,
      oldVal,
      complaint,
      `Closed complaint #${complaint.complaintNumber}. Notes: ${body.closureNotes}`,
    );

    return complaint;
  }

  @Delete(':id')
  async deleteComplaint(@Param('id') id: string, @CurrentUser() user: IUser) {
    const index = this.dataStore.complaints.findIndex((c) => c.id === id || c.complaintNumber === id);
    if (index === -1) throw new NotFoundException('Complaint not found');

    const removed = this.dataStore.complaints.splice(index, 1)[0];
    await this.dataStore.deleteComplaint(removed.id);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Admin',
      'COMPLAINT_DELETED',
      'Complaint',
      removed.id,
      removed,
      undefined,
      `Deleted complaint ticket #${removed.complaintNumber}`,
    );

    return { message: `Complaint ${removed.complaintNumber} deleted.`, id: removed.id };
  }
}
