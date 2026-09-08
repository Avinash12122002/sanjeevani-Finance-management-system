import { Injectable, Logger } from '@nestjs/common';

/**
 * SmsNotificationService — Business Event SMS via MSG91
 * SRS §24: Automated notifications for payment, EMI, maturity, and loan events
 *
 * Reuses the same MSG91 fetch pattern as customer-portal OTP.
 * Configured via environment variables:
 *   MSG91_AUTH_KEY   — Your MSG91 authentication key
 *   MSG91_SENDER_ID  — 6-char sender ID (e.g. SNJEEV)
 *   MSG91_ROUTE      — Route (4 = Transactional)
 */
@Injectable()
export class SmsNotificationService {
  private readonly logger = new Logger(SmsNotificationService.name);

  private get authKey(): string | undefined {
    return process.env.MSG91_AUTH_KEY || process.env.MSG91_TOKEN_AUTH;
  }

  private get senderId(): string {
    return process.env.MSG91_SENDER_ID || 'SNJEEV';
  }

  /**
   * Core SMS dispatcher via MSG91 REST API
   */
  private async sendSms(mobile: string, message: string, context: string): Promise<boolean> {
    // Normalise to 10-digit number
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length !== 10) {
      this.logger.warn(`[SMS] Invalid mobile number for ${context}: ${mobile}`);
      return false;
    }

    if (!this.authKey) {
      this.logger.warn(`[SMS-Simulation] MSG91_AUTH_KEY not set. Would have sent to +91${cleanMobile}: ${message}`);
      return true; // Graceful no-op in dev mode
    }

