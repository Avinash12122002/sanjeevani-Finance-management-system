import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import {
  CashDrawerStatus,
  ICashDrawer,
  IUser,
} from '@sanjeevani/shared-types';

@Controller('api/v1/cash-drawers')
@UseGuards(JwtAuthGuard)
export class CashController {
  constructor(private dataStore: DataStoreService) {}

  @Get('current')
  getCurrentDrawer(@CurrentUser() user: IUser) {
    const today = new Date().toISOString().split('T')[0];
    let drawer = this.dataStore.cashDrawers.find((d) => d.businessDate === today && d.status === CashDrawerStatus.OPEN);

    if (!drawer) {
      // Auto-initialize day drawer if not found
      drawer = {
        id: `CD-${Date.now()}`,
        branchId: user.branchId || 'BR-001',
        branchName: user.branchName || 'Head Office Agra',
        cashierId: user.id || 'USR-003',
        cashierName: user.employeeName || 'Pooja Singh',
        businessDate: today,
        openingBalance: 125000,
        cashReceived: 0,
        cashPaid: 0,
        expectedClosingBalance: 125000,
        status: CashDrawerStatus.OPEN,
        openedAt: new Date().toISOString(),
      };
      this.dataStore.cashDrawers.push(drawer);
    }

    return drawer;
  }

  @Get('history')
  getDrawerHistory() {
    return this.dataStore.cashDrawers;
  }

  /**
   * Cashier Day Closing & Physical Reconciliation (SRS §33, §34, BR-006)
   */
  @Post('reconcile-close')
  reconcileAndClose(
    @Body()
    body: {
      drawerId: string;
      physicalCashCount: number;
      denominationDetails?: Record<string, number>;
      reconciliationNotes?: string;
    },
    @CurrentUser() user: IUser,
  ) {
    const drawer = this.dataStore.cashDrawers.find((d) => d.id === body.drawerId);
    if (!drawer) {
      throw new NotFoundException('Cash drawer record not found');
    }

    const physical = Number(body.physicalCashCount);
    const expected = drawer.expectedClosingBalance;
    const difference = FinancialEngine.subtract(physical, expected);

    drawer.physicalClosingBalance = physical;
    drawer.difference = difference;
    drawer.closedBy = user.id;
    drawer.closedAt = new Date().toISOString();
    drawer.reconciliationNotes = body.reconciliationNotes;

    if (difference === 0) {
      drawer.status = CashDrawerStatus.MATCHED;
    } else {
      drawer.status = CashDrawerStatus.MISMATCH;
      // Trigger Red Alert (§67)
      this.dataStore.redAlerts.unshift({
        id: `ALT-CASH-${Date.now()}`,
        alertType: 'CASH_MISMATCH',
        severity: 'CRITICAL',
        title: `Cash Drawer Mismatch Detected: ₹ ${difference}`,
        description: `Drawer for ${drawer.cashierName} closed with ${difference < 0 ? 'Shortage' : 'Excess'} of ₹ ${Math.abs(difference)}`,
        entityType: 'CashDrawer',
        entityId: drawer.id,
        amount: Math.abs(difference),
        branchId: drawer.branchId,
        branchName: drawer.branchName,
        timestamp: new Date().toISOString(),
      });
    }

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Cashier',
      'CASH_DRAWER_CLOSED',
      'CashDrawer',
      drawer.id,
      undefined,
      drawer,
      `Closed Cash Drawer. Expected: ₹ ${expected}, Physical: ₹ ${physical}, Difference: ₹ ${difference}`,
    );

    return {
      message: difference === 0 ? 'Cash drawer matched and closed successfully' : 'Cash drawer closed with discrepancy',
      drawer,
    };
  }
}
