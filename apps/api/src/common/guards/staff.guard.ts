import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@sanjeevani/shared-types';

/**
 * StaffGuard: Strictly enforces that only bank employees and system operators
 * with valid staff roles can access internal banking endpoints.
 * Explicitly rejects customer portal tokens (roles: ['CUSTOMER'] or isCustomer: true).
 */
@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Explicitly block customer portal accounts from staff operations
    if (user.isCustomer === true || (Array.isArray(user.roles) && user.roles.includes('CUSTOMER') && user.roles.length === 1)) {
      throw new ForbiddenException('Access denied: Customer accounts cannot access internal banking staff operations.');
    }

    const validStaffRoles = Object.values(UserRole) as string[];
    const userRoles: string[] = Array.isArray(user.roles) ? user.roles : [user.role || ''];

    const isStaff = userRoles.some((r) => validStaffRoles.includes(r) || r === 'SUPER_ADMIN' || r === 'ADMIN');
    if (!isStaff) {
      throw new ForbiddenException('Access denied: Valid banking staff credentials required.');
    }

    return true;
  }
}
