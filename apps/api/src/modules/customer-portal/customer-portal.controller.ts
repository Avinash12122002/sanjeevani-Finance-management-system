import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ProductType,
  ComplaintStatus,
  PriorityLevel,
  IComplaint,
  InstallmentStatus,
} from '@sanjeevani/shared-types';

// In-Memory Customer Password Map (fallback & fast lookup)
const customerPasswordMap = new Map<string, string>();

@Controller('api/v1/portal')
export class CustomerPortalController {
  constructor(
    private dataStore: DataStoreService,
    private jwtService: JwtService,
  ) {}

  /**
   * CUSTOMER SELF-SERVICE PORTAL LOGIN (SRS §23)
   * Login using Customer ID (e.g. SJF-000001) or Mobile Number + Password/PIN
   */
  @Post('login')
  async login(@Body() body: { identifier?: string; password?: string }) {
    await this.dataStore.refreshIfStale();

    const { identifier, password } = body;
    if (!identifier || !password) {
      throw new BadRequestException('Please provide your Customer ID or Mobile Number and Password');
    }

    const cleanId = identifier.trim().toLowerCase();
    const customer = this.dataStore.customers.find(
      (c) =>
        c.customerNumber?.toLowerCase() === cleanId ||
        c.id?.toLowerCase() === cleanId ||
        c.mobile?.replace(/\D/g, '') === cleanId.replace(/\D/g, ''),
    );

    if (!customer) {
      throw new UnauthorizedException('No account found with this Customer ID or Mobile Number. Please contact branch support.');
    }

    // Password Check: Custom password OR default fallback (Pass@123 or last 4 digits of mobile)
    const customPass = customerPasswordMap.get(customer.id);
    const last4Mobile = customer.mobile ? customer.mobile.slice(-4) : '1234';
    const isValidPass = customPass
      ? customPass === password
      : password === 'Pass@123' ||
        password === 'Password@123' ||
        password === last4Mobile ||
        (customer.dateOfBirth && password === customer.dateOfBirth.replace(/-/g, ''));

    if (!isValidPass) {
      throw new UnauthorizedException('Invalid password. Default password is Pass@123 or the last 4 digits of your mobile number.');
    }

    const fullName = `${customer.firstName} ${customer.lastName || ''}`.trim();
    const payload = {
      sub: customer.id,
      customerId: customer.id,
      customerNumber: customer.customerNumber,
      name: fullName,
      mobile: customer.mobile,
      isCustomer: true,
      roles: ['CUSTOMER'],
    };

    const token = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

    return {
      success: true,
      data: {
        accessToken: token,
        customer: {
          id: customer.id,
          customerNumber: customer.customerNumber,
          fullName,
          mobile: customer.mobile,
          email: customer.email,
          city: customer.city,
          kycStatus: customer.kycStatus,
          joiningDate: customer.joiningDate,
          branchName: customer.branchName,
        },
      },
      message: `Welcome back, ${fullName}!`,
    };
  }

