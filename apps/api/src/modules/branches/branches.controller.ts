import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IBranch, IUser } from '@sanjeevani/shared-types';

@Controller('api/v1/branches')
@UseGuards(JwtAuthGuard)
export class BranchesController {
  constructor(private dataStore: DataStoreService) {}

  @Get()
  async getBranches() {
    await this.dataStore.refreshIfStale();
    return this.dataStore.branches;
  }

  @Get(':id')
  async getBranchById(@Param('id') id: string) {
    await this.dataStore.refreshIfStale();
    const branch = this.dataStore.branches.find((b) => b.id === id || b.branchCode === id);
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  @Post()
  async createBranch(@Body() body: Partial<IBranch>, @CurrentUser() user: IUser) {
    const newBranch: IBranch = {
      id: `BR-${Date.now()}`,
      branchCode: `SJF-BR00${this.dataStore.branches.length + 1}`,
      name: body.name || 'New Branch',
      address: body.address || 'Address',
      city: body.city || 'Delhi',
      state: body.state || 'Delhi',
      pinCode: body.pinCode || '110086',
      email: body.email || '',
      phone: body.phone || '+91 11 00000000',
      status: 'ACTIVE',
      openedAt: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    this.dataStore.branches.push(newBranch);
    await this.dataStore.persistBranch(newBranch);

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

  @Patch(':id')
  async updateBranch(
    @Param('id') id: string,
    @Body() body: Partial<IBranch>,
    @CurrentUser() user: IUser,
  ) {
    const branchIndex = this.dataStore.branches.findIndex((b) => b.id === id || b.branchCode === id);
    if (branchIndex === -1) {
      throw new NotFoundException(`Branch not found: ${id}`);
    }

    const currentBranch = this.dataStore.branches[branchIndex];
    const oldVal = { ...currentBranch };

    if (body.name) currentBranch.name = body.name;
    if (body.address) currentBranch.address = body.address;
    if (body.city) currentBranch.city = body.city;
    if (body.state) currentBranch.state = body.state;
    if (body.pinCode !== undefined) currentBranch.pinCode = body.pinCode;
    if (body.email !== undefined) currentBranch.email = body.email;
    if (body.phone) currentBranch.phone = body.phone;
    if (body.status) currentBranch.status = body.status;

    await this.dataStore.persistBranch(currentBranch);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Admin',
      'BRANCH_UPDATED',
      'Branch',
      currentBranch.id,
      oldVal,
      currentBranch,
      `Updated Branch ${currentBranch.name} (${currentBranch.branchCode})`,
    );

    return currentBranch;
  }

  @Delete(':id')
  async deleteBranch(@Param('id') id: string, @CurrentUser() user: IUser) {
    const branchIndex = this.dataStore.branches.findIndex((b) => b.id === id || b.branchCode === id);
    if (branchIndex === -1) {
      throw new NotFoundException(`Branch not found: ${id}`);
    }

    const removed = this.dataStore.branches.splice(branchIndex, 1)[0];
    await this.dataStore.deleteBranch(removed.id);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Admin',
      'BRANCH_DELETED',
      'Branch',
      removed.id,
      removed,
      undefined,
      `Deleted Branch ${removed.name} (${removed.branchCode})`,
    );

    return { message: `Branch ${removed.name} deleted successfully.`, id: removed.id };
  }
}
