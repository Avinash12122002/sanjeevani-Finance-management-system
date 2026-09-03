import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';

import { DataStoreService } from './database/data-store.service';
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
import { ComplaintsController } from './modules/complaints/complaints.controller';
import { CustomerPortalController } from './modules/customer-portal/customer-portal.controller';
import { EmojiSanitizerMiddleware } from './common/middleware/emoji-sanitizer.middleware';

@Module({
  imports: [
    // Load .env from monorepo root first, then apps/api/.env overrides it.
    // This ensures DATABASE_URL and all secrets are found regardless of
    // where the process is started from (monorepo root or apps/api).
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(__dirname, '../../.env'),       // apps/api/.env  (most specific)
        path.resolve(__dirname, '../../../../.env'),  // monorepo root .env (fallback)
        '.env',                                       // CWD .env (final fallback)
      ],
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'sanjeevani-finance-jwt-super-secret-key-2026',
      signOptions: { expiresIn: '12h' },
    }),
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
    CashController,
    AccountingController,
    DailyClosingController,
    DashboardsController,
    BranchesController,
    EmployeesController,
    ComplaintsController,
    CustomerPortalController,
  ],
  providers: [DataStoreService],
  exports: [DataStoreService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(EmojiSanitizerMiddleware).forRoutes('*');
  }
}

