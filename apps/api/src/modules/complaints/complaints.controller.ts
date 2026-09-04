import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ComplaintStatus, IComplaint, IUser, PriorityLevel } from '@sanjeevani/shared-types';

@Controller('api/v1/complaints')
@UseGuards(JwtAuthGuard)
export class ComplaintsController {
  constructor(private dataStore: DataStoreService) {}

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

    return newComplaint;
  }

  @Patch(':id/resolve')
  async resolveComplaint(
    @Param('id') id: string,
    @Body() body: { resolution: string },
    @CurrentUser() user: IUser,
  ) {
    const complaint = this.dataStore.complaints.find((c) => c.id === id);
    if (!complaint) throw new NotFoundException('Complaint not found');

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
