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
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import * as fs from 'fs';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StaffGuard } from '../../common/guards/staff.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IUser } from '@sanjeevani/shared-types';

const resolveUploadDir = (): string => {
  const workspaceUpload = join(process.cwd(), 'apps', 'api', 'uploads', 'customer-docs');
  const localUpload = join(process.cwd(), 'uploads', 'customer-docs');
  return fs.existsSync(join(process.cwd(), 'apps', 'api')) ? workspaceUpload : localUpload;
};

const uploadDir = resolveUploadDir();
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export interface UploadedMulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
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
      fileFilter: (req, file, cb) => {
        const allowedMime = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
        ];
        const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedMime.includes(file.mimetype) && allowedExt.includes(ext)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Unsupported file format. Only PDF, JPG, PNG, and WEBP documents are permitted.',
            ),
            false,
          );
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  async uploadCustomerDocument(
    @Param('customerId') customerId: string,
    @UploadedFile() file: UploadedMulterFile,
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

    const isCustomerAccount = (user as any).isCustomer === true || (Array.isArray((user as any).roles) && (user as any).roles.includes('CUSTOMER') && (user as any).roles.length === 1);
    if (isCustomerAccount) {
      const authCustId = (user as any).customerId || (user as any).id;
      if (authCustId !== customerId && authCustId !== customer.id && authCustId !== customer.customerNumber) {
        throw new BadRequestException('Access denied: You can only upload documents for your own customer profile.');
      }
    }

    const docRecord = {
      id: `DOC-${Date.now()}`,
      customerId: customer.id,
      documentType: documentType || 'GENERAL_KYC',
      fileName: file.originalname,
      fileUrl: `/api/v1/documents/file/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: user.employeeName || 'Customer Portal',
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
   * List all documents for a member (IDOR Protected)
   */
  @Get('customer/:customerId')
  async getCustomerDocuments(@Param('customerId') customerId: string, @CurrentUser() user: any) {
    await this.dataStore.refreshIfStale();

    const isCustomerAccount = user?.isCustomer === true || (Array.isArray(user?.roles) && user?.roles.includes('CUSTOMER') && user?.roles.length === 1);
    if (isCustomerAccount) {
      const authCustId = user?.customerId || user?.id;
      if (authCustId !== customerId) {
        throw new BadRequestException('Access denied: You can only view documents for your own customer profile.');
      }
    }

    const docs = this.dataStore.customerDocuments.filter(
      (d) => d.customerId === customerId,
    );
    return docs;
  }

  /**
   * Securely stream customer KYC document (IDOR protected for customer portal, accessible to authenticated staff)
   */
  @Get('file/:filename')
  async getDocumentFile(
    @Param('filename') rawFilename: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const safeFilename = basename(rawFilename);
    await this.dataStore.refreshIfStale();

    const isCustomerAccount = user?.isCustomer === true || (Array.isArray(user?.roles) && user?.roles.includes('CUSTOMER') && user?.roles.length === 1);
    if (isCustomerAccount) {
      const authCustId = user?.customerId || user?.id;
      const matchingDoc = this.dataStore.customerDocuments.find(
        (d) => d.fileUrl && d.fileUrl.endsWith(safeFilename),
      );
      if (matchingDoc && matchingDoc.customerId !== authCustId) {
        throw new ForbiddenException('Access denied: You cannot view documents belonging to another member.');
      }
    }

    let filePath = join(uploadDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      const altDir = uploadDir.includes('apps')
        ? join(process.cwd(), 'uploads', 'customer-docs')
        : join(process.cwd(), 'apps', 'api', 'uploads', 'customer-docs');
      const altFilePath = join(altDir, safeFilename);
      if (fs.existsSync(altFilePath)) {
        filePath = altFilePath;
      }
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Document file not found or has been removed.');
    }

    return res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Document file could not be sent or found.' },
        });
      }
    });
  }

  /**
   * Delete a document (Restricted to internal staff)
   */
  @Delete(':id')
  @UseGuards(StaffGuard)
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
