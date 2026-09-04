import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IUser, UserRole } from '@sanjeevani/shared-types';

@Controller('api/v1/database')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.GENERAL_MANAGER, UserRole.BRANCH_MANAGER)
export class DatabaseController {
  constructor(private dataStore: DataStoreService) {}

  /**
   * List all 15 PostgreSQL tables with row counts and schema metadata
   */
  @Get('tables')
  async getTables() {
    return this.dataStore.getTableMetadata();
  }

  /**
   * Get 100% of raw rows and columns for a given database table
   */
  @Get('tables/:tableName')
  async getTableRows(@Param('tableName') tableName: string) {
    try {
      const rows = await this.dataStore.getRawTableRows(tableName);
      return {
        table: tableName,
        count: rows.length,
        items: rows,
      };
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  /**
   * Insert a new raw record directly into any table
   */
  @Post('tables/:tableName')
  async insertTableRow(
    @Param('tableName') tableName: string,
    @Body() body: Record<string, any>,
    @CurrentUser() user: IUser,
  ) {
    try {
      const record = await this.dataStore.insertRawTableRow(tableName, body);
      this.dataStore.logAudit(
        user?.id || 'USR-001',
        user?.employeeName || 'Administrator',
        'DATABASE_RAW_INSERT',
        tableName,
        record.id || 'NEW',
        undefined,
        record,
        `Inserted raw record in table ${tableName}`,
      );
      return {
        success: true,
        message: `Record successfully created in ${tableName}`,
        data: record,
      };
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  /**
   * Update an existing raw record in any table
   */
  @Patch('tables/:tableName/:id')
  async updateTableRow(
    @Param('tableName') tableName: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @CurrentUser() user: IUser,
  ) {
    try {
      const updated = await this.dataStore.updateRawTableRow(tableName, id, body);
      this.dataStore.logAudit(
        user?.id || 'USR-001',
        user?.employeeName || 'Administrator',
        'DATABASE_RAW_UPDATE',
        tableName,
        id,
        undefined,
        body,
        `Updated raw record ${id} in table ${tableName}`,
      );
      return {
        success: true,
        message: `Record ${id} in ${tableName} updated successfully`,
        data: updated,
      };
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  /**
   * Delete a raw record from any table
   */
  @Delete('tables/:tableName/:id')
  async deleteTableRow(
    @Param('tableName') tableName: string,
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    try {
      const res = await this.dataStore.deleteRawTableRow(tableName, id);
      this.dataStore.logAudit(
        user?.id || 'USR-001',
        user?.employeeName || 'Administrator',
        'DATABASE_RAW_DELETE',
        tableName,
        id,
        undefined,
        { id, table: tableName },
        `Deleted raw record ${id} from table ${tableName}`,
      );
      return res;
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }
}
