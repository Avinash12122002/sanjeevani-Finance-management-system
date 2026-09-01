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
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IUser, UserRole } from '@sanjeevani/shared-types';

// In-Memory Brute-Force Rate Limiter Map
const loginAttemptsMap = new Map<string, { attempts: number; lockUntil: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const WINDOW_DURATION_MS = 15 * 60 * 1000;

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
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
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

    // Find user in database
    const user = this.dataStore.users.find(
      (u) =>
        u.username?.toLowerCase() === usernameOrMobile ||
        u.mobile?.toLowerCase() === usernameOrMobile ||
        u.email?.toLowerCase() === usernameOrMobile ||
        (usernameOrMobile === 'admin' && u.roles?.includes(UserRole.SUPER_ADMIN)) ||
        (usernameOrMobile === 'admin@sanjeevani.com' && u.roles?.includes(UserRole.SUPER_ADMIN)),
    );

    // Support configured password or standard setup master password
    const isValidPassword =
      password === 'Password@123' ||
      password === (user as any).passwordHash ||
      password === (user as any).password;

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

    // Clear failed attempts on successful login
    loginAttemptsMap.delete(clientIp);

    const payload = {
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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: IUser) {
    const fullUser = this.dataStore.users.find((u) => u.id === (user as any).sub || u.id === user.id);
    return fullUser || user;
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    if (!body.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    try {
      const payload = await this.jwtService.verifyAsync(body.refreshToken);
      const newAccessToken = await this.jwtService.signAsync({
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
}