    try {
      const payload = {
        sender: this.senderId,
        route: process.env.MSG91_ROUTE || '4',
        country: '91',
        sms: [
          {
            message,
            to: [`91${cleanMobile}`],
          },
        ],
      };

      const res = await fetch('https://api.msg91.com/api/v2/sendsms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: this.authKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.type === 'success') {
        this.logger.log(`[SMS] Sent to +91${cleanMobile} [${context}]`);
        return true;
      } else {
        this.logger.warn(`[SMS] MSG91 returned non-success for +91${cleanMobile}: ${JSON.stringify(data)}`);
        return false;
      }
    } catch (err: any) {
      this.logger.error(`[SMS] Failed to send to +91${cleanMobile} [${context}]: ${err.message}`);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SRS §24 Business Event Notifications
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * 1. Payment Received Confirmation
   * Trigger: immediately after recordPayment() succeeds
   */
  async sendPaymentReceivedSms(params: {
    mobile: string;
    customerName: string;
    amount: number;
    receiptNumber: string;
    outstandingBalance?: number;
    paymentFor?: string;
  }): Promise<void> {
    const balancePart = params.outstandingBalance !== undefined
      ? ` Outstanding: Rs.${params.outstandingBalance.toLocaleString('en-IN')}.`
      : '';
    const message =
      `Sanjeevani Finance: Rs.${params.amount.toLocaleString('en-IN')} received` +
      ` for ${params.paymentFor || 'your account'}.` +
      ` Receipt: ${params.receiptNumber}.${balancePart}` +
      ` Thank you, ${params.customerName}.`;

    await this.sendSms(params.mobile, message, 'PAYMENT_RECEIVED');
  }

  /**
   * 2. EMI Due Reminder (3 days before due date)
   * Trigger: cron at 9 AM — checks installments due in 3 days
   */
  async sendEmiDueReminderSms(params: {
    mobile: string;
    customerName: string;
    emiAmount: number;
    dueDate: string;
    loanNumber: string;
  }): Promise<void> {
    const message =
      `Sanjeevani Finance: Your EMI of Rs.${params.emiAmount.toLocaleString('en-IN')}` +
      ` for Loan ${params.loanNumber} is due on ${params.dueDate}.` +
      ` Please pay on time to avoid penalty. -Sanjeevani Finance`;

    await this.sendSms(params.mobile, message, 'EMI_DUE_REMINDER');
  }

  /**
   * 3. RD Installment Due (2 days before due date)
   * Trigger: cron at 9 AM — checks RD installments due in 2 days
   */
  async sendRdInstallmentDueSms(params: {
    mobile: string;
    customerName: string;
    amount: number;
    dueDate: string;
    accountNumber: string;
  }): Promise<void> {
    const message =
      `Sanjeevani Finance: Your RD installment of Rs.${params.amount.toLocaleString('en-IN')}` +
      ` for A/C ${params.accountNumber} is due on ${params.dueDate}.` +
      ` Please deposit on time. -Sanjeevani Finance`;

    await this.sendSms(params.mobile, message, 'RD_INSTALLMENT_DUE');
  }

  /**
   * 4. Account Maturity Alert (7 days before maturity)
   * Trigger: cron — checks accounts maturing in 7 days
   */
  async sendMaturityAlertSms(params: {
    mobile: string;
    customerName: string;
    accountNumber: string;
    productType: string;
    maturityDate: string;
    maturityAmount: number;
  }): Promise<void> {
    const message =
      `Sanjeevani Finance: Your ${params.productType} A/C ${params.accountNumber}` +
      ` matures on ${params.maturityDate}.` +
      ` Maturity amount: Rs.${params.maturityAmount.toLocaleString('en-IN')}.` +
      ` Please contact us to renew or withdraw. -Sanjeevani Finance`;

    await this.sendSms(params.mobile, message, 'MATURITY_ALERT');
  }

  /**
   * 5. Loan Approved & Disbursed
   * Trigger: immediately after disburseLoan() succeeds
   */
  async sendLoanDisbursedSms(params: {
    mobile: string;
    customerName: string;
    loanNumber: string;
    amount: number;
    emiAmount: number;
    firstEmiDate: string;
  }): Promise<void> {
    const message =
      `Sanjeevani Finance: Congratulations! Loan ${params.loanNumber}` +
      ` of Rs.${params.amount.toLocaleString('en-IN')} disbursed.` +
      ` EMI: Rs.${params.emiAmount.toLocaleString('en-IN')}/month.` +
      ` First EMI: ${params.firstEmiDate}. -Sanjeevani Finance`;

    await this.sendSms(params.mobile, message, 'LOAN_DISBURSED');
  }

  /**
   * 6. Overdue / Loan Defaulter Alert (after DPD > 3 days)
   * Trigger: daily cron after DPD update
   */
  async sendOverdueAlertSms(params: {
    mobile: string;
    customerName: string;
    loanNumber: string;
    overdueAmount: number;
    daysPastDue: number;
  }): Promise<void> {
    const message =
      `URGENT - Sanjeevani Finance: Your Loan ${params.loanNumber} has an` +
      ` overdue of Rs.${params.overdueAmount.toLocaleString('en-IN')}` +
      ` (${params.daysPastDue} days past due).` +
      ` Please pay immediately to avoid legal action. Call us: contact your branch.`;

    await this.sendSms(params.mobile, message, 'OVERDUE_ALERT');
  }

  /**
   * 7. Complaint Registered Acknowledgment
   * Trigger: when complaint is created via portal or staff
   */
  async sendComplaintRegisteredSms(params: {
    mobile: string;
    customerName: string;
    complaintNumber: string;
  }): Promise<void> {
    const message =
      `Sanjeevani Finance: Your complaint ${params.complaintNumber} has been registered.` +
      ` We will resolve it within 3 working days. Thank you for your patience. -Sanjeevani Finance`;

    await this.sendSms(params.mobile, message, 'COMPLAINT_REGISTERED');
  }

  /**
   * 8. Account Opened Confirmation
   * Trigger: when new RD/FD/Savings account is created
   */
  async sendAccountOpenedSms(params: {
    mobile: string;
    customerName: string;
    accountNumber: string;
    productType: string;
    amount: number;
  }): Promise<void> {
    const message =
      `Sanjeevani Finance: Your ${params.productType} account` +
      ` ${params.accountNumber} opened successfully.` +
      ` Amount: Rs.${params.amount.toLocaleString('en-IN')}.` +
      ` Thank you for trusting us. -Sanjeevani Finance`;

    await this.sendSms(params.mobile, message, 'ACCOUNT_OPENED');
  }
}
