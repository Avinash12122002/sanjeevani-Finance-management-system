import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StaffGuard } from '../../common/guards/staff.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IUser, UserRole } from '@sanjeevani/shared-types';

export interface IPendingVerification {
  id: string;
  entityType:
    | 'LARGE_LOAN_DISBURSEMENT'
    | 'LARGE_WITHDRAWAL'
    | 'PREMATURE_ACCOUNT_CLOSURE'
    | 'MANUAL_JOURNAL_ADJUSTMENT'
    | 'FEE_OR_INTEREST_WAIVER'
    | 'CASH_MISMATCH_WRITE_OFF';
  entityId: string;
  entityReference: string; // e.g. Loan No or Account No
  amount: number;
  description: string;
  requestedBy: string;
  requestedByName: string;
  branchId: string;
  branchName: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedByName?: string;
  approverComments?: string;
  rejectionReason?: string;
  createdAt: string;
  verifiedAt?: string;
}

const pendingVerifications: IPendingVerification[] = [];

@Controller('api/v1/verifications')
@UseGuards(JwtAuthGuard, StaffGuard)
export class VerificationController {
  constructor(private dataStore: DataStoreService) {}

  /**
   * List pending dual-control approval requests (SRS §38 Four-Eyes Principle)
   */
  @Get('pending')
  async getPendingVerifications() {
    return pendingVerifications.filter((v) => v.status === 'PENDING_APPROVAL');
  }

  /**
   * List all verifications history
   */
  @Get('history')
  async getVerificationsHistory() {
    return pendingVerifications;
  }

  /**
   * Submit transaction to dual-control verification queue
   */
  @Post('submit')
  async submitForVerification(
    @Body()
    body: {
      entityType: IPendingVerification['entityType'];
      entityId: string;
      entityReference: string;
      amount: number;
      description: string;
    },
    @CurrentUser() user: IUser,
  ) {
    if (!body.entityId || !body.entityType || body.amount === undefined) {
      throw new BadRequestException('Entity ID, type, and amount are required.');
    }

    const verification: IPendingVerification = {
      id: `VRF-${Date.now()}`,
      entityType: body.entityType,
      entityId: body.entityId,
      entityReference: body.entityReference || body.entityId,
      amount: body.amount,
      description: body.description || 'Dual verification requested',
      requestedBy: user.id,
      requestedByName: user.employeeName || user.username,
      branchId: user.branchId || 'BR-001',
      branchName: user.branchName || 'Head Office - Main Branch',
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
    };

    pendingVerifications.unshift(verification);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Staff',
      'DUAL_VERIFICATION_SUBMITTED',
      'DualVerification',
      verification.id,
      undefined,
      verification,
      `Submitted ${body.entityType} (Ref: ${verification.entityReference}) of ₹${body.amount} for Four-Eyes Verification (SRS §38).`,
    );

    return {
      message: 'Transaction submitted for secondary manager verification.',
      verification,
    };
  }

  /**
   * Approve transaction as Second Verifier (SRS §38)
   * Enforces rule: Requester CANNOT approve their own transaction (Dual Control)
   */
  @Post(':id/approve')
  async approveVerification(
    @Param('id') id: string,
    @Body() body: { comments?: string },
    @CurrentUser() user: IUser,
  ) {
    const isAuthorized =
      user.roles.includes(UserRole.BRANCH_MANAGER) ||
      user.roles.includes(UserRole.GENERAL_MANAGER) ||
      user.roles.includes(UserRole.SUPER_ADMIN);

    if (!isAuthorized) {
      throw new ForbiddenException(
        'Four-Eyes Principle (SRS §38): Only Branch Manager, General Manager, or Owner can execute second approval.',
      );
    }

    const vrf = pendingVerifications.find((v) => v.id === id);
    if (!vrf) throw new NotFoundException(`Verification item not found: ${id}`);

    if (vrf.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Item is already in status: ${vrf.status}`);
    }

    // Segregation of Duties: Creator cannot approve
    if (vrf.requestedBy === user.id) {
      throw new ForbiddenException(
        'Dual Control Violation (SRS §38): You cannot verify your own transaction. A different officer must approve.',
      );
    }

    vrf.status = 'APPROVED';
    vrf.approvedBy = user.id;
    vrf.approvedByName = user.employeeName || user.username;
    vrf.approverComments = body.comments || 'Verified and approved per Four-Eyes policy';
    vrf.verifiedAt = new Date().toISOString();

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Manager',
      'DUAL_VERIFICATION_APPROVED',
      'DualVerification',
      vrf.id,
      undefined,
      vrf,
      `Second verification APPROVED for ${vrf.entityType} (${vrf.entityReference}) of ₹${vrf.amount}. Comments: ${vrf.approverComments}`,
    );

    return {
      message: `Transaction ${vrf.entityReference} successfully verified and approved.`,
      verification: vrf,
    };
  }

  /**
   * Reject transaction as Second Verifier (SRS §38)
   */
  @Post(':id/reject')
  async rejectVerification(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: IUser,
  ) {
    if (!body.reason || body.reason.trim().length < 5) {
      throw new BadRequestException('A reason for rejection is required (minimum 5 characters).');
    }

    const vrf = pendingVerifications.find((v) => v.id === id);
    if (!vrf) throw new NotFoundException(`Verification item not found: ${id}`);

    vrf.status = 'REJECTED';
    vrf.approvedBy = user.id;
    vrf.approvedByName = user.employeeName || user.username;
    vrf.rejectionReason = body.reason;
    vrf.verifiedAt = new Date().toISOString();

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Manager',
      'DUAL_VERIFICATION_REJECTED',
      'DualVerification',
      vrf.id,
      undefined,
      vrf,
      `Second verification REJECTED for ${vrf.entityType} (${vrf.entityReference}). Reason: ${body.reason}`,
    );

    return {
      message: `Transaction ${vrf.entityReference} rejected.`,
      verification: vrf,
    };
  }
}
