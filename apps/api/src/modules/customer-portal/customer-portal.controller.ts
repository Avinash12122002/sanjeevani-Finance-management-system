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
  HttpException,
  HttpStatus,
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
  IAccount,
  AccountStatus,
} from '@sanjeevani/shared-types';
import { randomBytes, randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';

const CUSTOMER_SESSION_EXPIRY = (process.env.CUSTOMER_JWT_EXPIRES_IN || '2h') as any;

// Active OTP Store (cleanMobile -> { otp, customerId, expiresAt, attempts, verified?, reqId? })
const otpStore = new Map<string, { otp: string; customerId: string; expiresAt: number; attempts: number; verified?: boolean; reqId?: string }>();

// Brute-force protection for customer portal (Rate-limiting failed password attempts)
const portalLoginAttemptsMap = new Map<string, { attempts: number; lockUntil: number; firstAttempt: number }>();
const PORTAL_MAX_FAILED_ATTEMPTS = 5;
const PORTAL_LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 mins
const PORTAL_WINDOW_DURATION_MS = 15 * 60 * 1000;

@Controller('api/v1/portal')
export class CustomerPortalController {
  private readonly logger = new Logger(CustomerPortalController.name);

  constructor(
    private dataStore: DataStoreService,
    private jwtService: JwtService,
  ) { }

  /**
   * Helper: Dispatch OTP via MSG91 OTP Widget API (SMS)
   */
  private async dispatchMsg91Otp(mobile: string, otp: string): Promise<boolean> {
    const tokenAuth = process.env.MSG91_TOKEN_AUTH || process.env.MSG91_AUTH_KEY;
    const widgetId = process.env.MSG91_WIDGET_ID || '3669636e5954383136343531';

    // 1. Primary: Use MSG91 Official OTP Widget API
    if (tokenAuth && widgetId) {
      try {
        const res = await fetch('https://api.msg91.com/api/v5/widget/sendOtp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            widgetId,
            tokenAuth,
            identifier: `91${mobile}`,
            otp,
          }),
        });
        const resJson = await res.json();
        this.logger.log(`MSG91 Widget API response for +91${mobile}: ${JSON.stringify(resJson)}`);
        if (resJson.message && resJson.type === 'success') {
          const rec = otpStore.get(mobile);
          if (rec) {
            rec.reqId = resJson.message;
          }
          return true;
        }
      } catch (err: any) {
        this.logger.error(`Failed to send MSG91 Widget OTP: ${err.message}`);
      }
    }

    // 2. Fallback: Direct SendOTP API
    const authKey = process.env.MSG91_AUTH_KEY;
    if (authKey) {
      try {
        const url = `https://control.msg91.com/api/v5/otp?mobile=91${mobile}&authkey=${authKey}&otp=${otp}&otp_length=4`;
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        const resJson = await res.json();
        this.logger.log(`MSG91 API response for +91${mobile}: ${JSON.stringify(resJson)}`);
        return true;
      } catch (err: any) {
        this.logger.error(`Fallback MSG91 error: ${err.message}`);
      }
    }

    if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_OTP === 'true') {
      this.logger.warn(`[MSG91 Simulation] Live Auth Key not configured. OTP for +91${mobile} is: ${otp}`);
    } else {
      this.logger.log(`[MSG91 Simulation] Live Auth Key not configured. Dispatched OTP to +91${mobile.slice(0, 2)}******${mobile.slice(-2)}`);
    }
    return true;
  }

  /**
   * Helper: Verify OTP with MSG91 Widget API
   */
  private async verifyWithMsg91(mobile: string, otp: string, reqId?: string): Promise<boolean> {
    const tokenAuth = process.env.MSG91_TOKEN_AUTH || process.env.MSG91_AUTH_KEY;
    const widgetId = process.env.MSG91_WIDGET_ID || '3669636e5954383136343531';
    if (!tokenAuth || !widgetId) return false;

    try {
      const res = await fetch('https://api.msg91.com/api/v5/widget/verifyOtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetId,
          tokenAuth,
          identifier: `91${mobile}`,
          otp,
          ...(reqId ? { reqId } : {}),
        }),
      });
      const data = await res.json();
      this.logger.log(`MSG91 Widget verifyOtp response: ${JSON.stringify(data)}`);
      return data.type === 'success' || data.message === 'otp_verified' || data.status === 'success';
    } catch (err: any) {
      this.logger.warn(`MSG91 verification error: ${err.message}`);
      return false;
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
        exists: false,
        isNew: true,
        hasPassword: false,
        customerName: 'New Member',
        mobile: cleanMobile,
      };
    }

    const hasPassword = this.dataStore.hasCustomerPassword(customer.id);
    const fullName = `${customer.firstName} ${customer.lastName || ''}`.trim();

    return {
      exists: true,
      isNew: false,
      hasPassword,
      customerId: customer.id,
      customerNumber: customer.customerNumber,
      customerName: fullName,
      mobile: cleanMobile,
    };
  }

  /**
   * 2. SEND OTP (SMS Gateway)
   * Dispatches 4-digit OTP to customer's mobile number via SMS
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
    const otp = randomInt(1000, 10000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

    otpStore.set(cleanMobile, {
      otp,
      customerId: customer ? customer.id : '',
      expiresAt,
      attempts: 0,
    });

    // Dispatch via MSG91 SMS
    await this.dispatchMsg91Otp(cleanMobile, otp);

    const allowDevOtp = process.env.ALLOW_DEV_OTP === 'true' && process.env.NODE_ENV !== 'production';

    return {
      success: true,
      message: `OTP sent to +91 ${cleanMobile} via SMS. Valid for 5 minutes.`,
      data: {
        expiresInSeconds: 300,
        // Only include devOtp in non-production local development if ALLOW_DEV_OTP is explicitly enabled
        devOtp: allowDevOtp ? otp : undefined,
      },
    };
  }

  /**
   * 2.5 VERIFY OTP CODE (Pre-Check Before Setting Password)
   */
  @Post('verify-otp')
  async verifyOtpCode(@Body() body: { mobile?: string; otp?: string }) {
    await this.dataStore.refreshIfStale();

    const cleanMobile = (body.mobile || '').replace(/\D/g, '').slice(-10);
    const otp = body.otp?.trim();

    if (!cleanMobile || !otp) {
      throw new BadRequestException('Please provide your mobile number and OTP code');
    }

    const record = otpStore.get(cleanMobile);
    if (!record) {
      throw new BadRequestException('No active OTP found. Please request a new OTP.');
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanMobile);
      throw new BadRequestException('OTP has expired. Please request a new code.');
    }

    let isMatch = record.otp === otp;
    if (!isMatch && record.reqId) {
      isMatch = await this.verifyWithMsg91(cleanMobile, otp, record.reqId);
    }

    if (!isMatch) {
      record.attempts += 1;
      if (record.attempts >= 4) {
        otpStore.delete(cleanMobile);
        throw new BadRequestException('Too many incorrect attempts. Please request a new OTP.');
      }
      throw new BadRequestException(`Incorrect OTP. ${4 - record.attempts} attempt(s) remaining.`);
    }

    record.verified = true;

    return {
      success: true,
      message: 'OTP verified successfully.',
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

    if (newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long for banking account security');
    }

    const record = otpStore.get(cleanMobile);
    if (!record) {
      throw new BadRequestException('No active OTP session found. Please request a new OTP.');
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanMobile);
      throw new BadRequestException('OTP has expired. Please request a new code.');
    }

    const isPreVerified = record.verified === true;
    let isMatch = record.otp === otp;
    if (!isMatch && record.reqId) {
      isMatch = await this.verifyWithMsg91(cleanMobile, otp, record.reqId);
    }

    if (!isPreVerified && !isMatch) {
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
      const newId = `CUS-${Date.now()}-${randomBytes(4).toString('hex')}`;
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
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110086',
        joiningDate: new Date().toISOString().split('T')[0],
        status: CustomerStatus.ACTIVE,
        kycStatus: KYCStatus.PENDING,
        createdBy: 'PORTAL-SELF-SERVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.dataStore.customers.unshift(newCustomer);
      await this.dataStore.persistCustomer(newCustomer);
      customer = newCustomer;

      // Automatically provision primary Zero-Balance Savings Account
      const accNumber = this.dataStore.nextAccountNumber(ProductType.SAVINGS);
      const newSavingsAccount: IAccount = {
        id: `ACC-${Date.now()}`,
        accountNumber: accNumber,
        customerId: newCustomer.id,
        customerNumber: newCustomer.customerNumber,
        customerName: `${newCustomer.firstName} ${newCustomer.lastName || ''}`.trim(),
        productId: 'PRD-001',
        productName: 'Regular Member Savings',
        productType: ProductType.SAVINGS,
        branchId: 'BR-001',
        branchName: 'Head Office - Main Branch',
        openingDate: new Date().toISOString().split('T')[0],
        principalAmount: 0,
        tenureMonths: 12,
        currentBalance: 0,
        status: AccountStatus.ACTIVE,
        interestRate: 4.0,
        createdBy: 'PORTAL-SELF-SERVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.dataStore.accounts.unshift(newSavingsAccount);
      await this.dataStore.persistAccount(newSavingsAccount);
    }

    // Store customer's new password securely hashed with bcrypt in memory & PostgreSQL
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await this.dataStore.saveCustomerPassword(customer.id, hashedPassword);

    // Issue JWT Token
    const fullName = `${customer.firstName} ${customer.lastName || ''}`.trim();

    this.dataStore.logAudit(
      customer.id,
      fullName,
      'CUSTOMER_REGISTERED',
      'Customer',
      customer.id,
      undefined,
      { mobile: customer.mobile, customerNumber: customer.customerNumber },
      `Customer ${fullName} registered/set portal password`,
    );
    const payload = {
      id: customer.id,
      sub: customer.id,
      customerId: customer.id,
      customerNumber: customer.customerNumber,
      name: fullName,
      mobile: customer.mobile,
      isCustomer: true,
      roles: ['CUSTOMER'],
    };

    const token = await this.jwtService.signAsync(payload, { expiresIn: CUSTOMER_SESSION_EXPIRY });

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

    let isMatch = record.otp === otp;
    if (!isMatch && record.reqId) {
      isMatch = await this.verifyWithMsg91(cleanMobile, otp, record.reqId);
    }

    if (!isMatch) {
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
      id: customer.id,
      sub: customer.id,
      customerId: customer.id,
      customerNumber: customer.customerNumber,
      name: fullName,
      mobile: customer.mobile,
      isCustomer: true,
      roles: ['CUSTOMER'],
    };

    const token = await this.jwtService.signAsync(payload, { expiresIn: CUSTOMER_SESSION_EXPIRY });

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
  async loginWithPassword(
    @Body() body: { mobile?: string; password?: string },
    @Req() req: any,
  ) {
    await this.dataStore.refreshIfStale();

    const cleanMobile = (body.mobile || '').replace(/\D/g, '').slice(-10);
    const password = body.password?.trim();

    if (!cleanMobile || !password) {
      throw new BadRequestException('Please provide your mobile number and password');
    }

    const rawFwd = req?.headers?.['x-forwarded-for'];
    const clientIp = (typeof rawFwd === 'string' ? rawFwd.split(',')[0].trim() : Array.isArray(rawFwd) ? rawFwd[0] : req?.ip) || '127.0.0.1';
    const rateLimitKey = `${clientIp}:${cleanMobile}`;
    const now = Date.now();

    const attemptRecord = portalLoginAttemptsMap.get(rateLimitKey);
    if (attemptRecord) {
      if (attemptRecord.lockUntil > now) {
        const remainingMins = Math.ceil((attemptRecord.lockUntil - now) / 60000);
        throw new HttpException(
          `Too many failed password attempts. Access temporarily locked for ${remainingMins} minute(s) for your account protection. Please sign in via Mobile OTP.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (now - attemptRecord.firstAttempt > PORTAL_WINDOW_DURATION_MS) {
        portalLoginAttemptsMap.delete(rateLimitKey);
      }
    }

    const customer = this.dataStore.customers.find((c) => {
      const cMob = (c.mobile || '').replace(/\D/g, '').slice(-10);
      return cMob === cleanMobile;
    });

    if (!customer) {
      const record = portalLoginAttemptsMap.get(rateLimitKey) || { attempts: 0, lockUntil: 0, firstAttempt: now };
      record.attempts += 1;
      if (record.attempts >= PORTAL_MAX_FAILED_ATTEMPTS) {
        record.lockUntil = now + PORTAL_LOCKOUT_DURATION_MS;
      }
      portalLoginAttemptsMap.set(rateLimitKey, record);

      const remaining = Math.max(0, PORTAL_MAX_FAILED_ATTEMPTS - record.attempts);
      throw new UnauthorizedException(
        remaining > 0
          ? `Invalid login credentials. ${remaining} attempt(s) remaining before temporary lockout.`
          : 'Too many failed login attempts. Access locked for 15 minutes. Please sign in with OTP.',
      );
    }

    const customPass = this.dataStore.getCustomerPassword(customer.id);
    if (!customPass) {
      throw new UnauthorizedException('No password set for this account yet. Please log in with OTP first to create your secure password.');
    }

    let isValidPass = false;
    if (/^\$2[aby]\$\d{2}\$/.test(customPass)) {
      isValidPass = bcrypt.compareSync(password, customPass);
    } else {
      // Legacy plain text check with transparent upgrade
      isValidPass = customPass === password;
      if (isValidPass) {
        const upgraded = bcrypt.hashSync(password, 10);
        await this.dataStore.saveCustomerPassword(customer.id, upgraded);
      }
    }

    if (!isValidPass) {
      const record = portalLoginAttemptsMap.get(rateLimitKey) || { attempts: 0, lockUntil: 0, firstAttempt: now };
      record.attempts += 1;
      if (record.attempts >= PORTAL_MAX_FAILED_ATTEMPTS) {
        record.lockUntil = now + PORTAL_LOCKOUT_DURATION_MS;
      }
      portalLoginAttemptsMap.set(rateLimitKey, record);

      this.dataStore.logAudit(
        'SYSTEM_SECURITY',
        customer.customerNumber || cleanMobile,
        'FAILED_PORTAL_PASSWORD_LOGIN',
        'Customer',
        customer.id,
        undefined,
        { clientIp, attempts: record.attempts },
        `Failed password login for customer ${cleanMobile} (Attempt ${record.attempts}/${PORTAL_MAX_FAILED_ATTEMPTS})`,
      );

      const remaining = Math.max(0, PORTAL_MAX_FAILED_ATTEMPTS - record.attempts);
      throw new UnauthorizedException(
        remaining > 0
          ? `Incorrect password. ${remaining} attempt(s) remaining before temporary lockout.`
          : 'Too many failed password attempts. Access locked for 15 minutes. Please sign in with OTP.',
      );
    }

    portalLoginAttemptsMap.delete(rateLimitKey);

    const fullName = `${customer.firstName} ${customer.lastName || ''}`.trim();
    const payload = {
      id: customer.id,
      sub: customer.id,
      customerId: customer.id,
      customerNumber: customer.customerNumber,
      name: fullName,
      mobile: customer.mobile,
      isCustomer: true,
      roles: ['CUSTOMER'],
    };

    const token = await this.jwtService.signAsync(payload, { expiresIn: CUSTOMER_SESSION_EXPIRY });

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
  async login(
    @Body() body: { identifier?: string; password?: string },
    @Req() req: any,
  ) {
    await this.dataStore.refreshIfStale();

    const { identifier, password } = body;
    if (!identifier || !password) {
      throw new BadRequestException('Please provide your Customer ID or Mobile Number and Password');
    }

    const rawFwd = req?.headers?.['x-forwarded-for'];
    const clientIp = (typeof rawFwd === 'string' ? rawFwd.split(',')[0].trim() : Array.isArray(rawFwd) ? rawFwd[0] : req?.ip) || '127.0.0.1';
    const rateLimitKey = `${clientIp}:${identifier.trim().toLowerCase()}`;
    const now = Date.now();

    const attemptRecord = portalLoginAttemptsMap.get(rateLimitKey);
    if (attemptRecord) {
      if (attemptRecord.lockUntil > now) {
        const remainingMins = Math.ceil((attemptRecord.lockUntil - now) / 60000);
        throw new HttpException(
          `Too many failed password attempts. Access temporarily locked for ${remainingMins} minute(s) for your account protection. Please sign in via Mobile OTP.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (now - attemptRecord.firstAttempt > PORTAL_WINDOW_DURATION_MS) {
        portalLoginAttemptsMap.delete(rateLimitKey);
      }
    }

    const cleanId = identifier.trim().toLowerCase();
    const customer = this.dataStore.customers.find(
      (c) =>
        c.customerNumber?.toLowerCase() === cleanId ||
        c.id?.toLowerCase() === cleanId ||
        c.mobile?.replace(/\D/g, '').endsWith(cleanId.replace(/\D/g, '')),
    );

    if (!customer) {
      const record = portalLoginAttemptsMap.get(rateLimitKey) || { attempts: 0, lockUntil: 0, firstAttempt: now };
      record.attempts += 1;
      if (record.attempts >= PORTAL_MAX_FAILED_ATTEMPTS) {
        record.lockUntil = now + PORTAL_LOCKOUT_DURATION_MS;
      }
      portalLoginAttemptsMap.set(rateLimitKey, record);

      const remaining = Math.max(0, PORTAL_MAX_FAILED_ATTEMPTS - record.attempts);
      throw new UnauthorizedException(
        remaining > 0
          ? `Invalid login credentials. ${remaining} attempt(s) remaining before temporary lockout.`
          : 'Too many failed login attempts. Access locked for 15 minutes. Please sign in with OTP.',
      );
    }

    const customPass = this.dataStore.getCustomerPassword(customer.id);
    if (!customPass) {
      throw new UnauthorizedException(
        'No password has been set for this account yet. Please sign in via Mobile OTP to verify your identity and set a password.',
      );
    }

    let isValidPass = false;
    if (/^\$2[aby]\$\d{2}\$/.test(customPass)) {
      isValidPass = bcrypt.compareSync(password, customPass);
    } else {
      isValidPass = customPass === password;
      if (isValidPass) {
        const upgraded = bcrypt.hashSync(password, 10);
        await this.dataStore.saveCustomerPassword(customer.id, upgraded);
      }
    }

    if (!isValidPass) {
      const record = portalLoginAttemptsMap.get(rateLimitKey) || { attempts: 0, lockUntil: 0, firstAttempt: now };
      record.attempts += 1;
      if (record.attempts >= PORTAL_MAX_FAILED_ATTEMPTS) {
        record.lockUntil = now + PORTAL_LOCKOUT_DURATION_MS;
      }
      portalLoginAttemptsMap.set(rateLimitKey, record);

      this.dataStore.logAudit(
        'SYSTEM_SECURITY',
        customer.customerNumber || cleanId,
        'FAILED_PORTAL_PASSWORD_LOGIN',
        'Customer',
        customer.id,
        undefined,
        { clientIp, attempts: record.attempts },
        `Failed password login for customer ${cleanId} (Attempt ${record.attempts}/${PORTAL_MAX_FAILED_ATTEMPTS})`,
      );

      const remaining = Math.max(0, PORTAL_MAX_FAILED_ATTEMPTS - record.attempts);
      throw new UnauthorizedException(
        remaining > 0
          ? `Invalid login credentials. ${remaining} attempt(s) remaining before temporary lockout.`
          : 'Too many failed login attempts. Access locked for 15 minutes. Please sign in with OTP.',
      );
    }

    portalLoginAttemptsMap.delete(rateLimitKey);

    const fullName = `${customer.firstName} ${customer.lastName || ''}`.trim();
    const payload = {
      id: customer.id,
      sub: customer.id,
      customerId: customer.id,
      customerNumber: customer.customerNumber,
      name: fullName,
      mobile: customer.mobile,
      isCustomer: true,
      roles: ['CUSTOMER'],
    };

    const token = await this.jwtService.signAsync(payload, { expiresIn: CUSTOMER_SESSION_EXPIRY });

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
        alternateMobile: customer.alternateMobile,
        email: customer.email,
        aadhaar: (customer as any).aadhaar && (customer as any).aadhaar.length >= 4
          ? '•••• •••• ' + (customer as any).aadhaar.replace(/\D/g, '').slice(-4)
          : '•••• •••• ' + (customer.mobile ? customer.mobile.slice(-4) : '1234'),
        pan: (customer as any).pan && (customer as any).pan.length === 10
          ? '•••••' + (customer as any).pan.slice(5)
          : '•••••' + (customer.mobile ? customer.mobile.slice(-4) : '1234') + 'F',
        fatherOrSpouseName: customer.fatherOrSpouseName || 'Not Specified',
        dateOfBirth: customer.dateOfBirth || '1990-01-01',
        gender: customer.gender || 'MALE',
        address: customer.addressLine1 || 'Address not specified',
        addressLine2: customer.addressLine2,
        city: customer.city || 'Delhi',
        state: customer.state || 'Delhi',
        postalCode: customer.postalCode || '110086',
        kycStatus: customer.kycStatus || 'VERIFIED',
        status: customer.status || 'ACTIVE',
        joiningDate: customer.joiningDate || (customer.createdAt ? customer.createdAt.split('T')[0] : '2026-01-01'),
        branchId: customer.branchId || 'BR-001',
        branchCode: customer.branchCode || 'SJF-BR001',
        branchName: customer.branchName || 'Head Office - Main Branch (Delhi)',
        createdAt: customer.createdAt,
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
    await this.dataStore.persistComplaint(newComplaint);

    this.dataStore.logAudit(
      customer.id,
      `${customer.firstName} ${customer.lastName || ''}`.trim(),
      'COMPLAINT_SUBMITTED',
      'Complaint',
      newComplaint.id,
      undefined,
      newComplaint,
      `Customer filed grievance ${complaintNumber}: ${body.category}`,
    );

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
    if (!body.newPassword || body.newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long');
    }

    const storedPass = this.dataStore.getCustomerPassword(customerId);
    if (storedPass) {
      if (!body.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }
      const isValid = /^\$2[aby]\$\d{2}\$/.test(storedPass)
        ? bcrypt.compareSync(body.currentPassword, storedPass)
        : storedPass === body.currentPassword;
      if (!isValid) {
        throw new UnauthorizedException('Current password does not match. Please enter your existing password correctly.');
      }
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
    const otp = randomInt(1000, 10000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpStore.set(cleanMobile, {
      otp,
      customerId: customer.id,
      expiresAt,
      attempts: 0,
    });

    await this.dispatchMsg91Otp(cleanMobile, otp);
    const allowDevOtp = process.env.ALLOW_DEV_OTP === 'true' && process.env.NODE_ENV !== 'production';

    return {
      success: true,
      message: `Verification OTP sent to +91 ******${cleanMobile.slice(-4)} via SMS.`,
      data: {
        devOtp: allowDevOtp ? otp : undefined,
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

    if (newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long for banking account security');
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
      record.attempts += 1;
      if (record.attempts >= 4) {
        otpStore.delete(cleanMobile);
        throw new BadRequestException('Too many incorrect attempts. Please request a new OTP.');
      }
      throw new BadRequestException(`Incorrect OTP verification code. ${4 - record.attempts} attempt(s) remaining.`);
    }

    otpStore.delete(cleanMobile);
    await this.dataStore.saveCustomerPassword(customer.id, newPassword);

    return {
      success: true,
      message: 'Your account password has been updated successfully!',
    };
  }
}
