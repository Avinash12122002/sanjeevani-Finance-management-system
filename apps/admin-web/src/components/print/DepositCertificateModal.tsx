'use client';

import React, { useRef } from 'react';
import { Modal, Button, Tag, Space } from 'antd';
import { PrinterOutlined, SafetyCertificateOutlined, DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { FinancialEngine } from '@sanjeevani/financial-engine';

interface DepositCertificateModalProps {
  visible: boolean;
  onClose: () => void;
  account: any;
  customer?: any;
}

export default function DepositCertificateModal({
  visible,
  onClose,
  account,
  customer,
}: DepositCertificateModalProps) {
  const certificateRef = useRef<HTMLDivElement>(null);

  if (!account) return null;

  const handlePrint = () => {
    window.print();
  };

  const isRD = account.productType === 'RD' || account.productType === 'RECURRING_DEPOSIT';
  const schemeTitle = isRD ? 'RECURRING DEPOSIT (RD) CERTIFICATE' : 'TERM DEPOSIT (FD) CERTIFICATE';

  // Amount in words converter for INR
  const numberToWordsINR = (num: number): string => {
    const a = [
      '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
      'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      let str = '';
      if (n > 99) {
        str += a[Math.floor(n / 100)] + 'Hundred ';
        n %= 100;
      }
      if (n > 19) {
        str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
      } else if (n > 0) {
        str += a[n];
      }
      return str;
    };

    if (num === 0) return 'Zero Rupees';
    let n = Math.floor(num);
    let crore = Math.floor(n / 10000000);
    n %= 10000000;
    let lakh = Math.floor(n / 100000);
    n %= 100000;
    let thousand = Math.floor(n / 1000);
    n %= 1000;

    let res = '';
    if (crore > 0) res += inWords(crore) + 'Crore ';
    if (lakh > 0) res += inWords(lakh) + 'Lakh ';
    if (thousand > 0) res += inWords(thousand) + 'Thousand ';
    if (n > 0) res += inWords(n);
    return (res.trim() + ' Rupees Only');
  };

  const principal = account.principalAmount || account.principal || account.currentBalance || 0;
  const maturityAmount = account.maturityAmount || Math.round(principal * (1 + (account.interestRate || 8) / 100 * ((account.tenureMonths || 12) / 12)));
  const memberName = customer?.fullName || customer?.firstName ? `${customer.firstName} ${customer.lastName || ''}`.trim() : (account.customerName || 'Valued Member');
  const memberId = customer?.customerNumber || account.customerNumber || 'SJF-MEM-0001';
  const issueDate = account.openingDate || (account.createdAt ? new Date(account.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'));
  const maturityDate = account.maturityDate || 'On Completion of Term';
  const rate = account.interestRate || 8.5;
  const tenor = account.tenureMonths || account.tenorMonths || 12;
  const nominee = account.nomineeName || customer?.nomineeName || 'As per Master Record';
  const nomineeRel = account.nomineeRelation || customer?.nomineeRelation || 'Nominee';

  return (
    <Modal
      title={
        <div className="flex items-center justify-between pr-8">
          <Space align="center">
            <SafetyCertificateOutlined className="text-emerald-700 text-lg" />
            <span className="font-bold text-slate-800">Formal Deposit Certificate (§8)</span>
          </Space>
          <Tag color="success">Cooperative & Regulatory Compliant</Tag>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={920}
      footer={[
        <Button key="close" onClick={onClose} icon={<CloseOutlined />}>
          Close
        </Button>,
        <Button
          key="download"
          icon={<DownloadOutlined />}
          onClick={handlePrint}
        >
          Download / Save
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
          style={{ background: '#059669', borderColor: '#059669' }}
        >
          Print Formal Certificate
        </Button>,
      ]}
      style={{ top: 20 }}
    >
      <div className="py-2">
        {/* CERTIFICATE CANVAS FOR PRINT & PREVIEW */}
        <div
          id="deposit-certificate-print-area"
          ref={certificateRef}
          className="relative bg-amber-50/20 text-slate-900 p-8 rounded-lg shadow-sm border-4 border-double border-[#1b5e20] overflow-hidden"
          style={{
            fontFamily: 'serif',
            background: 'linear-gradient(135deg, #fffdf8 0%, #faf6ec 100%)',
            borderColor: '#1b5e20',
          }}
        >
          {/* Watermark Crest */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
            <SafetyCertificateOutlined style={{ fontSize: 360, color: '#1b5e20' }} />
          </div>

          {/* Ornate Inner Border */}
          <div className="border border-[#c59b27] p-6 rounded relative z-10">
            {/* Header / Institutional Branding */}
            <div className="text-center border-b-2 border-[#1b5e20] pb-4 mb-5">
              <div className="flex items-center justify-center gap-2 mb-1">
                <SafetyCertificateOutlined className="text-2xl text-[#1b5e20]" />
                <h1 className="text-2xl font-bold tracking-wider text-[#1b5e20] uppercase font-serif m-0">
                  SANJEEVANI FINANCE MANAGEMENT SYSTEM
                </h1>
              </div>
              <div className="text-xs text-slate-600 font-sans tracking-wide">
                REGISTERED UNDER COOPERATIVE / MICROFINANCE STANDARDS • CENTRAL OFFICE: DELHI - 110086
              </div>
              <div className="inline-block mt-3 px-6 py-1 bg-[#1b5e20] text-amber-100 font-sans font-bold text-xs tracking-widest uppercase rounded shadow-sm">
                {schemeTitle}
              </div>
            </div>

            {/* Certificate Top Row: No & Date */}
            <div className="flex justify-between items-center text-xs font-sans border-b border-amber-200 pb-3 mb-4">
              <div>
                <span className="text-slate-500 font-semibold">CERTIFICATE NO: </span>
                <span className="font-mono font-bold text-emerald-900 text-sm tracking-wider">{account.accountNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">DATE OF ISSUE: </span>
                <span className="font-bold text-slate-800">{issueDate}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">MEMBER ID: </span>
                <span className="font-mono font-bold text-emerald-900">{memberId}</span>
              </div>
            </div>

            {/* Certificate Body Text */}
            <div className="text-sm leading-relaxed text-slate-800 my-4 space-y-3 font-serif">
              <p className="indent-6">
                This is to certify that Sri / Smt. <span className="font-bold font-sans text-slate-900 border-b border-dotted border-slate-700 px-2">{memberName}</span>,
                residing at <span className="font-bold font-sans text-slate-900 border-b border-dotted border-slate-700 px-2">{customer?.address || customer?.addressLine1 || 'Delhi'}</span>,
                has deposited under the <span className="font-bold font-sans text-emerald-900">{account.productName || (isRD ? 'Recurring Deposit Scheme' : 'Fixed Term Deposit Scheme')}</span> with Sanjeevani Finance the sum indicated below, subject to the terms and regulations of the institution.
              </p>
            </div>

            {/* Financial Details Grid */}
            <div className="grid grid-cols-2 gap-4 my-5 bg-white/80 p-4 rounded border border-amber-200 text-xs font-sans">
              <div className="space-y-2 border-r border-amber-200 pr-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Principal Deposit:</span>
                  <span className="font-bold text-slate-900 text-sm">{FinancialEngine.formatINR(principal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Principal in Words:</span>
                  <span className="font-semibold text-slate-700 text-right text-[11px] italic max-w-[200px]">{numberToWordsINR(principal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Annual Interest Rate:</span>
                  <span className="font-bold text-emerald-800">{rate}% p.a.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deposit Tenure:</span>
                  <span className="font-bold text-slate-900">{tenor} Months</span>
                </div>
              </div>

              <div className="space-y-2 pl-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Maturity Date:</span>
                  <span className="font-bold text-slate-900">{maturityDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected Maturity Value:</span>
                  <span className="font-bold text-emerald-900 text-sm">{FinancialEngine.formatINR(maturityAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nominee Registered:</span>
                  <span className="font-semibold text-slate-800">{nominee} ({nomineeRel})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Branch Office:</span>
                  <span className="font-semibold text-slate-800">Delhi Head Office (110086)</span>
                </div>
              </div>
            </div>

            {/* Terms Summary */}
            <div className="text-[10px] text-slate-500 font-sans leading-tight border-t border-amber-200 pt-3 mt-4">
              <span className="font-bold text-slate-600 uppercase">Terms & Conditions: </span>
              1. This certificate must be surrendered upon maturity for repayment or renewal. 2. Premature withdrawal is subject to deduction of 2.0% penalty from applicable rate as per Institution SOP §8. 3. Deposits are registered under strict audit regulations and safe custody.
            </div>

            {/* Seal & Signature Blocks */}
            <div className="flex justify-between items-end mt-12 pt-6 font-sans text-xs">
              <div className="text-center w-48">
                <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
                  <span className="font-script text-slate-400 italic text-[11px]">[Digital Signature Recorded]</span>
                </div>
                <div className="font-bold text-slate-800">Cashier / Verification Officer</div>
                <div className="text-[10px] text-slate-400">Sanjeevani Finance</div>
              </div>

              {/* Official Seal Mock */}
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#1b5e20] flex flex-col items-center justify-center text-center p-1 text-[#1b5e20] rotate-[-5deg]">
                <SafetyCertificateOutlined style={{ fontSize: 20 }} />
                <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5">OFFICIAL SEAL</span>
                <span className="text-[7px] text-slate-600">DELHI - 110086</span>
              </div>

              <div className="text-center w-48">
                <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
                  <span className="font-script text-slate-400 italic text-[11px]">[Authorized Signature]</span>
                </div>
                <div className="font-bold text-slate-800">Branch Manager / Secretary</div>
                <div className="text-[10px] text-slate-400">Head Office Delhi</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Specific CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #deposit-certificate-print-area,
          #deposit-certificate-print-area * {
            visibility: visible;
          }
          #deposit-certificate-print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: auto;
            margin: 0;
            padding: 24px;
            box-shadow: none !important;
            border: 4px double #1b5e20 !important;
            background: white !important;
            page-break-after: always;
          }
          .ant-modal-mask,
          .ant-modal-wrap,
          .ant-modal-footer,
          .ant-modal-close {
            display: none !important;
          }
        }
      `}</style>
    </Modal>
  );
}
