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
  CustomerStatus,
  KYCStatus,
  KYCDocumentType,
  ICustomer,
  ICustomerKYC,
  IUser,
  PaginationParams,
} from '@sanjeevani/shared-types';

@Controller('api/v1/customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private dataStore: DataStoreService) { }

  @Get()
  async getCustomers(
    @Query() query: PaginationParams & { branchId?: string; kycStatus?: string },
  ) {
    await this.dataStore.refreshIfStale();
    let list = [...this.dataStore.customers];

    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.customerNumber.toLowerCase().includes(s) ||
          c.firstName.toLowerCase().includes(s) ||
          c.lastName.toLowerCase().includes(s) ||
          c.mobile.includes(s) ||
          c.city.toLowerCase().includes(s),
      );
    }

    if (query.branchId) {
      list = list.filter((c) => c.branchId === query.branchId);
    }

    if (query.kycStatus) {
      list = list.filter((c) => c.kycStatus === query.kycStatus);
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const startIndex = (page - 1) * limit;
    const paginatedItems = list.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems,
      total: list.length,
      page,
      limit,
      totalPages: Math.ceil(list.length / limit),
    };
  }

  @Post()
  async createCustomer(@Body() body: Partial<ICustomer>, @CurrentUser() user: IUser) {
    if (!body.firstName || !body.lastName || !body.mobile) {
      throw new BadRequestException('First Name, Last Name and Mobile are required');
    }

    const today = new Date().toISOString().split('T')[0];
    if (this.dataStore.isDateLocked(today)) {
      throw new BadRequestException(
        `Business Date Locked (BR-009): Business date ${today} is closed and locked. Member registrations are blocked.`,
      );
    }

    // Duplicate Check (§90)
    const existingMobile = this.dataStore.customers.find((c) => c.mobile === body.mobile);
    if (existingMobile) {
      throw new BadRequestException(
        `Duplicate Customer Alert: Mobile number ${body.mobile} is already registered under Customer ${existingMobile.customerNumber} (${existingMobile.firstName} ${existingMobile.lastName})`,
      );
    }

    const customerNumber = this.dataStore.nextCustomerNumber();
    const branch = this.dataStore.branches.find((b) => b.id === (body.branchId || user.branchId || 'BR-001'));

    const hasKyc = !!(body as any).kycDocumentNumber;
    const newCustomer: ICustomer = {
      id: `CUS-${Date.now()}`,
      customerNumber,
      branchId: branch?.id || 'BR-001',
      branchCode: branch?.branchCode || 'SJF-BR001',
      branchName: branch?.name || 'Head Office - Main Branch (Delhi)',
      firstName: body.firstName.trim(),
      middleName: body.middleName?.trim() || undefined,
      lastName: body.lastName.trim(),
      fatherOrSpouseName: body.fatherOrSpouseName?.trim() || 'Not Specified',
      dateOfBirth: body.dateOfBirth || '1990-01-01',
      gender: body.gender || 'MALE',
      mobile: body.mobile.trim(),
      alternateMobile: body.alternateMobile?.trim() || undefined,
      email: body.email?.trim() || undefined,
      addressLine1: body.addressLine1?.trim() || 'Address not specified',
      city: body.city?.trim() || 'Delhi',
      state: body.state?.trim() || 'Delhi',
      postalCode: body.postalCode?.trim() || '110086',
      photoUrl: body.photoUrl || undefined,
      joiningDate: today,
      status: CustomerStatus.ACTIVE,
      kycStatus: hasKyc ? KYCStatus.VERIFIED : KYCStatus.PENDING,
      createdBy: user.id || 'USR-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.dataStore.customers.unshift(newCustomer);
    await this.dataStore.persistCustomer(newCustomer);

    if (hasKyc) {
      this.dataStore.kycDocuments.push({
        id: `KYC-${Date.now()}`,
        customerId: newCustomer.id,
        documentType: (body as any).kycDocumentType || KYCDocumentType.AADHAAR,
        documentNumber: (body as any).kycDocumentNumber,
        documentUrl: 'https://storage.sanjeevanifinance.com/kyc/doc.pdf',
        verificationStatus: KYCStatus.VERIFIED,
        verifiedBy: user.id || 'USR-001',
        verifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    this.dataStore.logAudit(
      user.id || 'USR-001',
      user.employeeName || 'Staff',
      'CUSTOMER_CREATED',
      'Customer',
      newCustomer.id,
      undefined,
      newCustomer,
      `New Member Registered: ${newCustomer.customerNumber} (${newCustomer.firstName} ${newCustomer.lastName})`,
    );

    return newCustomer;
  }

  /**
   * CUSTOMER 360 DEGREE PROFILE (SRS §69)
   * Aggregates Accounts, Loans, KYC, Nominees, Payments, and Complaints
   */
  @Get(':id/360')
  async getCustomer360(@Param('id') id: string) {
    await this.dataStore.refreshIfStale();
    const customer = this.dataStore.customers.find((c) => c.id === id || c.customerNumber === id);
    if (!customer) {
      throw new NotFoundException(`Customer not found for identifier: ${id}`);
    }

    const kycDocs = this.dataStore.kycDocuments.filter((k) => k.customerId === customer.id);
    const nominees = this.dataStore.nominees.filter((n) => n.customerId === customer.id);
    const accounts = this.dataStore.accounts.filter((a) => a.customerId === customer.id);
    const loans = this.dataStore.loans.filter((l) => l.customerId === customer.id);
    const transactions = this.dataStore.transactions.filter((t) => t.customerId === customer.id);
    const complaints = this.dataStore.complaints.filter((c) => c.customerId === customer.id);

    // Calculate aggregated totals with Decimal.js precision
    let totalDeposits = 0;
    for (const acc of accounts) {
      totalDeposits = FinancialEngine.add(totalDeposits, acc.currentBalance || 0);
    }

    let totalLoanOutstanding = 0;
    let nextEmiAmount = 0;
    let nextDueDate: string | undefined = undefined;

    for (const ln of loans) {
      totalLoanOutstanding = FinancialEngine.add(totalLoanOutstanding, ln.outstandingPrincipal || 0);
      const nextInst = this.dataStore.loanInstallments.find(
        (i) => i.loanId === ln.id && (i.status === 'DUE' || i.status === 'UPCOMING'),
      );
      if (nextInst && !nextDueDate) {
        nextDueDate = nextInst.dueDate;
        nextEmiAmount = nextInst.totalDue;
      }
    }

    return {
      profile: customer,
      summary: {
        totalDeposits,
        totalLoanOutstanding,
        activeAccountsCount: accounts.length,
        activeLoansCount: loans.length,
        nextEmiAmount,
        nextDueDate,
        kycStatus: customer.kycStatus,
      },
      kycDocuments: kycDocs,
      nominees,
      accounts,
      loans,
      recentTransactions: transactions.slice(0, 10),
      complaints,
    };
  }

  @Get(':id')
  async getCustomerById(@Param('id') id: string) {
    await this.dataStore.refreshIfStale();
    const customer = this.dataStore.customers.find((c) => c.id === id || c.customerNumber === id);
    if (!customer) {
      throw new NotFoundException(`Customer not found for identifier: ${id}`);
    }
    return customer;
  }

  @Patch(':id')
  async updateCustomer(
    @Param('id') id: string,
    @Body() body: Partial<ICustomer> & { updateReason?: string },
    @CurrentUser() user: IUser,
  ) {
    const index = this.dataStore.customers.findIndex((c) => c.id === id || c.customerNumber === id);
    if (index === -1) {
      throw new NotFoundException(`Customer not found for identifier: ${id}`);
    }

    const oldVal = { ...this.dataStore.customers[index] };
    const updated = {
      ...oldVal,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    this.dataStore.customers[index] = updated;
    await this.dataStore.persistCustomer(updated);

    this.dataStore.logAudit(
      user.id || 'USR-001',
      user.employeeName || 'Staff',
      'CUSTOMER_UPDATED',
      'Customer',
      updated.id,
      oldVal,
      updated,
      body.updateReason || 'Customer profile update',
    );

    return updated;
  }

  @Post(':id/kyc')
  async addKYCDocument(
    @Param('id') id: string,
    @Body() body: { documentType: KYCDocumentType; documentNumber: string; documentUrl: string },
    @CurrentUser() user: IUser,
  ) {
    const customer = this.dataStore.customers.find((c) => c.id === id || c.customerNumber === id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const newKyc: ICustomerKYC = {
      id: `KYC-${Date.now()}`,
      customerId: customer.id,
      documentType: body.documentType,
      documentNumber: body.documentNumber,
      documentUrl: body.documentUrl || 'https://storage.sanjeevanifinance.com/kyc/doc.pdf',
      verificationStatus: KYCStatus.VERIFIED,
      verifiedBy: user.id || 'USR-002',
      verifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.dataStore.kycDocuments.push(newKyc);
    customer.kycStatus = KYCStatus.VERIFIED;
    await this.dataStore.persistCustomer(customer);

    this.dataStore.logAudit(
      user.id || 'USR-001',
      user.employeeName || 'Staff',
      'KYC_VERIFIED',
      'CustomerKYC',
      newKyc.id,
      undefined,
      newKyc,
      `Verified ${body.documentType} for customer ${customer.customerNumber}`,
    );

    return newKyc;
  }

  @Delete(':id')
  async deleteCustomer(@Param('id') id: string, @CurrentUser() user: IUser) {
    const index = this.dataStore.customers.findIndex((c) => c.id === id || c.customerNumber === id);
    if (index === -1) {
      throw new NotFoundException(`Customer not found: ${id}`);
    }

    const removed = this.dataStore.customers.splice(index, 1)[0];
    await this.dataStore.deleteCustomer(removed.id);

    this.dataStore.logAudit(
      user.id || 'USR-001',
      user.employeeName || 'Admin',
      'CUSTOMER_DELETED',
      'Customer',
      removed.id,
      removed,
      undefined,
      `Deleted customer ${removed.firstName} ${removed.lastName} (${removed.customerNumber})`,
    );

    return { message: `Customer ${removed.firstName} ${removed.lastName} removed successfully.`, id: removed.id };
  }
}
