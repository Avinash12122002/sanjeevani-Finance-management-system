import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import {
  IAccount,
  IUser,
  AccountStatus,
  ProductType,
  RegulatoryStatus,
  PaginationParams,
  IRDInstallment,
  InstallmentStatus,
} from '@sanjeevani/shared-types';

@Controller('api/v1/accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private dataStore: DataStoreService) {}

  @Get()
  async getAccounts(
    @Query() query: PaginationParams & { customerId?: string; productType?: string },
  ) {
    await this.dataStore.refreshIfStale();
    let list = [...this.dataStore.accounts];

    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter(
        (a) =>
          a.accountNumber.toLowerCase().includes(s) ||
          a.customerName?.toLowerCase().includes(s) ||
          a.customerNumber?.toLowerCase().includes(s),
      );
    }

    if (query.customerId) {
      list = list.filter((a) => a.customerId === query.customerId);
    }

    if (query.productType) {
      list = list.filter((a) => a.productType === query.productType);
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const startIndex = (page - 1) * limit;

    return {
      items: list.slice(startIndex, startIndex + limit),
      total: list.length,
      page,
      limit,
      totalPages: Math.ceil(list.length / limit),
    };
  }

  @Get(':id')
  async getAccountById(@Param('id') id: string) {
    await this.dataStore.refreshIfStale();
    const account = this.dataStore.accounts.find((a) => a.id === id || a.accountNumber === id);
    if (!account) {
      throw new NotFoundException(`Account not found: ${id}`);
    }
    return account;
  }

  @Post()
  async createAccount(
    @Body()
    body: {
      customerId: string;
      productId: string;
      principalAmount: number;
      tenureMonths?: number;
      branchId?: string;
      nomineeName?: string;
      nomineeRelationship?: string;
      nomineeMobile?: string;
      remarks?: string;
    },
    @CurrentUser() user: IUser,
  ) {
    const customer = this.dataStore.customers.find((c) => c.id === body.customerId);
    if (!customer) {
      throw new NotFoundException('Customer record not found');
    }

    const product = this.dataStore.products.find((p) => p.id === body.productId);
    if (!product) {
      throw new NotFoundException('Product record not found');
    }

    // BR-005 & Regulatory check (§13)
    if (!product.isEnabled || product.regulatoryStatus !== RegulatoryStatus.APPROVED) {
      throw new BadRequestException(
        `Account cannot be opened: Product is in ${product.regulatoryStatus} status or disabled.`,
      );
    }

    const principal = Number(body.principalAmount);
    if (principal < product.minimumAmount || principal > product.maximumAmount) {
      throw new BadRequestException(
        `Amount must be between ${FinancialEngine.formatINR(product.minimumAmount)} and ${FinancialEngine.formatINR(product.maximumAmount)}`,
      );
    }

    const openingDateStr = new Date().toISOString().split('T')[0];
    if (this.dataStore.isDateLocked(openingDateStr)) {
      throw new BadRequestException(
        `Business Date Locked (BR-009): Date ${openingDateStr} is locked. New accounts cannot be opened without reopening.`,
      );
    }

    const tenure = body.tenureMonths || product.minimumTenureMonths || 12;
    const branch = this.dataStore.branches.find((b) => b.id === (body.branchId || customer.branchId || user.branchId || 'BR-001'));
    const accountNumber = this.dataStore.nextAccountNumber(product.productType);

    let maturityAmount = principal;
    const openingDate = new Date();
    const targetMonth = openingDate.getMonth() + tenure;
    const maturityDate = new Date(openingDate.getFullYear(), targetMonth, 1);
    const daysInTargetMonth = new Date(maturityDate.getFullYear(), maturityDate.getMonth() + 1, 0).getDate();
    maturityDate.setDate(Math.min(openingDate.getDate(), daysInTargetMonth));

    if (product.productType === ProductType.RD) {
      const rdCalc = FinancialEngine.calculateRDMaturity(principal, product.interestRate, tenure);
      maturityAmount = rdCalc.maturityAmount;
    } else if (product.productType === ProductType.TERM_DEPOSIT) {
      const tdCalc = FinancialEngine.calculateTermDepositMaturity(principal, product.interestRate, tenure);
      maturityAmount = tdCalc.maturityAmount;
    }

    const newAccount: IAccount = {
      id: `ACC-${Date.now()}`,
      accountNumber,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerNumber: customer.customerNumber,
      productId: product.id,
      productName: product.productName,
      productType: product.productType,
      branchId: branch?.id || 'BR-001',
      branchName: branch?.name || 'Head Office - Main Branch (Delhi)',
      openingDate: openingDateStr,
      principalAmount: principal,
      interestRate: product.interestRate,
      tenureMonths: tenure,
      maturityDate: maturityDate.toISOString().split('T')[0],
      maturityAmount,
      currentBalance: product.productType === ProductType.TERM_DEPOSIT ? principal : principal,
      status: AccountStatus.ACTIVE,
      nomineeName: body.nomineeName?.trim() || undefined,
      nomineeRelationship: body.nomineeRelationship?.trim() || undefined,
      nomineeMobile: body.nomineeMobile?.trim() || undefined,
      remarks: body.remarks?.trim() || undefined,
      createdBy: user.id || 'USR-001',
      approvedBy: user.id || 'USR-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.dataStore.accounts.unshift(newAccount);
    await this.dataStore.persistAccount(newAccount);

    // Generate RD installments schedule if Recurring Deposit
    if (product.productType === ProductType.RD) {
      const rdInstallments: IRDInstallment[] = [];
      for (let i = 1; i <= tenure; i++) {
        const dueDate = new Date(openingDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        rdInstallments.push({
          id: `RDI-${newAccount.id}-${i}`,
          rdAccountId: newAccount.id,
          installmentNumber: i,
          dueDate: dueDate.toISOString().split('T')[0],
          amountDue: principal,
          amountPaid: i === 1 ? principal : 0,
          paidAt: i === 1 ? openingDateStr : undefined,
          penaltyDue: 0,
          status: i === 1 ? InstallmentStatus.PAID : InstallmentStatus.DUE,
        });
      }
      this.dataStore.rdInstallments.push(...rdInstallments);
    }

    this.dataStore.logAudit(
      user.id || 'USR-001',
      user.employeeName || 'Staff',
      'ACCOUNT_OPENED',
      'Account',
      newAccount.id,
      undefined,
      newAccount,
      `Opened ${product.productType} Account ${newAccount.accountNumber} for ${customer.customerNumber}`,
    );

    return newAccount;
  }

  @Patch(':id')
  async updateAccount(
    @Param('id') id: string,
    @Body() body: Partial<IAccount>,
    @CurrentUser() user: IUser,
  ) {
    const accIndex = this.dataStore.accounts.findIndex((a) => a.id === id || a.accountNumber === id);
    if (accIndex === -1) {
      throw new NotFoundException(`Account not found: ${id}`);
    }

    const currentAcc = this.dataStore.accounts[accIndex];
    const oldVal = { ...currentAcc };

    if (body.status) currentAcc.status = body.status;
    if (body.currentBalance !== undefined) currentAcc.currentBalance = Number(body.currentBalance);
    if (body.nomineeName !== undefined) currentAcc.nomineeName = body.nomineeName ? body.nomineeName.trim() : undefined;
    if (body.nomineeRelationship !== undefined) currentAcc.nomineeRelationship = body.nomineeRelationship ? body.nomineeRelationship.trim() : undefined;
    if (body.nomineeMobile !== undefined) currentAcc.nomineeMobile = body.nomineeMobile ? body.nomineeMobile.trim() : undefined;
    if (body.tenureMonths !== undefined) currentAcc.tenureMonths = Number(body.tenureMonths);
    if (body.maturityDate !== undefined) currentAcc.maturityDate = body.maturityDate;
    if (body.remarks !== undefined) currentAcc.remarks = body.remarks;
    currentAcc.updatedAt = new Date().toISOString();

    await this.dataStore.persistAccount(currentAcc);

    this.dataStore.logAudit(
      user.id || 'USR-001',
      user.employeeName || 'Admin',
      'ACCOUNT_UPDATED',
      'Account',
      currentAcc.id,
      oldVal,
      currentAcc,
      `Account ${currentAcc.accountNumber} status updated to ${currentAcc.status}`,
    );

    return currentAcc;
  }

  @Delete(':id')
  async deleteAccount(@Param('id') id: string, @CurrentUser() user: IUser) {
    const accIndex = this.dataStore.accounts.findIndex((a) => a.id === id || a.accountNumber === id);
    if (accIndex === -1) {
      throw new NotFoundException(`Account not found: ${id}`);
    }

    const removed = this.dataStore.accounts.splice(accIndex, 1)[0];
    await this.dataStore.deleteAccount(removed.id);
    this.dataStore.rdInstallments = this.dataStore.rdInstallments.filter((r) => r.rdAccountId !== removed.id && r.rdAccountId !== removed.accountNumber);

    this.dataStore.logAudit(
      user.id || 'USR-001',
      user.employeeName || 'Admin',
      'ACCOUNT_DELETED',
      'Account',
      removed.id,
      removed,
      undefined,
      `Deleted deposit account ${removed.accountNumber}`,
    );

    return { message: `Account ${removed.accountNumber} removed successfully.`, id: removed.id };
  }

  @Post(':id/calculate-premature')
  async calculatePrematureClosure(
    @Param('id') id: string,
    @Body() body: { closureDate?: string; penaltyRateOverride?: number },
  ) {
    await this.dataStore.refreshIfStale();
    const account = this.dataStore.accounts.find((a) => a.id === id || a.accountNumber === id);
    if (!account) throw new NotFoundException(`Account not found: ${id}`);
    if (account.status === AccountStatus.CLOSED) {
      throw new BadRequestException('Account is already closed.');
    }

    const openDateStr = account.openingDate || account.createdAt || new Date().toISOString();
    const openDate = new Date(openDateStr);
    const closeDate = body.closureDate ? new Date(body.closureDate) : new Date();
    const diffTime = Math.max(0, closeDate.getTime() - openDate.getTime());
    const elapsedDays = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    const elapsedMonths = Math.max(0, Math.floor(elapsedDays / 30));

    const product = this.dataStore.products.find((p) => p.id === account.productId);
    const penaltyRate = body.penaltyRateOverride !== undefined ? Number(body.penaltyRateOverride) : (product?.prematurePenaltyRate || 2.0);
    const originalRate = account.interestRate || 8.0;
    const revisedRate = Math.max(0, originalRate - penaltyRate);

    const principal = account.principalAmount || (account as any).principal || account.currentBalance || 0;
    const grossAccruedInterest = Math.round(principal * (originalRate / 100) * (elapsedDays / 365));
    const penaltyAmount = Math.round(principal * (penaltyRate / 100) * (elapsedDays / 365));
    const netAccruedInterest = Math.max(0, Math.round(principal * (revisedRate / 100) * (elapsedDays / 365)));
    const totalPayout = principal + netAccruedInterest;

    return {
      accountNumber: account.accountNumber,
      customerName: account.customerName,
      productType: account.productType,
      principal,
      openDate: openDate.toISOString().split('T')[0],
      closureDate: closeDate.toISOString().split('T')[0],
      elapsedDays,
      elapsedMonths,
      originalRate,
      penaltyRate,
      revisedRate,
      grossAccruedInterest,
      penaltyAmount,
      netAccruedInterest,
      totalPayout,
    };
  }

  @Post(':id/execute-premature')
  async executePrematureClosure(
    @Param('id') id: string,
    @Body()
    body: {
      closureDate?: string;
      penaltyRateOverride?: number;
      paymentMode?: 'CASH' | 'BANK_TRANSFER';
      remarks?: string;
    },
    @CurrentUser() user: IUser,
  ) {
    await this.dataStore.refreshIfStale();
    const account = this.dataStore.accounts.find((a) => a.id === id || a.accountNumber === id);
    if (!account) throw new NotFoundException(`Account not found: ${id}`);
    if (account.status === AccountStatus.CLOSED) {
      throw new BadRequestException('Account is already closed.');
    }

    const calc = await this.calculatePrematureClosure(id, body);
    const paymentMode = body.paymentMode || 'CASH';

    // Update account
    account.status = AccountStatus.CLOSED;
    const prevBalance = account.currentBalance;
    account.currentBalance = 0;
    account.remarks = `${account.remarks ? account.remarks + ' | ' : ''}Premature closure executed on ${calc.closureDate}. Principal: ₹${calc.principal}, Net Interest: ₹${calc.netAccruedInterest}, Penalty: ₹${calc.penaltyAmount}, Payout: ₹${calc.totalPayout} via ${paymentMode}. ${body.remarks || ''}`.trim();
    account.updatedAt = new Date().toISOString();

    await this.dataStore.persistAccount(account);

    // Cancel remaining RD installments if any
    this.dataStore.rdInstallments.forEach((inst) => {
      if ((inst.rdAccountId === account.id || inst.rdAccountId === account.accountNumber) && (inst.status === InstallmentStatus.DUE || inst.status === InstallmentStatus.UPCOMING)) {
        inst.status = InstallmentStatus.WAIVED;
      }
    });

    // Post to Chart of Accounts
    const isCash = paymentMode === 'CASH';
    const cashOrBankCoa = this.dataStore.chartOfAccounts.find(
      (c) => c.accountCode === (isCash ? '1010' : '1020') || c.id === (isCash ? 'COA-1010' : 'COA-1020'),
    );
    if (cashOrBankCoa) {
      cashOrBankCoa.currentBalance = Math.max(0, (cashOrBankCoa.currentBalance || 0) - calc.totalPayout);
      await this.dataStore.persistChartOfAccount(cashOrBankCoa);
    }

    const liabilityCoa = this.dataStore.chartOfAccounts.find(
      (c) => c.accountCode === '2010' || c.id === 'COA-2010',
    );
    if (liabilityCoa) {
      liabilityCoa.currentBalance = Math.max(0, (liabilityCoa.currentBalance || 0) - calc.principal);
      await this.dataStore.persistChartOfAccount(liabilityCoa);
    }

    if (calc.netAccruedInterest > 0) {
      const expenseCoa = this.dataStore.chartOfAccounts.find(
        (c) => c.accountCode === '5010' || c.id === 'COA-5010',
      );
      if (expenseCoa) {
        expenseCoa.currentBalance = (expenseCoa.currentBalance || 0) + calc.netAccruedInterest;
        await this.dataStore.persistChartOfAccount(expenseCoa);
      }
    }

    this.dataStore.logAudit(
      user.id || 'USR-001',
      user.employeeName || 'Staff',
      'ACCOUNT_PREMATURE_CLOSURE',
      'Account',
      account.id,
      { status: AccountStatus.ACTIVE, currentBalance: prevBalance },
      account,
      `Premature closure of ${account.accountNumber}: Payout ₹${calc.totalPayout} (Penalty ₹${calc.penaltyAmount} deducted)`,
    );

    return {
      message: `Account ${account.accountNumber} successfully closed prematurely.`,
      calculation: calc,
      account,
    };
  }
}
