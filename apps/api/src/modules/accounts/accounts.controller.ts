import {
  Controller,
  Get,
  Post,
  Patch,
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
} from '@sanjeevani/shared-types';

@Controller('api/v1/accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private dataStore: DataStoreService) {}

  @Get()
  getAccounts(
    @Query() query: PaginationParams & { customerId?: string; productType?: string },
  ) {
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
  getAccountById(@Param('id') id: string) {
    const account = this.dataStore.accounts.find((a) => a.id === id || a.accountNumber === id);
    if (!account) {
      throw new NotFoundException(`Account not found: ${id}`);
    }
    return account;
  }

  @Post()
  createAccount(
    @Body()
    body: {
      customerId: string;
      productId: string;
      principalAmount: number;
      tenureMonths?: number;
      branchId?: string;
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

    const tenure = body.tenureMonths || product.minimumTenureMonths || 12;
    const branch = this.dataStore.branches.find((b) => b.id === (body.branchId || customer.branchId || user.branchId || 'BR-001'));
    const accountNumber = this.dataStore.nextAccountNumber(product.productType);

    let maturityAmount = principal;
    const openingDate = new Date();
    const maturityDate = new Date(openingDate);
    maturityDate.setMonth(maturityDate.getMonth() + tenure);

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
      branchName: branch?.name || 'Head Office Agra',
      openingDate: openingDate.toISOString().split('T')[0],
      principalAmount: principal,
      interestRate: product.interestRate,
      tenureMonths: tenure,
      maturityDate: maturityDate.toISOString().split('T')[0],
      maturityAmount,
      currentBalance: product.productType === ProductType.TERM_DEPOSIT ? principal : principal,
      status: AccountStatus.ACTIVE,
      createdBy: user.id || 'USR-001',
      approvedBy: user.id || 'USR-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.dataStore.accounts.unshift(newAccount);

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
}
