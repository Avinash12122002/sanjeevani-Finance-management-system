import { Controller, Get, Post, Patch, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ComplaintStatus, IComplaint, IUser, PriorityLevel } from '@sanjeevani/shared-types';

@Controller('api/v1/complaints')
@UseGuards(JwtAuthGuard)
export class ComplaintsController {
  constructor(private dataStore: DataStoreService) {}

  @Get()
  getComplaints() {
    return this.dataStore.complaints;
  }

  @Post()
  createComplaint(
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
    return newComplaint;
  }

  @Patch(':id/resolve')
  resolveComplaint(
    @Param('id') id: string,
    @Body() body: { resolution: string },
    @CurrentUser() user: IUser,
  ) {
    const complaint = this.dataStore.complaints.find((c) => c.id === id);
    if (!complaint) throw new NotFoundException('Complaint not found');

    complaint.status = ComplaintStatus.RESOLVED;
    complaint.resolution = body.resolution;
    complaint.resolvedAt = new Date().toISOString();

    return complaint;
  }
}
