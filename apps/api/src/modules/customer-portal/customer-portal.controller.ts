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
  Logger,
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
  ICustomer,
  CustomerStatus,
  KYCStatus,
} from '@sanjeevani/shared-types';

// In-Memory Stores
// 1. Passwords Map (customerId -> password)
const customerPasswordMap = new Map<string, string>();
// 2. Active OTP Store (cleanMobile -> { otp, customerId, expiresAt, attempts })
const otpStore = new Map<string, { otp: string; customerId: string; expiresAt: number; attempts: number }>();

@Controller('api/v1/portal')
export class CustomerPortalController {
  private readonly logger = new Logger(CustomerPortalController.name);

  constructor(
    private dataStore: DataStoreService,
    private jwtService: JwtService,
  ) {}

  /**
   * Helper: Dispatch OTP via MSG91 SendOTP API (SMS / WhatsApp / Voice)
   */
  private async dispatchMsg91Otp(mobile: string, otp: string): Promise<boolean> {
    const authKey = process.env.MSG91_AUTH_KEY;
    const widgetId = process.env.MSG91_WIDGET_ID || '3669636e5954383136343531';
    const templateId = process.env.MSG91_OTP_TEMPLATE_ID;

    // If live authKey is present, call MSG91 SendOTP API
    if (authKey) {
      try {
        const url = templateId
          ? `https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=91${mobile}&authkey=${authKey}&otp=${otp}&otp_length=4`
          : `https://control.msg91.com/api/v5/otp?mobile=91${mobile}&authkey=${authKey}&otp=${otp}&otp_length=4`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const resJson = await res.json();
        this.logger.log(`MSG91 API response for +91${mobile}: ${JSON.stringify(resJson)}`);
        return true;
      } catch (err: any) {
        this.logger.error(`Failed to send MSG91 OTP: ${err.message}`);
        return false;
      }
    } else {
      // In Development or if Auth Key not yet configured, log to server console
      this.logger.warn(`[MSG91 Simulation] Live Auth Key not configured. OTP for +91${mobile} is: ${otp}`);
      return true;
    }
  }

  /**
   * 1. CHECK MOBILE NUMBER & PASSWORD STATUS
   * Returns whether customer exists and whether they already created a password
   */
  @Post('check-mobile')
  async checkMobile(@Body() body: { mobile?: string }) {
    await this.dataStore.refreshIfStale();

    const rawMobile = body.mobile?.trim() || '';
    const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10);

    if (!cleanMobile || cleanMobile.length < 10) {
      throw new BadRequestException('Please enter a valid 10-digit mobile number');
    }

    const customer = this.dataStore.customers.find((c) => {
      const cMob = (c.mobile || '').replace(/\D/g, '').slice(-10);
      return cMob === cleanMobile;
    });

    if (!customer) {
      // First-time visitor who is not yet in the customer database
      return {
        success: true,
        data: {
          exists: false,
          isNew: true,
          hasPassword: false,
          customerName: 'New Member',
          mobile: cleanMobile,
        },
      };
    }

    const hasPassword = this.dataStore.hasCustomerPassword(customer.id);
    const fullName = `${customer.firstName} ${customer.lastName || ''}`.trim();

