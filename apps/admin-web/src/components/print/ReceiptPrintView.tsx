'use client';

import React from 'react';
import { escapeHtml } from '../../lib/html-sanitizer';

interface ReceiptPrintViewProps {
  receipt: {
    receiptNumber: string;
    transactionNumber?: string;
    customerName: string;
    customerNumber?: string;
    amount: number;
    paymentMode: string;
    paymentFor: string;
    collectorName?: string;
    branchName?: string;
    generatedAt: string;
  };
  onClose?: () => void;
}

/**
 * Standalone function to open and print a formatted receipt in a dedicated pop-up
 */
export function openReceiptPrintWindow(receipt: ReceiptPrintViewProps['receipt']) {
  if (typeof window === 'undefined') return;
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) return;

  const formattedDate = new Date(receipt.generatedAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const amountWords = numberToWords(receipt.amount);

  printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${receipt.receiptNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      background: #fff;
      padding: 0;
    }
    .receipt {
      width: 350px;
      margin: 0 auto;
      border: 2px solid #1a237e;
      border-radius: 8px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
      color: #fff;
      padding: 16px;
      text-align: center;
    }
    .header h1 { font-size: 16px; font-weight: 700; letter-spacing: 1px; }
    .header p { font-size: 10px; opacity: 0.85; margin-top: 2px; }
    .receipt-tag {
      background: #e8eaf6;
      padding: 8px 16px;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dashed #9fa8da;
    }
    .receipt-tag .label { font-size: 10px; color: #5c6bc0; text-transform: uppercase; letter-spacing: 0.5px; }
    .receipt-tag .value { font-size: 11px; font-weight: 600; color: #1a237e; }
    .body { padding: 16px; }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
    }
    .row:last-child { border-bottom: none; margin-bottom: 0; }
    .row .key { color: #616161; font-size: 10px; }
    .row .val { font-weight: 500; font-size: 11px; color: #212121; text-align: right; max-width: 180px; }
    .amount-box {
      background: linear-gradient(135deg, #e8f5e9, #f1f8e9);
      border: 2px solid #4caf50;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
      margin: 12px 0;
    }
    .amount-box .amount-label { font-size: 10px; color: #388e3c; text-transform: uppercase; letter-spacing: 0.5px; }
    .amount-box .amount { font-size: 22px; font-weight: 700; color: #1b5e20; margin: 4px 0; }
    .amount-box .words { font-size: 9px; color: #4caf50; font-style: italic; }
    .footer {
      background: #f5f5f5;
      padding: 10px 16px;
      text-align: center;
      border-top: 1px dashed #bdbdbd;
    }
    .footer .sig-line { width: 120px; border-top: 1px solid #616161; margin: 16px auto 4px; }
    .footer .sig-label { font-size: 9px; color: #757575; }
    .footer .disclaimer { font-size: 8px; color: #9e9e9e; margin-top: 8px; }
    .valid-badge {
      display: inline-block;
      background: #4caf50;
      color: #fff;
      font-size: 9px;
      padding: 2px 8px;
      border-radius: 10px;
      margin-top: 6px;
      letter-spacing: 0.5px;
    }
    @media print {
      body { padding: 0; }
      .receipt { border: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>🏦 SANJEEVANI FINANCE</h1>
      <p>Official Payment Receipt</p>
    </div>

    <div class="receipt-tag">
      <div>
        <div class="label">Receipt No.</div>
        <div class="value">${escapeHtml(receipt.receiptNumber)}</div>
      </div>
      <div style="text-align:right">
        <div class="label">Date &amp; Time</div>
        <div class="value">${escapeHtml(formattedDate)}</div>
      </div>
    </div>

    <div class="body">
      <div class="amount-box">
        <div class="amount-label">Amount Received</div>
        <div class="amount">₹ ${receipt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        <div class="words">${escapeHtml(amountWords)} only</div>
      </div>

      <div class="row">
        <span class="key">Member Name</span>
        <span class="val">${escapeHtml(receipt.customerName)}</span>
      </div>
      <div class="row">
        <span class="key">Member No.</span>
        <span class="val">${escapeHtml(receipt.customerNumber || 'N/A')}</span>
      </div>
      <div class="row">
        <span class="key">Payment For</span>
        <span class="val">${escapeHtml(receipt.paymentFor)}</span>
      </div>
      <div class="row">
        <span class="key">Payment Mode</span>
        <span class="val">${escapeHtml(receipt.paymentMode)}</span>
      </div>
      <div class="row">
        <span class="key">Collected By</span>
        <span class="val">${escapeHtml(receipt.collectorName || 'Head Office Staff')}</span>
      </div>
      <div class="row">
        <span class="key">Branch</span>
        <span class="val">${escapeHtml(receipt.branchName || 'Head Office')}</span>
      </div>
      ${receipt.transactionNumber ? `
      <div class="row">
        <span class="key">Txn Ref.</span>
        <span class="val">${escapeHtml(receipt.transactionNumber)}</span>
      </div>` : ''}
    </div>

    <div class="footer">
      <div class="sig-line"></div>
      <div class="sig-label">Authorised Signatory</div>
      <div class="valid-badge">✓ VALID RECEIPT</div>
      <div class="disclaimer">
        This is a computer-generated receipt and does not require a physical signature.<br/>
        Please retain this for your records. — Sanjeevani Finance
      </div>
    </div>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>
  `);
  printWindow.document.close();
}

/**
 * ReceiptPrintView — SRS §20 Digital Receipt Print Template Modal View
 */
export default function ReceiptPrintView({ receipt, onClose }: ReceiptPrintViewProps) {
  const handlePrint = () => {
    openReceiptPrintWindow(receipt);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <h3 style={{ marginBottom: 4, color: '#1a237e' }}>🧾 Receipt Ready</h3>
        <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
          Receipt <strong>{receipt.receiptNumber}</strong> for{' '}
          <strong>₹ {receipt.amount.toLocaleString('en-IN')}</strong>
        </p>

        <div
          style={{
            background: '#e8eaf6',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            fontSize: 12,
            lineHeight: 1.8,
          }}
        >
          <div><strong>Member:</strong> {receipt.customerName} ({receipt.customerNumber})</div>
          <div><strong>For:</strong> {receipt.paymentFor}</div>
          <div><strong>Mode:</strong> {receipt.paymentMode}</div>
          <div><strong>Date:</strong> {new Date(receipt.generatedAt).toLocaleString('en-IN')}</div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #1a237e, #283593)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 0',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            🖨️ Print Receipt
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: '#f5f5f5',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '10px 0',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple number to words converter for Indian amounts
function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' ';
    return ones[Math.floor(n / 100)] + ' Hundred ' + convertGroup(n % 100);
  }

  const integer = Math.floor(num);
  let result = '';
  if (integer >= 10000000) result += convertGroup(Math.floor(integer / 10000000)) + 'Crore ';
  if (integer >= 100000) result += convertGroup(Math.floor((integer % 10000000) / 100000)) + 'Lakh ';
  if (integer >= 1000) result += convertGroup(Math.floor((integer % 100000) / 1000)) + 'Thousand ';
  result += convertGroup(integer % 1000);
  return result.trim() + ' Rupees';
}
