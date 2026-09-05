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
  RiskCategory,
  ICustomer,
  ICustomerKYC,
  IUser,
  PaginationParams,
  ProductType,
  IAccount,
  AccountStatus,
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

    const aadhaar = body.aadhaar?.trim() || ((body as any).kycDocumentType === 'AADHAAR' ? (body as any).kycDocumentNumber?.trim() : undefined);
    const pan = body.pan?.trim()?.toUpperCase() || ((body as any).kycDocumentType === 'PAN' ? (body as any).kycDocumentNumber?.trim()?.toUpperCase() : undefined);
    const hasKyc = !!(aadhaar || pan || (body as any).kycDocumentNumber);

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
      aadhaar: aadhaar || undefined,
      pan: pan || undefined,
      addressLine1: body.addressLine1?.trim() || 'Address not specified',
      city: body.city?.trim() || 'Delhi',
      state: body.state?.trim() || 'Delhi',
      postalCode: body.postalCode?.trim() || '110086',
      photoUrl: body.photoUrl || undefined,
      joiningDate: today,
      status: CustomerStatus.ACTIVE,
      kycStatus: hasKyc ? KYCStatus.VERIFIED : KYCStatus.PENDING,
      riskCategory: body.riskCategory || RiskCategory.LOW,
      createdBy: user.id || 'USR-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.dataStore.customers.unshift(newCustomer);
    await this.dataStore.persistCustomer(newCustomer);

    if (hasKyc) {
      if (aadhaar) {
        this.dataStore.kycDocuments.push({
          id: `KYC-${Date.now()}-1`,
          customerId: newCustomer.id,
          documentType: KYCDocumentType.AADHAAR,
          documentNumber: aadhaar,
          documentUrl: 'https://storage.sanjeevanifinance.com/kyc/doc.pdf',
          verificationStatus: KYCStatus.VERIFIED,
          verifiedBy: user.id || 'USR-001',
          verifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      }
      if (pan) {
        this.dataStore.kycDocuments.push({
          id: `KYC-${Date.now()}-2`,
          customerId: newCustomer.id,
          documentType: KYCDocumentType.PAN,
          documentNumber: pan,
          documentUrl: 'https://storage.sanjeevanifinance.com/kyc/doc.pdf',
          verificationStatus: KYCStatus.VERIFIED,
          verifiedBy: user.id || 'USR-001',
          verifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      }
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
   * DATA MIGRATION & BULK REGISTER IMPORT (SRS §50)
   * Onboards batches of legacy members, assigns sequential IDs, and posts opening balances
   */
  @Post('bulk-import')
  async bulkImport(
    @Body()
    body: {
      rows: Array<{
        firstName: string;
        lastName?: string;
        fatherOrSpouseName?: string;
        mobile: string;
        alternateMobile?: string;
        email?: string;
        dateOfBirth?: string;
        gender?: 'MALE' | 'FEMALE' | 'OTHER';
        addressLine1?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        aadhaar?: string;
        pan?: string;
        nomineeName?: string;
        nomineeRelationship?: string;
        nomineeMobile?: string;
        openingBalance?: number;
        openingProductType?: ProductType;
        joiningDate?: string;
      }>;
    },
    @CurrentUser() user: IUser,
  ) {
    if (!body.rows || !Array.isArray(body.rows) || body.rows.length === 0) {
      throw new BadRequestException('Invalid bulk import payload. Expected a non-empty rows array.');
    }

    const today = new Date().toISOString().split('T')[0];
    const imported: ICustomer[] = [];
    const createdAccounts: IAccount[] = [];
    const errors: Array<{ rowNumber: number; member: string; error: string }> = [];

    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i];
      const rowNumber = i + 1;
      const memberName = `${row.firstName || ''} ${row.lastName || ''}`.trim() || `Row #${rowNumber}`;

      try {
        if (!row.firstName?.trim()) {
          throw new Error('First Name is required');
        }
        if (!row.mobile || String(row.mobile).trim().length < 10) {
          throw new Error('Valid 10-digit Mobile Number is required');
        }

        const customerNumber = this.dataStore.nextCustomerNumber();
        const aadhaar = row.aadhaar ? String(row.aadhaar).replace(/\D/g, '') : undefined;
        const pan = row.pan ? String(row.pan).trim().toUpperCase() : undefined;
        const hasKyc = Boolean((aadhaar && aadhaar.length === 12) || (pan && pan.length === 10));

        const customer: ICustomer = {
          id: `CUS-LEGACY-${Date.now()}-${i}`,
          customerNumber,
          branchId: user.branchId || 'BR-001',
          branchName: user.branchName || 'Head Office - Main Branch (Delhi)',
          firstName: row.firstName.trim(),
          middleName: undefined,
          lastName: row.lastName?.trim() || '',
          fatherOrSpouseName: row.fatherOrSpouseName?.trim() || 'Not Specified',
          dateOfBirth: row.dateOfBirth || '1990-01-01',
          gender: (row.gender as any) || 'MALE',
          mobile: String(row.mobile).trim(),
          alternateMobile: row.alternateMobile ? String(row.alternateMobile).trim() : undefined,
          email: row.email?.trim() || undefined,
          addressLine1: row.addressLine1?.trim() || 'Delhi',
          city: row.city?.trim() || 'Delhi',
          state: row.state?.trim() || 'Delhi',
          postalCode: row.postalCode?.trim() || '110086',
          aadhaar,
          pan,
          joiningDate: row.joiningDate || today,
          status: CustomerStatus.ACTIVE,
          kycStatus: hasKyc ? KYCStatus.VERIFIED : KYCStatus.PENDING,
          riskCategory: RiskCategory.LOW,
          createdBy: user.id || 'USR-001',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (row.nomineeName?.trim()) {
          this.dataStore.nominees.push({
            id: `NOM-${Date.now()}-${i}`,
            customerId: customer.id,
            name: row.nomineeName.trim(),
            relationship: row.nomineeRelationship?.trim() || 'Spouse',
            mobile: row.nomineeMobile ? String(row.nomineeMobile).trim() : '9876543210',
            dateOfBirth: '1995-01-01',
            address: row.addressLine1?.trim() || 'Delhi',
            percentage: 100,
            createdAt: new Date().toISOString(),
          });
        }

        this.dataStore.customers.unshift(customer);
        await this.dataStore.persistCustomer(customer);
        imported.push(customer);

        // Optional Opening Deposit Balance
        const openBal = Number(row.openingBalance);
        if (openBal > 0) {
          const pType = row.openingProductType || ProductType.SAVINGS;
          const accNumber = this.dataStore.nextAccountNumber(pType);
          const account: IAccount = {
            id: `ACC-LEGACY-${Date.now()}-${i}`,
            accountNumber: accNumber,
            customerId: customer.id,
            customerName: `${customer.firstName} ${customer.lastName}`,
            customerNumber: customer.customerNumber,
            productId: pType === ProductType.RD ? 'PRD-002' : pType === ProductType.TERM_DEPOSIT ? 'PRD-003' : 'PRD-001',
            productName: pType === ProductType.RD ? 'Recurring Deposit Scheme' : pType === ProductType.TERM_DEPOSIT ? 'Fixed Term Deposit' : 'Member Regular Savings',
            productType: pType,
            branchId: customer.branchId,
            branchName: customer.branchName,
            openingDate: row.joiningDate || today,
            principalAmount: openBal,
            interestRate: pType === ProductType.SAVINGS ? 4.0 : 8.5,
            tenureMonths: 12,
            maturityDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            maturityAmount: openBal,
            currentBalance: openBal,
            status: AccountStatus.ACTIVE,
            remarks: 'Legacy Register Opening Balance (Migration §50)',
            createdBy: user.id || 'USR-001',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          this.dataStore.accounts.unshift(account);
          await this.dataStore.persistAccount(account);
          createdAccounts.push(account);
        }
      } catch (err: any) {
        errors.push({
          rowNumber,
          member: memberName,
          error: err.message || 'Unknown processing error',
        });
      }
    }

    this.dataStore.logAudit(
      user.id || 'USR-001',
      user.employeeName || 'Super Admin',
      'LEGACY_DATA_MIGRATION',
      'BatchImport',
      `BATCH-${Date.now()}`,
      undefined,
      { totalRows: body.rows.length, importedCount: imported.length, accountCount: createdAccounts.length, errorsCount: errors.length },
      `Legacy Register Migration (§50): Imported ${imported.length} members and ${createdAccounts.length} opening accounts.`,
    );

    return {
      success: true,
      totalRows: body.rows.length,
      importedCount: imported.length,
      accountsCreated: createdAccounts.length,
      failedCount: errors.length,
      errors,
      importedMembers: imported.slice(0, 10),
    };
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
    const updated: ICustomer = {
      ...oldVal,
      ...body,
      aadhaar: body.aadhaar !== undefined ? (body.aadhaar ? String(body.aadhaar).trim() : undefined) : oldVal.aadhaar,
      pan: body.pan !== undefined ? (body.pan ? String(body.pan).trim().toUpperCase() : undefined) : oldVal.pan,
      state: body.state !== undefined ? String(body.state).trim() : oldVal.state,
      city: body.city !== undefined ? String(body.city).trim() : oldVal.city,
      alternateMobile: body.alternateMobile !== undefined ? (body.alternateMobile ? String(body.alternateMobile).trim() : undefined) : oldVal.alternateMobile,
      riskCategory: body.riskCategory || oldVal.riskCategory || RiskCategory.LOW,
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
