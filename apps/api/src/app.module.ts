import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as path from 'path';

import { DataStoreService } from './database/data-store.service';
import { SmsNotificationService } from './shared/sms-notification.service';
import { SmsCronService } from './shared/sms-cron.service';
import { AppController } from './app.controller';
import { AuthController } from './modules/auth/auth.controller';
import { CustomersController } from './modules/customers/customers.controller';
import { ProductsController } from './modules/products/products.controller';
import { AccountsController } from './modules/accounts/accounts.controller';
import { LoansController } from './modules/loans/loans.controller';
import { CollectionsController } from './modules/collections/collections.controller';
import { TransactionsController } from './modules/transactions/transactions.controller';
import { CashController } from './modules/cash/cash.controller';
import { AccountingController } from './modules/accounting/accounting.controller';
import { DailyClosingController } from './modules/daily-closing/daily-closing.controller';
import { DashboardsController } from './modules/dashboards/dashboards.controller';
import { BranchesController } from './modules/branches/branches.controller';
import { EmployeesController } from './modules/employees/employees.controller';
import { HrController } from './modules/employees/hr.controller';
import { PayrollController } from './modules/employees/payroll.controller';
import { ComplaintsController } from './modules/complaints/complaints.controller';
import { CustomerPortalController } from './modules/customer-portal/customer-portal.controller';
import { VerificationController } from './modules/transactions/verification.controller';
import { AuditController } from './modules/audit/audit.controller';
import { DatabaseController } from './modules/database/database.controller';
import { ImportController } from './modules/database/import.controller';
import { DocumentsController } from './modules/documents/documents.controller';
import { CommitteesController } from './modules/committees/committees.controller';
import { EmojiSanitizerMiddleware } from './common/middleware/emoji-sanitizer.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(__dirname, '../../.env'),
        path.resolve(__dirname, '../../../../.env'),
        '.env',
      ],
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'sanjeevani-finance-jwt-super-secret-key-2026',
      signOptions: { expiresIn: '12h' },
    }),
    ScheduleModule.forRoot(), // Enables cron jobs for SMS reminders, DPD update, maturity processing
  ],
  controllers: [
    AppController,
    AuthController,
    CustomersController,
    ProductsController,
    AccountsController,
    LoansController,
    CollectionsController,
    TransactionsController,
    VerificationController,
    CashController,
    AccountingController,
    DailyClosingController,
    DashboardsController,
    BranchesController,
    EmployeesController,
    HrController,
    PayrollController,
    ComplaintsController,
    CustomerPortalController,
    AuditController,
    DatabaseController,
    ImportController,
    DocumentsController,
    CommitteesController,
  ],
  providers: [
    DataStoreService,
    SmsNotificationService, // SRS §24 business-event SMS notifications
    SmsCronService,         // Scheduled: EMI reminders, maturity alerts, DPD auto-update
  ],
  exports: [DataStoreService, SmsNotificationService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(EmojiSanitizerMiddleware).forRoutes('*');
  }
}

