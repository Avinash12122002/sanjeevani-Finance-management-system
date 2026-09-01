import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IEmployee, IUser, UserRole } from '@sanjeevani/shared-types';

@Controller('api/v1/employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private dataStore: DataStoreService) {}

  @Get()
  getEmployees() {
    return this.dataStore.employees;
  }

  @Post()
  createEmployee(@Body() body: any, @CurrentUser() user: IUser) {
    const employeeNumber = this.dataStore.nextEmployeeNumber();
    const branch = this.dataStore.branches.find((b) => b.id === body.branchId) || this.dataStore.branches[0];

    const newEmp: IEmployee = {
      id: `EMP-${Date.now()}`,
      employeeNumber,
      branchId: branch ? branch.id : 'BR-001',
      branchCode: branch ? branch.branchCode : 'SJF-BR001',
      branchName: branch ? branch.name : 'Head Office Agra',
      name: body.name || 'Staff Member',
      mobile: body.mobile || '9876500000',
      email: body.email || `${body.name?.toLowerCase().replace(/\s+/g, '')}@sanjeevanifinance.com`,
      designation: body.designation || 'LOAN_OFFICER',
      joiningDate: body.joiningDate || new Date().toISOString().split('T')[0],
      salary: Number(body.salary) || 25000,
      employmentStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    this.dataStore.employees.push(newEmp);

    // Map designation to UserRole
    let assignedRole: UserRole = UserRole.LOAN_OFFICER;
    const des = (body.designation || '').toUpperCase();
    if (des.includes('BRANCH') || des.includes('MANAGER')) assignedRole = UserRole.BRANCH_MANAGER;
    else if (des.includes('CASH') || des.includes('TELLER')) assignedRole = UserRole.CASHIER;
    else if (des.includes('ACCOUNT')) assignedRole = UserRole.ACCOUNTANT;
    else if (des.includes('RECOVERY')) assignedRole = UserRole.RECOVERY_OFFICER;
    else if (des.includes('ADMIN') || des.includes('DIRECTOR')) assignedRole = UserRole.SUPER_ADMIN;

    // Create associated login user
    const newUser: IUser = {
      id: `USR-${Date.now()}`,
      username: body.username || newEmp.email?.split('@')[0] || newEmp.mobile,
      email: newEmp.email,
      mobile: newEmp.mobile,
      roles: [assignedRole],
      branchId: newEmp.branchId,
      branchName: newEmp.branchName,
      employeeId: newEmp.id,
      employeeName: newEmp.name,
      isActive: true,
      is2faEnabled: false,
      createdAt: new Date().toISOString(),
    };

    this.dataStore.users.push(newUser);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || user.username,
      'STAFF_CREATED',
      'Employee',
      newEmp.id,
      undefined,
      { employeeNumber: newEmp.employeeNumber, role: assignedRole },
    );

    return { employee: newEmp, user: newUser };
  }
}
