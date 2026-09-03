import {
  Controller,
  Get,
  Post,
  Patch,
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
import {
  IProduct,
  IUser,
  ProductType,
  RegulatoryStatus,
  InterestMethod,
} from '@sanjeevani/shared-types';

@Controller('api/v1/products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private dataStore: DataStoreService) {}

  @Get()
  async getAllProducts() {
    await this.dataStore.refreshIfStale();
    return this.dataStore.products;
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    await this.dataStore.refreshIfStale();
    const product = this.dataStore.products.find((p) => p.id === id || p.productCode === id);
    if (!product) {
      throw new NotFoundException(`Product not found for: ${id}`);
    }
    return product;
  }

  @Post()
  createProduct(@Body() body: Partial<IProduct>, @CurrentUser() user: IUser) {
    if (!body.productName || !body.productType || body.interestRate === undefined) {
      throw new BadRequestException('Product Name, Product Type and Interest Rate are required');
    }

    const code = `SJF-PRD-${body.productType.substring(0, 3)}-${Date.now().toString().slice(-4)}`;

    const newProduct: IProduct = {
      id: `PRD-${Date.now()}`,
      productCode: body.productCode || code,
      productName: body.productName,
      productType: body.productType as ProductType,
      minimumAmount: Number(body.minimumAmount) || 500,
      maximumAmount: Number(body.maximumAmount) || 1000000,
      minimumTenureMonths: Number(body.minimumTenureMonths) || 1,
      maximumTenureMonths: Number(body.maximumTenureMonths) || 60,
      interestMethod: (body.interestMethod as InterestMethod) || InterestMethod.REDUCING_BALANCE,
      interestRate: Number(body.interestRate),
      penaltyRate: Number(body.penaltyRate) || 0,
      prematureAllowed: body.prematureAllowed ?? true,
      requiresNominee: body.requiresNominee ?? true,
      regulatoryStatus: (body.regulatoryStatus as RegulatoryStatus) || RegulatoryStatus.APPROVED,
      isEnabled: body.isEnabled ?? true,
      effectiveFrom: body.effectiveFrom || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    this.dataStore.products.push(newProduct);
    this.dataStore.persistProduct(newProduct);

    this.dataStore.logAudit(
      user.id || 'USR-001',
      user.employeeName || 'Staff',
      'PRODUCT_CREATED',
      'Product',
      newProduct.id,
      undefined,
      newProduct,
      `New Financial Product Created: ${newProduct.productName} (${newProduct.productCode})`,
    );

    return newProduct;
  }

  @Patch(':id')
  updateProduct(
    @Param('id') id: string,
    @Body() body: Partial<IProduct>,
    @CurrentUser() user: IUser,
  ) {
    const index = this.dataStore.products.findIndex((p) => p.id === id || p.productCode === id);
    if (index === -1) {
      throw new NotFoundException(`Product not found for: ${id}`);
    }

    const oldVal = { ...this.dataStore.products[index] };
    const updated = {
      ...oldVal,
      ...body,
    };

    this.dataStore.products[index] = updated;
    this.dataStore.persistProduct(updated);

    this.dataStore.logAudit(
      user.id || 'USR-001',
      user.employeeName || 'Staff',
      'PRODUCT_UPDATED',
      'Product',
      updated.id,
      oldVal,
      updated,
      `Product updated: ${updated.productCode}`,
    );

    return updated;
  }

  @Delete(':id')
  deleteProduct(@Param('id') id: string, @CurrentUser() user: IUser) {
    const index = this.dataStore.products.findIndex((p) => p.id === id || p.productCode === id);
    if (index === -1) {
      throw new NotFoundException(`Product not found for: ${id}`);
    }

    const removed = this.dataStore.products.splice(index, 1)[0];
    this.dataStore.deleteProduct(removed.id);

    this.dataStore.logAudit(
      user.id || 'USR-001',
      user.employeeName || 'Admin',
      'PRODUCT_DELETED',
      'Product',
      removed.id,
      removed,
      undefined,
      `Deleted product ${removed.productName} (${removed.productCode})`,
    );

    return { message: `Product ${removed.productName} deleted successfully.`, id: removed.id };
  }
}