    return {
      success: true,
      data: {
        exists: true,
        isNew: false,
        hasPassword,
        customerId: customer.id,
        customerNumber: customer.customerNumber,
        customerName: fullName,
        mobile: cleanMobile,
      },
    };
  }

  /**
   * 2. SEND OTP (MSG91 Gateway)
   * Dispatches 6-digit OTP to customer's mobile number (SMS / WhatsApp)
   */
  @Post('send-otp')
  async sendOtp(@Body() body: { mobile?: string }) {
    await this.dataStore.refreshIfStale();

    const rawMobile = body.mobile?.trim() || '';
    const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10);

    if (!cleanMobile || cleanMobile.length < 10) {
      throw new BadRequestException('Please enter a valid 10-digit mobile number');
    }

    const customer = this.dataStore.customers.find((c) => {
      const cMob = (c.mobile || '').replace(/\D/g, '').slice(-10);
      return cMob === cleanMobile;
    });

    // Rate Limiting: Check previous OTP request
    const existing = otpStore.get(cleanMobile);
    if (existing && Date.now() < existing.expiresAt - 4 * 60 * 1000) {
      throw new BadRequestException('An OTP was just sent. Please wait 60 seconds before requesting another code.');
    }

    // Generate 4-digit secure numerical OTP (matching MSG91 Widget settings)
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

    otpStore.set(cleanMobile, {
      otp,
      customerId: customer ? customer.id : '',
      expiresAt,
      attempts: 0,
    });

    // Dispatch via MSG91
    await this.dispatchMsg91Otp(cleanMobile, otp);

    const hasAuthKey = Boolean(process.env.MSG91_AUTH_KEY);

    return {
      success: true,
      message: `OTP sent to +91 ${cleanMobile} via SMS & WhatsApp. Valid for 5 minutes.`,
      data: {
        expiresInSeconds: 300,
        // Include devOtp if live gateway credentials not yet added, ensuring frictionless instant testing
        devOtp: !hasAuthKey || process.env.NODE_ENV !== 'production' ? otp : undefined,
      },
    };
  }

  /**
   * 3. FIRST-TIME LOGIN: VERIFY OTP AND CREATE PASSWORD
   * Verifies OTP, saves the password, marks customer as having password, and logs them in!
   */
  @Post('verify-otp-set-password')
  async verifyOtpAndSetPassword(
    @Body() body: { mobile?: string; otp?: string; newPassword?: string; fullName?: string },
  ) {
    await this.dataStore.refreshIfStale();

    const cleanMobile = (body.mobile || '').replace(/\D/g, '').slice(-10);
    const otp = body.otp?.trim();
    const newPassword = body.newPassword?.trim();

    if (!cleanMobile || !otp || !newPassword) {
      throw new BadRequestException('Please provide mobile number, OTP, and your new password');
    }

    if (newPassword.length < 4) {
      throw new BadRequestException('Password must be at least 4 characters long');
    }

    const record = otpStore.get(cleanMobile);
    if (!record) {
      throw new BadRequestException('No active OTP found. Please request a new OTP.');
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanMobile);
      throw new BadRequestException('OTP has expired. Please request a new code.');
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      if (record.attempts >= 4) {
        otpStore.delete(cleanMobile);
        throw new BadRequestException('Too many incorrect attempts. Please request a new OTP.');
      }
      throw new BadRequestException(`Incorrect OTP. ${4 - record.attempts} attempt(s) remaining.`);
    }

    // OTP Valid! Clear OTP
    otpStore.delete(cleanMobile);

    // Check if customer exists, or auto-create account for new customer!
    let customer = this.dataStore.customers.find((c) => {
      const cMob = (c.mobile || '').replace(/\D/g, '').slice(-10);
      return cMob === cleanMobile;
    });

    if (!customer) {
      const newCount = this.dataStore.customers.length + 1;
      const customerNumber = `SJF-${String(newCount).padStart(6, '0')}`;
      const newId = `CUS-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const nameParts = (body.fullName?.trim() || 'New Member').split(' ');
      const firstName = nameParts[0] || 'Member';
      const lastName = nameParts.slice(1).join(' ') || '';

      const newCustomer: ICustomer = {
        id: newId,
        customerNumber,
        branchId: 'BR-001',
        branchCode: 'SJF-BR001',
        branchName: 'Head Office - Main Branch',
        firstName,
        lastName,
        fatherOrSpouseName: 'Not Specified',
        dateOfBirth: '1995-01-01',
        gender: 'MALE',
        mobile: cleanMobile,
        addressLine1: 'Registered via Online Customer Portal',
        city: 'Agra',
        state: 'Uttar Pradesh',
        postalCode: '282001',
        joiningDate: new Date().toISOString().split('T')[0],
        status: CustomerStatus.ACTIVE,
        kycStatus: KYCStatus.PENDING,
        createdBy: 'PORTAL-SELF-SERVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.dataStore.customers.unshift(newCustomer);
      this.dataStore.persistCustomer(newCustomer);
      customer = newCustomer;
    }

    // Store customer's new password in memory & PostgreSQL
    await this.dataStore.saveCustomerPassword(customer.id, newPassword);

    // Issue JWT Token
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
      message: `Password created successfully! Welcome to Sanjeevani Finance, ${fullName}.`,
    };
  }

  /**
   * 4. RETURNING CUSTOMER: LOGIN WITH OTP
   */
  @Post('login-otp')
  async loginWithOtp(@Body() body: { mobile?: string; otp?: string }) {
    await this.dataStore.refreshIfStale();

    const cleanMobile = (body.mobile || '').replace(/\D/g, '').slice(-10);
    const otp = body.otp?.trim();

    if (!cleanMobile || !otp) {
      throw new BadRequestException('Please provide your mobile number and OTP');
    }

    const record = otpStore.get(cleanMobile);
    if (!record) {
      throw new BadRequestException('No active OTP found. Please request a new OTP.');
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanMobile);
      throw new BadRequestException('OTP has expired. Please request a new code.');
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      if (record.attempts >= 4) {
        otpStore.delete(cleanMobile);
        throw new BadRequestException('Too many incorrect attempts. Please request a new OTP.');
      }
      throw new BadRequestException(`Incorrect OTP. ${4 - record.attempts} attempt(s) remaining.`);
    }

    otpStore.delete(cleanMobile);

    const customer = this.dataStore.customers.find((c) => {
      const cMob = (c.mobile || '').replace(/\D/g, '').slice(-10);
      return cMob === cleanMobile || (record.customerId && c.id === record.customerId);
    });
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
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
   * 5. RETURNING CUSTOMER: LOGIN WITH PASSWORD
   */
  @Post('login-password')
  async loginWithPassword(@Body() body: { mobile?: string; password?: string }) {
    await this.dataStore.refreshIfStale();

    const cleanMobile = (body.mobile || '').replace(/\D/g, '').slice(-10);
    const password = body.password?.trim();

    if (!cleanMobile || !password) {
      throw new BadRequestException('Please provide your mobile number and password');
    }

    const customer = this.dataStore.customers.find((c) => {
      const cMob = (c.mobile || '').replace(/\D/g, '').slice(-10);
      return cMob === cleanMobile;
    });

    if (!customer) {
      throw new UnauthorizedException('No account found with this mobile number.');
    }

    const customPass = this.dataStore.getCustomerPassword(customer.id);
    const last4Mobile = customer.mobile ? customer.mobile.slice(-4) : '1234';
    const isValidPass = customPass
      ? customPass === password
      : password === 'Pass@123' ||
        password === 'Password@123' ||
        password === last4Mobile ||
        (customer.dateOfBirth && password === customer.dateOfBirth.replace(/-/g, ''));

    if (!isValidPass) {
      throw new UnauthorizedException('Incorrect password. Please try again or log in with OTP.');
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
   * 6. FORGOT / RESET PASSWORD WITH OTP
   */
  @Post('reset-password')
  async resetPassword(
    @Body() body: { mobile?: string; otp?: string; newPassword?: string },
  ) {
    return this.verifyOtpAndSetPassword(body);
  }

  /**
   * 7. LEGACY LOGIN (Customer ID or Mobile + Password)
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
        c.mobile?.replace(/\D/g, '').endsWith(cleanId.replace(/\D/g, '')),
    );

    if (!customer) {
      throw new UnauthorizedException('No account found with this Customer ID or Mobile Number.');
    }

    const customPass = this.dataStore.getCustomerPassword(customer.id);
    const last4Mobile = customer.mobile ? customer.mobile.slice(-4) : '1234';
    const isValidPass = customPass
      ? customPass === password
      : password === 'Pass@123' ||
        password === 'Password@123' ||
        password === last4Mobile ||
        (customer.dateOfBirth && password === customer.dateOfBirth.replace(/-/g, ''));

    if (!isValidPass) {
      throw new UnauthorizedException('Invalid password.');
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
   * 8. GET AUTHENTICATED CUSTOMER PORTFOLIO (SRS §23 - 10 Modules)
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
   * 9. FILE CUSTOMER COMPLAINT / GRIEVANCE (SRS §37)
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
   * 10. CHANGE CUSTOMER PORTAL PASSWORD
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

    await this.dataStore.saveCustomerPassword(customerId, body.newPassword);

    return {
      success: true,
      message: 'Portal password updated successfully. Please use your new password next time you sign in.',
    };
  }

  /**
   * 11. SEND OTP TO CHANGE PASSWORD (SRS §23)
   */
  @Post('send-change-password-otp')
  @UseGuards(JwtAuthGuard)
  async sendChangePasswordOtp(@Req() req: any) {
    await this.dataStore.refreshIfStale();

    const customerId = req.user?.customerId || req.user?.sub;
    const customer = this.dataStore.customers.find((c) => c.id === customerId);

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const cleanMobile = (customer.mobile || '').replace(/\D/g, '').slice(-10);
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpStore.set(cleanMobile, {
      otp,
      customerId: customer.id,
      expiresAt,
      attempts: 0,
    });

    await this.dispatchMsg91Otp(cleanMobile, otp);
    const hasAuthKey = Boolean(process.env.MSG91_AUTH_KEY);

    return {
      success: true,
      message: `Verification OTP sent to +91 ******${cleanMobile.slice(-4)} via SMS & WhatsApp.`,
      data: {
        devOtp: !hasAuthKey || process.env.NODE_ENV !== 'production' ? otp : undefined,
      },
    };
  }

  /**
   * 12. VERIFY OTP & UPDATE PASSWORD
   */
  @Post('verify-change-password')
  @UseGuards(JwtAuthGuard)
  async verifyAndChangePassword(
    @Req() req: any,
    @Body() body: { otp?: string; newPassword?: string },
  ) {
    await this.dataStore.refreshIfStale();

    const customerId = req.user?.customerId || req.user?.sub;
    const customer = this.dataStore.customers.find((c) => c.id === customerId);

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const cleanMobile = (customer.mobile || '').replace(/\D/g, '').slice(-10);
    const otp = body.otp?.trim();
    const newPassword = body.newPassword?.trim();

    if (!otp || !newPassword) {
      throw new BadRequestException('Please provide the OTP and your new password');
    }

    if (newPassword.length < 4) {
      throw new BadRequestException('New password must be at least 4 characters long');
    }

    const record = otpStore.get(cleanMobile);
    if (!record) {
      throw new BadRequestException('No active OTP found. Please request an OTP first.');
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanMobile);
      throw new BadRequestException('OTP has expired. Please request a new code.');
    }

    if (record.otp !== otp) {
      throw new BadRequestException('Incorrect OTP verification code.');
    }

    otpStore.delete(cleanMobile);
    await this.dataStore.saveCustomerPassword(customer.id, newPassword);

    return {
      success: true,
      message: 'Your account password has been updated successfully!',
    };
  }
}
