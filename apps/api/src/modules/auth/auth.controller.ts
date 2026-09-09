import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Patch,
  Delete,
  Param,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IUser, UserRole } from '@sanjeevani/shared-types';
import { randomBytes, randomInt } from 'crypto';

import * as bcrypt from 'bcryptjs';

// In-Memory Brute-Force Rate Limiter Map
const loginAttemptsMap = new Map<string, { attempts: number; lockUntil: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const WINDOW_DURATION_MS = 15 * 60 * 1000;

// In-Memory 2FA Challenge Store
const twoFactorChallengeStore = new Map<
  string,
  {
    userId: string;
    otp: string;
    expiresAt: number;
    attempts: number;
    lastSentAt: number;
    clientIp: string;
  }
>();

// Periodically evict expired challenges to prevent unbounded memory growth
function pruneExpiredChallenges() {
  const now = Date.now();
  for (const [id, item] of twoFactorChallengeStore.entries()) {
    if (item.expiresAt < now) {
      twoFactorChallengeStore.delete(id);
    }
  }
}

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private dataStore: DataStoreService,
    private jwtService: JwtService,
  ) {}

  @Post('login')
  async login(
    @Body() body: { username?: string; password?: string; mobile?: string },
    @Req() req: Request,
  ) {
    const rawFwd = req.headers['x-forwarded-for'];
    const clientIp = (typeof rawFwd === 'string' ? rawFwd.split(',')[0].trim() : Array.isArray(rawFwd) ? rawFwd[0] : req.ip) || '127.0.0.1';
    const now = Date.now();

    // 1. Check Brute-Force Lockout
    const attemptRecord = loginAttemptsMap.get(clientIp);
    if (attemptRecord) {
      if (attemptRecord.lockUntil > now) {
        const remainingMinutes = Math.ceil((attemptRecord.lockUntil - now) / 60000);
        throw new HttpException(
          `Too many failed login attempts. IP temporarily locked for ${remainingMinutes} more minute(s) to protect system integrity.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      // Reset if window expired
      if (now - attemptRecord.firstAttempt > WINDOW_DURATION_MS) {
        loginAttemptsMap.delete(clientIp);
      }
    }

    const usernameOrMobile = (body.username || body.mobile || '').trim().toLowerCase();
    const password = body.password || '';

    await this.dataStore.refreshIfStale();

    // Find user in database
    const user = this.dataStore.users.find(
      (u) =>
        u.username?.toLowerCase() === usernameOrMobile ||
        u.mobile?.toLowerCase() === usernameOrMobile ||
        u.email?.toLowerCase() === usernameOrMobile ||
        (usernameOrMobile === 'admin' && u.roles?.includes(UserRole.SUPER_ADMIN)) ||
        (usernameOrMobile === 'admin@sanjeevani.com' && u.roles?.includes(UserRole.SUPER_ADMIN)) ||
        (usernameOrMobile === 'owner_admin' && u.roles?.includes(UserRole.SUPER_ADMIN)) ||
        (usernameOrMobile === 'owner@sanjeevanifinance.com' && u.roles?.includes(UserRole.SUPER_ADMIN)),
    );

    // Secure password verification with bcrypt & transparent upgrade
    const storedHash = user ? ((user as any).passwordHash || (user as any).password) : null;
    let isValidPassword = false;

    if (user && storedHash) {
      if (/^\$2[aby]\$\d{2}\$/.test(storedHash)) {
        isValidPassword = bcrypt.compareSync(password, storedHash);
      } else {
        // Transparent migration: verify plain seed, then immediately upgrade to bcrypt
        isValidPassword = password === storedHash;
        if (isValidPassword) {
          const newHash = bcrypt.hashSync(password, 10);
          (user as any).passwordHash = newHash;
          await this.dataStore.persistUser(user);
        }
      }
    } else if (user && password === 'Password@123' && (user.username === 'admin' || user.email === 'admin@sanjeevani.com')) {
      // First-time bootstrap for default admin seed
      isValidPassword = true;
      const newHash = bcrypt.hashSync(password, 10);
      (user as any).passwordHash = newHash;
      await this.dataStore.persistUser(user);
    }

    if (!user || !isValidPassword) {
      // Record Failed Attempt
      const record = loginAttemptsMap.get(clientIp) || { attempts: 0, lockUntil: 0, firstAttempt: now };
      record.attempts += 1;
      if (record.attempts >= MAX_ATTEMPTS) {
        record.lockUntil = now + LOCKOUT_DURATION_MS;
      }
      loginAttemptsMap.set(clientIp, record);

      // Audit Log Failed Login (§51)
      this.dataStore.logAudit(
        'SYSTEM_SECURITY',
        usernameOrMobile || 'Anonymous User',
        'FAILED_LOGIN_ATTEMPT',
        'User',
        user ? user.id : 'UNREGISTERED_ACCOUNT',
        undefined,
        {
          attemptTime: new Date().toISOString(),
          clientIp,
          userAgent: req.headers['user-agent'] || 'Unknown Device / Browser',
          status: 'FAILED_REJECTED',
          attemptsCount: record.attempts,
        },
        `Failed login attempt for account "${usernameOrMobile}" from IP ${clientIp} (Attempt ${record.attempts}/${MAX_ATTEMPTS})`,
      );

      const remainingAttempts = Math.max(0, MAX_ATTEMPTS - record.attempts);
      throw new UnauthorizedException(
        remainingAttempts > 0
          ? `Invalid login credentials. ${remainingAttempts} attempt(s) remaining before temporary lockout.`
          : 'Too many failed login attempts. Account temporarily locked for 15 minutes.',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is currently disabled. Contact Super Admin.');
    }

    // Clear failed attempts on successful credentials check
    loginAttemptsMap.delete(clientIp);

    // 2. Intercept for Two-Factor Authentication (2FA) if enabled (§39)
    if (user.is2faEnabled) {
      pruneExpiredChallenges();
      const challengeId = `2FA-${Date.now()}-${randomBytes(8).toString('hex')}`;
      const otp = randomInt(100000, 1000000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000;

      twoFactorChallengeStore.set(challengeId, {
        userId: user.id,
        otp,
        expiresAt,
        attempts: 0,
        lastSentAt: Date.now(),
        clientIp,
      });

      const maskedMobile = user.mobile
        ? `${user.mobile.slice(0, 2)}******${user.mobile.slice(-2)}`
        : 'registered mobile';

      this.dataStore.logAudit(
        user.id,
        user.employeeName || user.username,
        '2FA_CHALLENGE_ISSUED',
        'User',
        user.id,
        undefined,
        { challengeId, clientIp },
        `2FA OTP dispatched for ${user.username} (Mobile: ${maskedMobile})`,
      );

      return {
        message: 'Two-Factor Authentication required. Enter the 6-digit OTP.',
        data: {
          require2fa: true,
          challengeId,
          mobile: maskedMobile,
          devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
        },
      };
    }

    const payload = {
      id: user.id,
      sub: user.id,
      username: user.username,
      roles: user.roles,
      branchId: user.branchId,
      branchName: user.branchName,
      employeeId: user.employeeId,
      employeeName: user.employeeName,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

    // Audit Log Successful Login (§51)
    this.dataStore.logAudit(
      user.id,
      user.employeeName || user.username,
      'USER_LOGIN',
      'User',
      user.id,
      undefined,
      {
        loginTime: new Date().toISOString(),
        clientIp,
        userAgent: req.headers['user-agent'] || 'Unknown Browser / OS',
        status: 'SUCCESS',
      },
      `Staff ${user.employeeName || user.username} logged in successfully from IP ${clientIp}`,
    );

    return {
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        user: {
          id: user.id,
          username: user.username,
          employeeName: user.employeeName,
          roles: user.roles,
          branchId: user.branchId,
          branchName: user.branchName,
          is2faEnabled: user.is2faEnabled,
        },
      },
    };
  }

  /**
   * VERIFY 2FA OTP (SRS §39)
   */
  @Post('verify-2fa')
  async verify2Fa(
    @Body() body: { challengeId: string; otp: string },
    @Req() req: Request,
  ) {
    if (!body.challengeId || !body.otp) {
      throw new BadRequestException('Challenge ID and OTP are required.');
    }

    const challenge = twoFactorChallengeStore.get(body.challengeId);
    if (!challenge) {
      throw new UnauthorizedException('Invalid or expired 2FA session. Please log in again.');
    }

    if (Date.now() > challenge.expiresAt) {
      twoFactorChallengeStore.delete(body.challengeId);
      throw new UnauthorizedException('2FA OTP has expired. Please log in again.');
    }

    challenge.attempts += 1;
    if (challenge.otp !== body.otp.trim()) {
      if (challenge.attempts >= 5) {
        twoFactorChallengeStore.delete(body.challengeId);
        throw new UnauthorizedException('Too many incorrect 2FA attempts. Session terminated.');
      }
      throw new UnauthorizedException(`Invalid OTP. ${5 - challenge.attempts} attempt(s) remaining.`);
    }

    // OTP verified
    twoFactorChallengeStore.delete(body.challengeId);

    const user = this.dataStore.users.find((u) => u.id === challenge.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account not found or disabled.');
    }

    const rawFwd = req.headers['x-forwarded-for'];
    const clientIp = (typeof rawFwd === 'string' ? rawFwd.split(',')[0].trim() : Array.isArray(rawFwd) ? rawFwd[0] : req.ip) || '127.0.0.1';

    const payload = {
      id: user.id,
      sub: user.id,
      username: user.username,
      roles: user.roles,
      branchId: user.branchId,
      branchName: user.branchName,
      employeeId: user.employeeId,
      employeeName: user.employeeName,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

    this.dataStore.logAudit(
      user.id,
      user.employeeName || user.username,
      '2FA_LOGIN_SUCCESS',
      'User',
      user.id,
      undefined,
      {
        loginTime: new Date().toISOString(),
        clientIp,
        status: '2FA_VERIFIED',
      },
      `Staff ${user.employeeName || user.username} completed 2FA verification from IP ${clientIp}`,
    );

    return {
      message: '2FA verification successful',
      data: {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        user: {
          id: user.id,
          username: user.username,
          employeeName: user.employeeName,
          roles: user.roles,
          branchId: user.branchId,
          branchName: user.branchName,
          is2faEnabled: user.is2faEnabled,
        },
      },
    };
  }

  /**
   * RESEND 2FA OTP (SRS §39)
   */
  @Post('resend-2fa-otp')
  async resend2FaOtp(@Body() body: { challengeId: string }) {
    if (!body.challengeId) {
      throw new BadRequestException('Challenge ID is required.');
    }

    const challenge = twoFactorChallengeStore.get(body.challengeId);
    if (!challenge || Date.now() > challenge.expiresAt) {
      if (challenge) twoFactorChallengeStore.delete(body.challengeId);
      throw new BadRequestException('2FA challenge session has expired or is invalid. Please log in again.');
    }

    const now = Date.now();
    if (now - challenge.lastSentAt < 30000) {
      const waitSec = Math.ceil((30000 - (now - challenge.lastSentAt)) / 1000);
      throw new BadRequestException(`Please wait ${waitSec} second(s) before requesting a new OTP.`);
    }

    const newOtp = randomInt(100000, 1000000).toString();
    challenge.otp = newOtp;
    challenge.expiresAt = now + 5 * 60 * 1000;
    challenge.lastSentAt = now;

    return {
      message: 'New 2FA OTP dispatched successfully.',
      data: {
        devOtp: process.env.NODE_ENV !== 'production' ? newOtp : undefined,
      },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: IUser) {
    const fullUser = this.dataStore.users.find((u) => u.id === (user as any).sub || u.id === user.id);
    const target = fullUser || user;
    const safe = { ...(target as any) };
    delete safe.passwordHash;
    return safe;
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    if (!body.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    try {
      const payload = await this.jwtService.verifyAsync(body.refreshToken);
      const newAccessToken = await this.jwtService.signAsync({
        id: payload.id || payload.sub,
        sub: payload.sub,
        username: payload.username,
        roles: payload.roles,
        branchId: payload.branchId,
        branchName: payload.branchName,
        employeeName: payload.employeeName,
      });
      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * USER ACCOUNTS CRUD MANAGEMENT
   * Restricted strictly to Super Admin and General Manager (RBAC Protection)
   */
  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.GENERAL_MANAGER)
  async getUsers() {
    await this.dataStore.refreshIfStale();
    return this.dataStore.users.map((u) => {
      const safe = { ...(u as any) };
      delete safe.passwordHash;
      return safe;
    });
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async createUser(@Body() body: any, @CurrentUser() currentUser: IUser) {
    if (!body.username || !body.username.trim()) {
      throw new BadRequestException('Username is required');
    }
    const cleanUsername = body.username.trim().toLowerCase();
    const existing = this.dataStore.users.find(
      (u) => u.username.toLowerCase() === cleanUsername || (body.email && u.email?.toLowerCase() === body.email.trim().toLowerCase())
    );
    if (existing) {
      throw new BadRequestException('User with this username or email already exists');
    }

    const rawPassword = (body.password || 'Password@123').trim();
    if (rawPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long for banking staff security compliance.');
    }

    const branch = this.dataStore.branches.find((b) => b.id === body.branchId) || this.dataStore.branches[0];

    const newUser: IUser = {
      id: `USR-${Date.now()}`,
      username: cleanUsername,
      email: body.email?.trim() || `${cleanUsername}@sanjeevanifinance.com`,
      mobile: body.mobile?.trim() || '9876500000',
      passwordHash: bcrypt.hashSync(rawPassword, 10),
      roles: Array.isArray(body.roles) && body.roles.length > 0 ? body.roles : [body.role || UserRole.LOAN_OFFICER],
      branchId: branch ? branch.id : 'BR-001',
      branchName: branch ? branch.name : 'Head Office - Main Branch',
      employeeId: body.employeeId || null,
      employeeName: body.employeeName || body.username,
      isActive: body.isActive !== false,
      is2faEnabled: false,
      createdAt: new Date().toISOString(),
    };

    this.dataStore.users.push(newUser);
    await this.dataStore.persistUser(newUser);

    this.dataStore.logAudit(
      currentUser.id,
      currentUser.employeeName || currentUser.username,
      'USER_CREATED',
      'User',
      newUser.id,
      undefined,
      { username: newUser.username, roles: newUser.roles },
      `Created login user account ${newUser.username}`,
    );

    const safe = { ...(newUser as any) };
    delete safe.passwordHash;
    return safe;
  }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async updateUser(@Param('id') id: string, @Body() body: any, @CurrentUser() currentUser: IUser) {
    const userIndex = this.dataStore.users.findIndex((u) => u.id === id || u.username === id);
    if (userIndex === -1) {
      throw new NotFoundException(`User not found for id: ${id}`);
    }

    const targetUser = this.dataStore.users[userIndex];
    const oldVal = { ...targetUser };

    // Prevent non-superadmins from revoking superadmin rights
    if (targetUser.username === 'admin' && body.isActive === false) {
      throw new BadRequestException('Primary system administrator account cannot be deactivated.');
    }

    if (body.username) targetUser.username = body.username.trim().toLowerCase();
    if (body.email) targetUser.email = body.email.trim();
    if (body.mobile) targetUser.mobile = body.mobile.trim();
    if (body.roles) targetUser.roles = Array.isArray(body.roles) ? body.roles : [body.roles];
    if (body.role) targetUser.roles = [body.role];
    if (body.isActive !== undefined) targetUser.isActive = Boolean(body.isActive);
    if (body.branchId) {
      const branch = this.dataStore.branches.find((b) => b.id === body.branchId);
      if (branch) {
        targetUser.branchId = branch.id;
        targetUser.branchName = branch.name;
      }
    }
    if (body.password && body.password.trim()) {
      if (body.password.trim().length < 8) {
        throw new BadRequestException('Password must be at least 8 characters long.');
      }
      (targetUser as any).passwordHash = bcrypt.hashSync(body.password.trim(), 10);
    }

    await this.dataStore.persistUser(targetUser);

    this.dataStore.logAudit(
      currentUser.id,
      currentUser.employeeName || currentUser.username,
      'USER_UPDATED',
      'User',
      targetUser.id,
      oldVal,
      targetUser,
      `Updated user account ${targetUser.username}`,
    );

    const safe = { ...(targetUser as any) };
    delete safe.passwordHash;
    return safe;
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async deleteUser(@Param('id') id: string, @CurrentUser() currentUser: IUser) {
    const userIndex = this.dataStore.users.findIndex((u) => u.id === id || u.username === id);
    if (userIndex === -1) {
      throw new NotFoundException(`User not found for id: ${id}`);
    }

    const targetUser = this.dataStore.users[userIndex];

    // Security check: Never delete the primary system administrator account or current active user
    if (targetUser.username === 'admin' || (targetUser.roles && targetUser.roles.includes(UserRole.SUPER_ADMIN) && this.dataStore.users.filter((u) => u.roles?.includes(UserRole.SUPER_ADMIN)).length <= 1)) {
      throw new BadRequestException('Primary system administrator account cannot be deleted.');
    }
    if (targetUser.id === currentUser.id) {
      throw new BadRequestException('You cannot delete your own active administrator session.');
    }

    const removed = this.dataStore.users.splice(userIndex, 1)[0];
    await this.dataStore.deleteUser(removed.id);

    this.dataStore.logAudit(
      currentUser.id,
      currentUser.employeeName || currentUser.username,
      'USER_DELETED',
      'User',
      removed.id,
      removed,
      undefined,
      `Deleted user account ${removed.username}`,
    );

    return { message: `User account ${removed.username} deleted successfully`, id: removed.id };
  }
}
