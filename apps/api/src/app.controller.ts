import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
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
