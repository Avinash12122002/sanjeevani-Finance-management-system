import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StaffGuard } from '../../common/guards/staff.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IUser, CustomerStatus, KYCStatus, RiskCategory, AccountStatus, ProductType, UserRole } from '@sanjeevani/shared-types';

export interface IImportValidationRow {
  rowNumber: number;
  data: Record<string, any>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Controller('api/v1/import')
@UseGuards(JwtAuthGuard, StaffGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.GENERAL_MANAGER)
export class ImportController {
  constructor(private dataStore: DataStoreService) {}

  /**
   * Download CSV Templates (SRS §50 Step 2)
   */
  @Get('template/:entityType')
  getTemplate(@Param('entityType') entityType: string) {
    if (entityType === 'customers') {
      return {
        headers: ['fullName', 'mobile', 'dateOfBirth', 'gender', 'aadhaar', 'pan', 'address', 'city', 'state', 'pinCode'],
        sampleRows: [
          ['Rajesh Kumar', '9876543210', '1985-05-15', 'MALE', '123456789012', 'ABCDE1234F', 'H.No 123 Sector 4', 'Delhi', 'Delhi', '110086'],
          ['Sunita Devi', '9812345678', '1990-08-20', 'FEMALE', '987654321098', 'XYZPA9876K', 'Main Market Road', 'Delhi', 'Delhi', '110086'],
        ],
      };
    } else if (entityType === 'accounts') {
      return {
        headers: ['customerNumber', 'productType', 'monthlyDepositOrBalance', 'tenureMonths', 'nomineeName', 'nomineeRelation'],
        sampleRows: [
          ['SJF-000001', 'RD', '1000', '12', 'Kavita Kumar', 'SPOUSE'],
          ['SJF-000002', 'TERM_DEPOSIT', '50000', '24', 'Ramesh Devi', 'SON'],
        ],
      };
    } else if (entityType === 'loans') {
      return {
        headers: ['customerNumber', 'principalAmount', 'interestRate', 'tenureMonths', 'purpose'],
        sampleRows: [
          ['SJF-000001', '50000', '12', '12', 'Small Business Expansion'],
        ],
      };
    }
    throw new BadRequestException('Supported template types: customers, accounts, loans');
  }

  /**
   * Pre-import Validation Engine (SRS §50 Step 4 & 6)
   */
  @Post('validate')
  async validateImport(
    @Body() body: { entityType: 'customers' | 'accounts' | 'loans'; rows: Record<string, any>[] },
  ) {
    await this.dataStore.refreshIfStale();

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      throw new BadRequestException('Please provide a valid array of rows to validate.');
    }

    const report: IImportValidationRow[] = [];
    const seenMobiles = new Set<string>();

    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i];
      const errors: string[] = [];
      const warnings: string[] = [];

      if (body.entityType === 'customers') {
        if (!row.fullName || row.fullName.trim().length < 2) errors.push('Missing or invalid fullName');
        if (!row.mobile || !/^\d{10}$/.test(String(row.mobile).trim())) {
          errors.push('Mobile must be exactly 10 digits');
        } else {
          const m = String(row.mobile).trim();
          if (seenMobiles.has(m)) errors.push(`Duplicate mobile within import file: ${m}`);
          seenMobiles.add(m);

          const existingInDb = this.dataStore.customers.find((c) => c.mobile === m);
          if (existingInDb) errors.push(`Customer already registered with mobile: ${m}`);
        }
      } else if (body.entityType === 'accounts') {
        if (!row.customerNumber) errors.push('customerNumber is required');
        else {
          const cust = this.dataStore.customers.find((c) => c.customerNumber === row.customerNumber);
          if (!cust) errors.push(`Customer number not found: ${row.customerNumber}`);
        }
        if (!row.productType) errors.push('productType (RD, SAVINGS, TERM_DEPOSIT) is required');
      }

      report.push({
        rowNumber: i + 1,
        data: row,
        isValid: errors.length === 0,
        errors,
        warnings,
      });
    }

    const totalValid = report.filter((r) => r.isValid).length;
    const totalInvalid = report.filter((r) => !r.isValid).length;

    return {
      entityType: body.entityType,
      totalRows: body.rows.length,
      totalValid,
      totalInvalid,
      readyToCommit: totalInvalid === 0,
      report,
    };
  }

  /**
   * Commit Validated Import Batch (SRS §50 Step 7 & 8)
   */
  @Post('commit')
  async commitImport(
    @Body() body: { entityType: 'customers' | 'accounts'; rows: Record<string, any>[] },
    @CurrentUser() user: IUser,
  ) {
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      throw new BadRequestException('No rows provided for commitment.');
    }

    let createdCount = 0;

    if (body.entityType === 'customers') {
      for (const row of body.rows) {
        const customerNumber = this.dataStore.nextCustomerNumber();
        const newCust: any = {
          id: `CUST-${Date.now()}-${createdCount}`,
          customerNumber,
          branchId: user.branchId || 'BR-001',
          branchCode: 'SJF-BR001',
          branchName: 'Head Office - Main Branch',
          firstName: row.fullName?.split(' ')[0] || row.fullName,
          lastName: row.fullName?.split(' ').slice(1).join(' ') || '',
          fatherOrSpouseName: row.fatherOrSpouseName || 'Not Specified',
          dateOfBirth: row.dateOfBirth || '1990-01-01',
          gender: row.gender || 'MALE',
          mobile: String(row.mobile).trim(),
          addressLine1: row.address || 'Imported Address',
          city: row.city || 'Delhi',
          state: row.state || 'Delhi',
          postalCode: row.pinCode || '110086',
          status: CustomerStatus.ACTIVE,
          kycStatus: KYCStatus.PENDING,
          riskCategory: RiskCategory.LOW,
          createdBy: user.id || 'USR-001',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        this.dataStore.customers.push(newCust);
        await this.dataStore.persistCustomer(newCust);
        createdCount++;
      }
    }

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Administrator',
      'BULK_DATA_MIGRATION_COMMITTED',
      'DataMigration',
      body.entityType,
      undefined,
      { count: createdCount },
      `Committed ${createdCount} imported records for ${body.entityType} (SRS §50).`,
    );

    return {
      success: true,
      message: `Successfully migrated and imported ${createdCount} ${body.entityType} into Sanjeevani system.`,
      committedCount: createdCount,
    };
  }
}
