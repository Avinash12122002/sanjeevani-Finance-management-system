import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IEmployee, IUser } from '@sanjeevani/shared-types';

@Controller('api/v1/employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private dataStore: DataStoreService) {}

  @Get()
  getEmployees() {
    return this.dataStore.employees;
  }

  @Post()
  createEmployee(@Body() body: Partial<IEmployee>, @CurrentUser() user: IUser) {
    const employeeNumber = this.dataStore.nextEmployeeNumber();
    const newEmp: IEmployee = {
      id: `EMP-${Date.now()}`,
      employeeNumber,
      branchId: body.branchId || 'BR-001',
      branchCode: 'SJF-BR001',
      branchName: 'Head Office Agra',
      name: body.name || 'Employee Name',
      mobile: body.mobile || '9876500000',
      email: body.email,
      designation: body.designation || 'LOAN_OFFICER',
      joiningDate: new Date().toISOString().split('T')[0],
      salary: Number(body.salary) || 25000,
      employmentStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    this.dataStore.employees.push(newEmp);
    return newEmp;
  }
}
