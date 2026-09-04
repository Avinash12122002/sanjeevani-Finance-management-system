import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
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
  async getCurrentDrawer(@CurrentUser() user: IUser) {
    await this.dataStore.refreshIfStale();
    const today = new Date().toISOString().split('T')[0];
    let drawer = this.dataStore.cashDrawers.find((d) => d.businessDate === today && d.status === CashDrawerStatus.OPEN);

    if (!drawer) {
      // Dynamic carry-forward from last closed drawer (or 0 if none)
      const lastClosed = this.dataStore.cashDrawers
        .filter((d) => d.status === CashDrawerStatus.MATCHED || d.status === CashDrawerStatus.MISMATCH || (d.status as any) === 'CLOSED')
        .sort((a, b) => (b.openedAt || '').localeCompare(a.openedAt || ''))[0];
      const carryForwardBalance = lastClosed ? Number(lastClosed.physicalClosingBalance ?? lastClosed.expectedClosingBalance ?? 0) : 0;

      drawer = {
        id: `CD-${Date.now()}`,
        branchId: user.branchId || 'BR-001',
        branchName: user.branchName || 'Head Office Agra',
        cashierId: user.id || 'USR-003',
        cashierName: user.employeeName || 'Cashier',
        businessDate: today,
        openingBalance: carryForwardBalance,
        cashReceived: 0,
        cashPaid: 0,
        expectedClosingBalance: carryForwardBalance,
        status: CashDrawerStatus.OPEN,
        openedAt: new Date().toISOString(),
      };
      this.dataStore.cashDrawers.unshift(drawer);
      await this.dataStore.persistCashDrawer(drawer);
    }

    return drawer;
  }

  @Post('open')
  async openDrawer(
    @Body() body: { openingBalance?: number; branchId?: string },
    @CurrentUser() user: IUser,
  ) {
    await this.dataStore.refreshIfStale();
    const today = new Date().toISOString().split('T')[0];
    const existing = this.dataStore.cashDrawers.find((d) => d.businessDate === today && d.status === CashDrawerStatus.OPEN);
    if (existing) {
      return existing;
    }
    const opening = Number(body.openingBalance) || 0;
    const branch = this.dataStore.branches.find((b) => b.id === (body.branchId || user.branchId)) || this.dataStore.branches[0];
    const newDrawer: ICashDrawer = {
      id: `CD-${Date.now()}`,
      branchId: branch?.id || 'BR-001',
      branchName: branch?.name || 'Head Office Agra',
      cashierId: user.id || 'USR-001',
      cashierName: user.employeeName || user.username || 'Cashier',
      businessDate: today,
      openingBalance: opening,
      cashReceived: 0,
      cashPaid: 0,
      expectedClosingBalance: opening,
      status: CashDrawerStatus.OPEN,
      openedAt: new Date().toISOString(),
    };
    this.dataStore.cashDrawers.unshift(newDrawer);
    await this.dataStore.persistCashDrawer(newDrawer);
    return newDrawer;
  }

  @Get('history')
  async getDrawerHistory() {
    await this.dataStore.refreshIfStale();
    return this.dataStore.cashDrawers;
  }

  /**
   * Cashier Day Closing & Physical Reconciliation (SRS §33, §34, BR-006)
   */
  @Post('reconcile-close')
  async reconcileAndClose(
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

    await this.dataStore.persistCashDrawer(drawer);

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

  @Delete(':id')
  async deleteDrawerSession(@Param('id') id: string, @CurrentUser() user: IUser) {
    await this.dataStore.deleteCashDrawer(id);
    this.dataStore.logAudit(
      user?.id || 'USR-001',
      user?.employeeName || 'Administrator',
      'CASH_DRAWER_DELETED',
      'CashDrawer',
      id,
      undefined,
      { drawerId: id },
      `Deleted cash drawer session ${id}`,
    );
    return { success: true, message: `Cash drawer session ${id} deleted successfully.` };
  }
}
