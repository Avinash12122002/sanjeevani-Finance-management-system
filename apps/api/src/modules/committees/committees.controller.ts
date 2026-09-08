import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StaffGuard } from '../../common/guards/staff.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IUser, PaymentMode } from '@sanjeevani/shared-types';
import { SmsNotificationService } from '../../shared/sms-notification.service';

@Controller('api/v1/committees')
@UseGuards(JwtAuthGuard, StaffGuard)
export class CommitteesController {
  constructor(
    private dataStore: DataStoreService,
    private sms: SmsNotificationService,
  ) {}

  /**
   * List all Committee / Chit groups with aggregated progress and metrics
   */
  @Get()
  async getCommittees() {
    await this.dataStore.refreshIfStale();
    const groups = this.dataStore.committeeGroups || [];
    const members = this.dataStore.committeeMembers || [];
    const installments = this.dataStore.committeeInstallments || [];
    const payouts = this.dataStore.committeePayouts || [];

    return groups.map((g) => {
      const groupMembers = members.filter((m) => m.committeeId === g.id);
      const groupInstallments = installments.filter((i) => i.committeeId === g.id);
      const groupPayouts = payouts.filter((p) => p.committeeId === g.id);

      const totalCollected = groupInstallments
        .filter((i) => i.status === 'PAID')
        .reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0);

      const totalDisbursed = groupPayouts.reduce((sum, p) => sum + (Number(p.netPayout) || 0), 0);
      const totalCommission = groupPayouts.reduce((sum, p) => sum + (Number(p.organizerCommission) || 0), 0);

      return {
        ...g,
        enrolledMembersCount: groupMembers.length,
        totalSlots: g.memberCount,
        availableSlots: Math.max(0, g.memberCount - groupMembers.length),
        totalCollected,
        totalDisbursed,
        totalCommission,
        completedRounds: groupPayouts.length,
      };
    });
  }

  /**
   * Get single Committee group with enrolled members, round status, and history
   */
  @Get(':id')
  async getCommitteeById(@Param('id') id: string) {
    await this.dataStore.refreshIfStale();
    const group = this.dataStore.committeeGroups.find((g) => g.id === id || g.committeeNumber === id);
    if (!group) throw new NotFoundException(`Committee group not found: ${id}`);

    const members = this.dataStore.committeeMembers
      .filter((m) => m.committeeId === group.id)
      .sort((a, b) => a.slotNumber - b.slotNumber);

    const installments = this.dataStore.committeeInstallments
      .filter((i) => i.committeeId === group.id)
      .sort((a, b) => a.roundNumber - b.roundNumber || a.memberId.localeCompare(b.memberId));

    const payouts = this.dataStore.committeePayouts
      .filter((p) => p.committeeId === group.id)
      .sort((a, b) => a.roundNumber - b.roundNumber);

    const totalCollected = installments
      .filter((i) => i.status === 'PAID')
      .reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0);

    const totalDisbursed = payouts.reduce((sum, p) => sum + (Number(p.netPayout) || 0), 0);
    const totalCommission = payouts.reduce((sum, p) => sum + (Number(p.organizerCommission) || 0), 0);

    return {
      group,
      members,
      installments,
      payouts,
      metrics: {
        enrolledCount: members.length,
        totalSlots: group.memberCount,
        availableSlots: Math.max(0, group.memberCount - members.length),
        totalCollected,
        totalDisbursed,
        totalCommission,
        completedRounds: payouts.length,
        remainingRounds: Math.max(0, group.memberCount - payouts.length),
      },
    };
  }

  /**
   * Create a new Committee Group
   */
  @Post()
  async createCommittee(
    @Body()
    body: {
      name: string;
      groupType: 'FIXED_DRAW' | 'AUCTION_BIDDING';
      contributionAmount: number;
      memberCount: number;
      organizerCommissionPercent?: number;
      frequency?: 'MONTHLY' | 'WEEKLY' | 'DAILY';
      startDate?: string;
      branchId?: string;
    },
    @CurrentUser() user: IUser,
  ) {
    if (!body.name || !body.contributionAmount || !body.memberCount) {
      throw new BadRequestException('Name, monthly contribution amount, and total member count are required.');
    }
    if (body.contributionAmount <= 0) {
      throw new BadRequestException('Contribution amount must be greater than 0.');
    }
    if (body.memberCount < 2 || body.memberCount > 50) {
      throw new BadRequestException('Member count must be between 2 and 50 members.');
    }

    const committeeNumber = this.dataStore.nextCommitteeNumber();
    const id = `CMG-${Date.now()}`;
    const totalPool = Number(body.contributionAmount) * Number(body.memberCount);
    const commissionPercent = Number(body.organizerCommissionPercent || 0);

    const branch = this.dataStore.branches.find((b) => b.id === (body.branchId || user.branchId)) || {
      id: 'BR-001',
      name: 'Head Office - Main Branch',
    };

    const startDate = body.startDate || new Date().toISOString().split('T')[0];
    // Calculate approximate end date based on member count months
    const end = new Date(startDate);
    end.setMonth(end.getMonth() + Number(body.memberCount));
    const endDate = end.toISOString().split('T')[0];

    const newGroup = {
      id,
      committeeNumber,
      name: body.name.trim(),
      groupType: body.groupType || 'AUCTION_BIDDING',
      contributionAmount: Number(body.contributionAmount),
      memberCount: Number(body.memberCount),
      totalPool,
      organizerCommissionPercent: commissionPercent,
      frequency: body.frequency || 'MONTHLY',
      startDate,
      endDate,
      currentRound: 1,
      status: 'ACTIVE',
      branchId: branch.id,
      branchName: branch.name,
      createdAt: new Date().toISOString(),
    };

    // Database insert if PostgreSQL is active
    const pool = this.dataStore.getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO committee_groups (
            id, committee_number, name, group_type, contribution_amount, member_count,
            total_pool, organizer_commission_percent, frequency, start_date, end_date,
            current_round, status, branch_id, branch_name, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            newGroup.id,
            newGroup.committeeNumber,
            newGroup.name,
            newGroup.groupType,
            newGroup.contributionAmount,
            newGroup.memberCount,
            newGroup.totalPool,
            newGroup.organizerCommissionPercent,
            newGroup.frequency,
            newGroup.startDate,
            newGroup.endDate,
            newGroup.currentRound,
            newGroup.status,
            newGroup.branchId,
            newGroup.branchName,
            newGroup.createdAt,
          ],
        );
      } catch (err: any) {
        throw new BadRequestException(`Failed to persist committee to database: ${err.message}`);
      }
    }

    this.dataStore.committeeGroups.unshift(newGroup);

    this.dataStore.logAudit(
      user.id,
      user.username,
      'CREATE_COMMITTEE_GROUP',
      'COMMITTEE',
      newGroup.id,
      null,
      newGroup,
    );

    return newGroup;
  }

  /**
   * Enroll a customer into a Committee Slot
   */
  @Post(':id/members')
  async enrollMember(
    @Param('id') committeeId: string,
    @Body()
    body: {
      customerId: string;
      slotNumber?: number;
    },
    @CurrentUser() user: IUser,
  ) {
    await this.dataStore.refreshIfStale();
    const group = this.dataStore.committeeGroups.find((g) => g.id === committeeId);
    if (!group) throw new NotFoundException(`Committee group not found: ${committeeId}`);

    const existingMembers = this.dataStore.committeeMembers.filter((m) => m.committeeId === group.id);
    if (existingMembers.length >= group.memberCount) {
      throw new BadRequestException(`Committee group is already full (${group.memberCount} / ${group.memberCount} slots).`);
    }

    const customer = this.dataStore.customers.find((c) => c.id === body.customerId);
    if (!customer) throw new NotFoundException(`Customer not found: ${body.customerId}`);

    // Determine slot number
    const occupiedSlots = new Set(existingMembers.map((m) => m.slotNumber));
    let slot = body.slotNumber;
    if (!slot || occupiedSlots.has(slot) || slot < 1 || slot > group.memberCount) {
      // Find lowest available slot 1..N
      for (let i = 1; i <= group.memberCount; i++) {
        if (!occupiedSlots.has(i)) {
          slot = i;
          break;
        }
      }
    }

    const memberId = `CMM-${Date.now()}-${slot}`;
    const totalPending = group.contributionAmount * group.memberCount;

    const newMember = {
      id: memberId,
      committeeId: group.id,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`.trim(),
      customerMobile: customer.mobile,
      slotNumber: slot!,
      contributionAmount: group.contributionAmount,
      totalPaid: 0,
      totalPending,
      payoutStatus: 'PENDING',
      payoutRound: null as number | null,
      payoutAmount: 0,
      payoutDate: null as string | null,
      createdAt: new Date().toISOString(),
    };

    // Check if round 1 installment should be pre-created if group already started
    const pool = this.dataStore.getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO committee_members (
            id, committee_id, customer_id, customer_name, customer_mobile, slot_number,
            contribution_amount, total_paid, total_pending, payout_status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            newMember.id,
            newMember.committeeId,
            newMember.customerId,
            newMember.customerName,
            newMember.customerMobile,
            newMember.slotNumber,
            newMember.contributionAmount,
            0,
            totalPending,
            'PENDING',
            newMember.createdAt,
          ],
        );
      } catch (err: any) {
        throw new BadRequestException(`Failed to enroll member: ${err.message}`);
      }
    }

    this.dataStore.committeeMembers.push(newMember);

    // If installments for the current round already exist, generate this new member's installment too
    const currentRound = group.currentRound || 1;
    const existingInst = this.dataStore.committeeInstallments.find(
      (i) => i.committeeId === group.id && i.roundNumber === currentRound && i.memberId === newMember.id,
    );
    if (!existingInst) {
      const instId = `CMI-${Date.now()}-${newMember.slotNumber}`;
      const newInst = {
        id: instId,
        committeeId: group.id,
        roundNumber: currentRound,
        memberId: newMember.id,
        customerId: newMember.customerId,
        dueDate: group.startDate || new Date().toISOString().split('T')[0],
        amountDue: group.contributionAmount,
        amountPaid: 0,
        status: 'PENDING',
        paymentDate: null as string | null,
        paymentMode: 'CASH',
        receiptNumber: null as string | null,
        createdAt: new Date().toISOString(),
      };

      if (pool) {
        try {
          await pool.query(
            `INSERT INTO committee_installments (
              id, committee_id, round_number, member_id, customer_id, due_date,
              amount_due, amount_paid, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              newInst.id,
              newInst.committeeId,
              newInst.roundNumber,
              newInst.memberId,
              newInst.customerId,
              newInst.dueDate,
              newInst.amountDue,
              0,
              'PENDING',
              newInst.createdAt,
            ],
          );
        } catch {
          // ignore duplicate installment insert
        }
      }
      this.dataStore.committeeInstallments.push(newInst);
    }

    this.dataStore.logAudit(
      user.id,
      user.username,
      'ENROLL_COMMITTEE_MEMBER',
      'COMMITTEE_MEMBER',
      newMember.id,
      null,
      { committeeId: group.id, slot: newMember.slotNumber, customerName: newMember.customerName },
    );

    return newMember;
  }

  /**
   * Collect Monthly Installment from a Member
   */
  @Post(':id/installments/collect')
  async collectInstallment(
    @Param('id') committeeId: string,
    @Body()
    body: {
      memberId: string;
      roundNumber: number;
      amountPaid: number;
      paymentMode?: string;
      referenceNo?: string;
    },
    @CurrentUser() user: IUser,
  ) {
    await this.dataStore.refreshIfStale();
    const group = this.dataStore.committeeGroups.find((g) => g.id === committeeId);
    if (!group) throw new NotFoundException(`Committee group not found: ${committeeId}`);

    const member = this.dataStore.committeeMembers.find((m) => m.id === body.memberId);
    if (!member) throw new NotFoundException(`Member not found: ${body.memberId}`);

    const pool = this.dataStore.getPool();
    const today = new Date().toISOString().split('T')[0];
    const receiptNumber = this.dataStore.nextReceiptNumber();
    const amountPaid = Number(body.amountPaid || group.contributionAmount);

    let installment = this.dataStore.committeeInstallments.find(
      (i) => i.committeeId === group.id && i.roundNumber === body.roundNumber && i.memberId === member.id,
    );

    if (installment) {
      installment.amountPaid = amountPaid;
      installment.status = 'PAID';
      installment.paymentDate = today;
      installment.paymentMode = body.paymentMode || 'CASH';
      installment.receiptNumber = receiptNumber;

      if (pool) {
        await pool.query(
          `UPDATE committee_installments SET amount_paid = $1, status = 'PAID', payment_date = $2, payment_mode = $3, receipt_number = $4 WHERE id = $5`,
          [amountPaid, today, body.paymentMode || 'CASH', receiptNumber, installment.id],
        );
      }
    } else {
      installment = {
        id: `CMI-${Date.now()}-${member.slotNumber}`,
        committeeId: group.id,
        roundNumber: body.roundNumber,
        memberId: member.id,
        customerId: member.customerId,
        dueDate: today,
        amountDue: amountPaid,
        amountPaid: amountPaid,
        status: 'PAID',
        paymentDate: today,
        paymentMode: body.paymentMode || 'CASH',
        receiptNumber,
        createdAt: new Date().toISOString(),
      };

      if (pool) {
        await pool.query(
          `INSERT INTO committee_installments (
            id, committee_id, round_number, member_id, customer_id, due_date,
            amount_due, amount_paid, status, payment_date, payment_mode, receipt_number, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            installment.id,
            installment.committeeId,
            installment.roundNumber,
            installment.memberId,
            installment.customerId,
            installment.dueDate,
            installment.amountDue,
            installment.amountPaid,
            installment.status,
            installment.paymentDate,
            installment.paymentMode,
            installment.receiptNumber,
            installment.createdAt,
          ],
        );
      }
      this.dataStore.committeeInstallments.push(installment);
    }

    // Update member aggregates
    member.totalPaid = (Number(member.totalPaid) || 0) + amountPaid;
    member.totalPending = Math.max(0, (Number(member.totalPending) || 0) - amountPaid);

    if (pool) {
      await pool.query(
        `UPDATE committee_members SET total_paid = $1, total_pending = $2 WHERE id = $3`,
        [member.totalPaid, member.totalPending, member.id],
      );
    }

    // Record official receipt in Sanjeevani financial store
    const officialReceipt = {
      id: `REC-${Date.now()}`,
      receiptNumber,
      transactionId: `TXN-${Date.now()}`,
      customerId: member.customerId,
      customerName: member.customerName,
      customerMobile: member.customerMobile,
      accountId: group.committeeNumber,
      loanId: null,
      paymentMode: (body.paymentMode || 'CASH') as PaymentMode,
      amount: amountPaid,
      collectorId: user.id,
      collectorName: user.username,
      branchId: group.branchId,
      branchName: group.branchName,
      remarks: `Committee Installment - ${group.name} (Round ${body.roundNumber}, Slot ${member.slotNumber})`,
      generatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.dataStore.receipts.unshift(officialReceipt as any);

    // Send SMS receipt to member
    if (member.customerMobile) {
      this.sms.sendPaymentReceivedSms({
        mobile: member.customerMobile,
        customerName: member.customerName,
        amount: amountPaid,
        receiptNumber,
        paymentFor: `Committee: ${group.name} (Round ${body.roundNumber})`,
      }).catch(() => {});
    }

    this.dataStore.logAudit(
      user.id,
      user.username,
      'COLLECT_COMMITTEE_INSTALLMENT',
      'COMMITTEE_INSTALLMENT',
      installment.id,
      null,
      { receiptNumber, amountPaid, memberName: member.customerName, round: body.roundNumber },
    );

    return {
      success: true,
      receiptNumber,
      installment,
      member,
    };
  }

  /**
   * Conduct Round Draw or Bidding Auction
   * SRS §42: Calculates lowest bid discount, organizer commission, member dividend, and net payout
   */
  @Post(':id/rounds/auction')
  async conductRoundAuction(
    @Param('id') committeeId: string,
    @Body()
    body: {
      roundNumber: number;
      winnerMemberId: string;
      winningBidAmount?: number;
      paymentMode?: string;
      remarks?: string;
    },
    @CurrentUser() user: IUser,
  ) {
    await this.dataStore.refreshIfStale();
    const group = this.dataStore.committeeGroups.find((g) => g.id === committeeId);
    if (!group) throw new NotFoundException(`Committee group not found: ${committeeId}`);

    if (group.status === 'COMPLETED') {
      throw new BadRequestException('This committee group has already completed all rounds.');
    }

    const winner = this.dataStore.committeeMembers.find((m) => m.id === body.winnerMemberId && m.committeeId === group.id);
    if (!winner) throw new NotFoundException(`Winner member not found in this committee: ${body.winnerMemberId}`);

    if (winner.payoutStatus === 'RECEIVED') {
      throw new BadRequestException(`Member ${winner.customerName} (Slot ${winner.slotNumber}) has already received a committee payout in Round ${winner.payoutRound}! Each member can only win once.`);
    }

    const roundNumber = Number(body.roundNumber || group.currentRound);
    const grossPool = Number(group.contributionAmount) * Number(group.memberCount);
    const commissionPercent = Number(group.organizerCommissionPercent || 0);

    let bidDiscount = 0;
    let organizerCommission = 0;
    let surplusForDividend = 0;
    let dividendPerMember = 0;
    let netPayout = grossPool;

    if (group.groupType === 'AUCTION_BIDDING') {
      // In auction bidding, the member with the lowest bid takes that amount (e.g. ₹75,000 for a ₹1,00,000 pool)
      const winningBid = Number(body.winningBidAmount);
      if (!winningBid || winningBid <= 0 || winningBid > grossPool) {
        throw new BadRequestException(`Winning bid must be between ₹1 and the gross pool amount of ₹${grossPool.toLocaleString('en-IN')}.`);
      }

      bidDiscount = grossPool - winningBid; // e.g. ₹25,000
      organizerCommission = (grossPool * commissionPercent) / 100; // e.g. ₹2,000
      surplusForDividend = Math.max(0, bidDiscount - organizerCommission); // e.g. ₹23,000
      dividendPerMember = Math.floor(surplusForDividend / group.memberCount); // e.g. ₹2,300 per member
      netPayout = winningBid;
    } else {
      // Fixed Draw (Lucky Draw or Serial Order)
      organizerCommission = (grossPool * commissionPercent) / 100;
      bidDiscount = 0;
      surplusForDividend = 0;
      dividendPerMember = 0;
      netPayout = grossPool - organizerCommission;
    }

    const today = new Date().toISOString().split('T')[0];
    const payoutId = `CMP-${Date.now()}-${roundNumber}`;

    const payoutRecord = {
      id: payoutId,
      committeeId: group.id,
      roundNumber,
      winnerMemberId: winner.id,
      customerId: winner.customerId,
      customerName: winner.customerName,
      grossPool,
      bidDiscount,
      dividendPerMember,
      organizerCommission,
      netPayout,
      payoutDate: today,
      paymentMode: body.paymentMode || 'CASH',
      createdAt: new Date().toISOString(),
    };

    // Persist payout
    const pool = this.dataStore.getPool();
    if (pool) {
      await pool.query(
        `INSERT INTO committee_payouts (
          id, committee_id, round_number, winner_member_id, customer_id, customer_name,
          gross_pool, bid_discount, dividend_per_member, organizer_commission, net_payout,
          payout_date, payment_mode, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          payoutRecord.id,
          payoutRecord.committeeId,
          payoutRecord.roundNumber,
          payoutRecord.winnerMemberId,
          payoutRecord.customerId,
          payoutRecord.customerName,
          payoutRecord.grossPool,
          payoutRecord.bidDiscount,
          payoutRecord.dividendPerMember,
          payoutRecord.organizerCommission,
          payoutRecord.netPayout,
          payoutRecord.payoutDate,
          payoutRecord.paymentMode,
          payoutRecord.createdAt,
        ],
      );
    }
    this.dataStore.committeePayouts.push(payoutRecord);

    // Update Winner Member status
    winner.payoutStatus = 'RECEIVED';
    winner.payoutRound = roundNumber;
    winner.payoutAmount = netPayout;
    winner.payoutDate = today;

    if (pool) {
      await pool.query(
        `UPDATE committee_members SET payout_status = 'RECEIVED', payout_round = $1, payout_amount = $2, payout_date = $3 WHERE id = $4`,
        [roundNumber, netPayout, today, winner.id],
      );
    }

    // Advance Round or Complete
    const allMembers = this.dataStore.committeeMembers.filter((m) => m.committeeId === group.id);
    if (roundNumber >= group.memberCount) {
      group.status = 'COMPLETED';
      if (pool) {
        await pool.query(`UPDATE committee_groups SET status = 'COMPLETED' WHERE id = $1`, [group.id]);
      }
    } else {
      const nextRound = roundNumber + 1;
      group.currentRound = nextRound;
      if (pool) {
        await pool.query(`UPDATE committee_groups SET current_round = $1 WHERE id = $2`, [nextRound, group.id]);
      }

      // Generate next round installments for all members with dividend deduction!
      // In Indian ROSCA, member installment for the next month is (Monthly Contribution - Dividend Per Member)
      const nextDueAmount = Math.max(0, group.contributionAmount - dividendPerMember);
      const nextDueDate = new Date();
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

      for (const m of allMembers) {
        const nextInstId = `CMI-${Date.now()}-${m.slotNumber}-R${nextRound}`;
        const nextInst = {
          id: nextInstId,
          committeeId: group.id,
          roundNumber: nextRound,
          memberId: m.id,
          customerId: m.customerId,
          dueDate: nextDueDateStr,
          amountDue: nextDueAmount,
          amountPaid: 0,
          status: 'PENDING',
          paymentDate: null as string | null,
          paymentMode: 'CASH',
          receiptNumber: null as string | null,
          createdAt: new Date().toISOString(),
        };

        if (pool) {
          try {
            await pool.query(
              `INSERT INTO committee_installments (
                id, committee_id, round_number, member_id, customer_id, due_date,
                amount_due, amount_paid, status, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                nextInst.id,
                nextInst.committeeId,
                nextInst.roundNumber,
                nextInst.memberId,
                nextInst.customerId,
                nextInst.dueDate,
                nextInst.amountDue,
                0,
                'PENDING',
                nextInst.createdAt,
              ],
            );
          } catch {}
        }
        this.dataStore.committeeInstallments.push(nextInst);
      }
    }

    this.dataStore.logAudit(
      user.id,
      user.username,
      'CONDUCT_COMMITTEE_ROUND_PAYOUT',
      'COMMITTEE_PAYOUT',
      payoutRecord.id,
      null,
      {
        committeeId: group.id,
        round: roundNumber,
        winner: winner.customerName,
        netPayout,
        dividendPerMember,
        organizerCommission,
      },
    );

    return {
      success: true,
      payout: payoutRecord,
      groupStatus: group.status,
      nextRound: group.currentRound,
    };
  }

  /**
   * Delete or archive committee group
   */
  @Delete(':id')
  async deleteCommittee(@Param('id') id: string, @CurrentUser() user: IUser) {
    await this.dataStore.refreshIfStale();
    const group = this.dataStore.committeeGroups.find((g) => g.id === id);
    if (!group) throw new NotFoundException(`Committee group not found: ${id}`);

    const paidInstallments = this.dataStore.committeeInstallments.filter(
      (i) => i.committeeId === group.id && i.status === 'PAID',
    );
    if (paidInstallments.length > 0) {
      throw new BadRequestException('Cannot delete committee group with recorded paid installments. Financial records are immutable.');
    }

    const pool = this.dataStore.getPool();
    if (pool) {
      await pool.query(`DELETE FROM committee_installments WHERE committee_id = $1`, [group.id]);
      await pool.query(`DELETE FROM committee_members WHERE committee_id = $1`, [group.id]);
      await pool.query(`DELETE FROM committee_payouts WHERE committee_id = $1`, [group.id]);
      await pool.query(`DELETE FROM committee_groups WHERE id = $1`, [group.id]);
    }

    this.dataStore.committeeInstallments = this.dataStore.committeeInstallments.filter((i) => i.committeeId !== group.id);
    this.dataStore.committeeMembers = this.dataStore.committeeMembers.filter((m) => m.committeeId !== group.id);
    this.dataStore.committeePayouts = this.dataStore.committeePayouts.filter((p) => p.committeeId !== group.id);
    this.dataStore.committeeGroups = this.dataStore.committeeGroups.filter((g) => g.id !== group.id);

    this.dataStore.logAudit(
      user.id,
      user.username,
      'DELETE_COMMITTEE_GROUP',
      'COMMITTEE',
      id,
      group,
      null,
    );

    return { success: true, message: `Committee group ${group.name} removed.` };
  }
}
