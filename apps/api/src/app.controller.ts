import { Controller, Get, Post } from '@nestjs/common';
import { DataStoreService } from './database/data-store.service';

@Controller()
export class AppController {
  constructor(private dataStore: DataStoreService) {}

  @Get()
  getRoot() {
    return {
      status: 'online',
      system: 'Sanjeevani Finance Management System API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      docs: '/api/v1',
    };
  }

  @Post('api/v1/sync')
  async forceDatabaseSync() {
    await this.dataStore.forceSync();
    return {
      success: true,
      message: 'PostgreSQL database state synchronized into API cache in real time.',
      timestamp: new Date().toISOString(),
      counts: {
        customers: this.dataStore.customers.length,
        accounts: this.dataStore.accounts.length,
        loans: this.dataStore.loans.length,
        products: this.dataStore.products.length,
        branches: this.dataStore.branches.length,
        employees: this.dataStore.employees.length,
      },
    };
  }

  @Get('api/v1')
  getApiV1() {
    return {
      status: 'online',
      system: 'Sanjeevani Finance Management System API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      endpoints: {
        auth: '/api/v1/auth/login',
        customers: '/api/v1/customers',
        accounts: '/api/v1/accounts',
        loans: '/api/v1/loans',
        accounting: '/api/v1/accounting',
        dashboards: '/api/v1/dashboards/executive',
      },
    };
  }
}
