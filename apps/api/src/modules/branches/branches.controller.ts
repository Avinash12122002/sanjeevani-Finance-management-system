import { Controller, Get, Post, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IBranch, IUser } from '@sanjeevani/shared-types';

@Controller('api/v1/branches')
@UseGuards(JwtAuthGuard)
export class BranchesController {
  constructor(private dataStore: DataStoreService) {}

  @Get()
  getBranches() {
    return this.dataStore.branches;
  }

  @Get(':id')
  getBranchById(@Param('id') id: string) {
    const branch = this.dataStore.branches.find((b) => b.id === id || b.branchCode === id);
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  @Post()
  createBranch(@Body() body: Partial<IBranch>, @CurrentUser() user: IUser) {
    const newBranch: IBranch = {
      id: `BR-${Date.now()}`,
      branchCode: `SJF-BR00${this.dataStore.branches.length + 1}`,
      name: body.name || 'New Branch',
      address: body.address || 'Address',
      city: body.city || 'City',
      state: body.state || 'Uttar Pradesh',
      phone: body.phone || '+91 562 000000',
      status: 'ACTIVE',
      openedAt: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    this.dataStore.branches.push(newBranch);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Admin',
      'BRANCH_CREATED',
      'Branch',
      newBranch.id,
      undefined,
      newBranch,
      `Created Branch ${newBranch.name} (${newBranch.branchCode})`,
    );

    return newBranch;
  }
}