  /**
   * GET AUTHENTICATED CUSTOMER PORTFOLIO (SRS §23 - 10 Modules)
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyPortfolio(@Req() req: any) {
    await this.dataStore.refreshIfStale();

    const customerId = req.user?.customerId || req.user?.sub;
    const customer = this.dataStore.customers.find((c) => c.id === customerId);

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    // 1. Linked Accounts (Savings, RD, FD)
    const accounts = this.dataStore.accounts.filter(
      (a) => a.customerId === customer.id || a.customerName?.toLowerCase() === `${customer.firstName} ${customer.lastName || ''}`.trim().toLowerCase(),
    );

    const savingsAccounts = accounts.filter((a) => a.productType === ProductType.SAVINGS || a.accountNumber?.startsWith('SB'));
    const rdAccounts = accounts.filter((a) => a.productType === ProductType.RD || a.accountNumber?.startsWith('RD'));
    const fdAccounts = accounts.filter((a) => a.productType === ProductType.TERM_DEPOSIT || a.accountNumber?.startsWith('FD'));

    // 2. Linked Loans & EMI Schedules
    const loans = this.dataStore.loans.filter(
      (l) => l.customerId === customer.id || l.customerNumber === customer.customerNumber,
    );

    const accountIds = new Set(accounts.map((a) => a.id).concat(accounts.map((a) => a.accountNumber)));
    const loanIds = new Set(loans.map((l) => l.id).concat(loans.map((l) => l.loanNumber)));

    // 3. RD Installments
    const rdInstallments = this.dataStore.rdInstallments.filter((r) => accountIds.has(r.rdAccountId));

    // 4. Loan Installments
    const loanInstallments = this.dataStore.loanInstallments.filter((li) => loanIds.has(li.loanId));

    // 5. Transactions / Passbook Entries
    const transactions = this.dataStore.transactions
      .filter((t) => (t.accountId && accountIds.has(t.accountId)) || t.customerId === customer.id)
      .sort((a, b) => new Date(b.transactionDate || b.createdAt).getTime() - new Date(a.transactionDate || a.createdAt).getTime());

    // 6. Digital Receipts
    const receipts = this.dataStore.receipts
      .filter((r) => r.customerId === customer.id || r.customerNumber === customer.customerNumber)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

    // 7. Support & Complaint Tickets
    const complaints = this.dataStore.complaints
      .filter((c) => c.customerId === customer.id || c.customerNumber === customer.customerNumber)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 8. Nominees
    const nominees = this.dataStore.nominees.filter((n) => n.customerId === customer.id);

    // Financial Summaries
    const totalSavings = savingsAccounts.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
    const totalRdDeposited = rdAccounts.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
    const totalFdPrincipal = fdAccounts.reduce((sum, a) => sum + (Number(a.principalAmount) || 0), 0);
    const totalLoanOutstanding = loans.reduce((sum, l) => sum + (Number(l.outstandingPrincipal) || 0), 0);

    // Next EMI Due
    let nextEmiAmount = 0;
    let nextDueDate = '';
    const pendingLoanInst = loanInstallments.find((i) => i.status === InstallmentStatus.DUE || i.status === InstallmentStatus.OVERDUE);
    if (pendingLoanInst) {
      nextEmiAmount = Number(pendingLoanInst.totalDue || 0);
      nextDueDate = pendingLoanInst.dueDate;
    } else if (loans.length > 0 && loans[0].emiAmount) {
      nextEmiAmount = Number(loans[0].emiAmount);
      nextDueDate = loans[0].firstDueDate || '';
    }

    return {
      customer: {
        id: customer.id,
        customerNumber: customer.customerNumber,
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName: `${customer.firstName} ${customer.lastName || ''}`.trim(),
        mobile: customer.mobile,
        email: customer.email,
        address: customer.addressLine1,
        city: customer.city,
        state: customer.state,
        kycStatus: customer.kycStatus,
        joiningDate: customer.joiningDate,
        branchName: customer.branchName,
      },
      summary: {
        totalSavings,
        totalRdDeposited,
        totalFdPrincipal,
        totalDepositPortfolio: totalSavings + totalRdDeposited + totalFdPrincipal,
        totalLoanOutstanding,
        activeAccountsCount: accounts.length,
        activeLoansCount: loans.length,
        nextEmiAmount,
        nextDueDate,
      },
      accounts: {
        savings: savingsAccounts,
        rd: rdAccounts,
        fd: fdAccounts,
        rdInstallments,
      },
      loans: loans.map((l) => ({
        ...l,
        installments: loanInstallments.filter((li) => li.loanId === l.id || li.loanId === l.loanNumber),
      })),
      passbook: transactions,
      receipts,
      complaints,
      nominees,
    };
  }

  /**
   * FILE CUSTOMER COMPLAINT / GRIEVANCE (SRS §37)
   */
  @Post('complaint')
  @UseGuards(JwtAuthGuard)
  async submitComplaint(
    @Req() req: any,
    @Body() body: { category: string; description: string; priority?: PriorityLevel },
  ) {
    await this.dataStore.refreshIfStale();

    const customerId = req.user?.customerId || req.user?.sub;
    const customer = this.dataStore.customers.find((c) => c.id === customerId);

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    if (!body.description) {
      throw new BadRequestException('Please provide details for your complaint');
    }

    const complaintNumber = `CMP-${new Date().getFullYear()}-${String(this.dataStore.complaints.length + 1).padStart(5, '0')}`;
    const newComplaint: IComplaint = {
      id: `CMP-${Date.now()}`,
      complaintNumber,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName || ''}`.trim(),
      customerNumber: customer.customerNumber,
      category: body.category || 'ACCOUNT_SERVICES',
      description: body.description,
      priority: body.priority || PriorityLevel.MEDIUM,
      status: ComplaintStatus.OPEN,
      createdAt: new Date().toISOString(),
    };

    this.dataStore.complaints.unshift(newComplaint);

    return {
      success: true,
      data: newComplaint,
      message: `Your grievance ticket #${complaintNumber} has been logged. Our branch manager will inspect and update you shortly.`,
    };
  }

  /**
   * CHANGE CUSTOMER PORTAL PASSWORD
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req: any,
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    const customerId = req.user?.customerId || req.user?.sub;
    if (!body.newPassword || body.newPassword.length < 4) {
      throw new BadRequestException('New password must be at least 4 characters long');
    }

    customerPasswordMap.set(customerId, body.newPassword);

    return {
      success: true,
      message: 'Portal password updated successfully. Please use your new password next time you sign in.',
    };
  }
}
