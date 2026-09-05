import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IUser } from '@sanjeevani/shared-types';

const uploadDir = join(process.cwd(), 'uploads', 'customer-docs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller('api/v1/documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private dataStore: DataStoreService) {}

  /**
   * Upload customer KYC scan, photo or signature (§6, §47)
   */
  @Post('upload/:customerId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname);
          cb(null, `DOC-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  async uploadCustomerDocument(
    @Param('customerId') customerId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') documentType: string,
    @CurrentUser() user: IUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Please select a valid document or photo.');
    }

    const customer = this.dataStore.customers.find((c) => c.id === customerId || c.customerNumber === customerId);
    if (!customer) {
      throw new NotFoundException(`Customer record not found for: ${customerId}`);
    }

    const docRecord = {
      id: `DOC-${Date.now()}`,
      customerId: customer.id,
      documentType: documentType || 'GENERAL_KYC',
      fileName: file.originalname,
      fileUrl: `/uploads/customer-docs/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: user.employeeName || 'Staff',
      uploadedAt: new Date().toISOString(),
    };

    this.dataStore.customerDocuments.unshift(docRecord);
    await this.dataStore.persistCustomerDocument(docRecord);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Staff',
      'CUSTOMER_DOCUMENT_UPLOADED',
      'CustomerDocument',
      docRecord.id,
      undefined,
      { customerId: customer.id, fileName: file.originalname, documentType: docRecord.documentType },
      `Uploaded ${docRecord.documentType} (${file.originalname}) for customer ${customer.customerNumber}`,
    );

    return {
      success: true,
      message: `${docRecord.documentType} uploaded successfully!`,
      data: docRecord,
    };
  }

  /**
   * List all documents for a member
   */
  @Get('customer/:customerId')
  async getCustomerDocuments(@Param('customerId') customerId: string) {
    await this.dataStore.refreshIfStale();
    const docs = this.dataStore.customerDocuments.filter(
      (d) => d.customerId === customerId,
    );
    return docs;
  }

  /**
   * Delete a document
   */
  @Delete(':id')
  async deleteCustomerDocument(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    const idx = this.dataStore.customerDocuments.findIndex((d) => d.id === id);
    if (idx === -1) {
      throw new NotFoundException(`Document ${id} not found.`);
    }

    const doc = this.dataStore.customerDocuments[idx];
    this.dataStore.customerDocuments.splice(idx, 1);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'Staff',
      'CUSTOMER_DOCUMENT_DELETED',
      'CustomerDocument',
      id,
      doc,
      undefined,
      `Deleted document ${doc.fileName} (${doc.documentType})`,
    );

    return {
      success: true,
      message: 'Document deleted successfully.',
    };
  }
}
