'use client';

import React from 'react';
import { Modal, Button, Table, Descriptions, Tag, Row, Col } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { FinancialEngine } from '@sanjeevani/financial-engine';
import { escapeHtml } from '../../lib/html-sanitizer';

export interface IPayslipData {
  institutionName?: string;
  institutionTagline?: string;
  payslipId: string;
  month: string;
  employee: {
    id: string;
    number: string;
    name: string;
    designation: string;
    branch: string;
    panOrAadhaar?: string;
    joiningDate?: string;
  };
  earnings: {
    basicSalary: number;
    hra: number;
    conveyance: number;
    performanceIncentive: number;
    grossEarnings: number;
  };
  deductions: {
    incomeTax: number;
    providentFund: number;
    unpaidLeaves: number;
    totalDeductions: number;
  };
  netPayable: number;
  amountInWords?: string;
  status: string;
  disbursedAt?: string;
}

export function openPayslipPrintWindow(data: IPayslipData) {
  if (typeof window === 'undefined') return;
  const printWindow = window.open('', '_blank', 'width=700,height=850');
  if (!printWindow) return;

  printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Payslip_${escapeHtml(data.employee.number)}_${escapeHtml(data.month)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      color: #1e293b;
      background: #fff;
      padding: 30px;
    }
    .sheet {
      border: 2px solid #065f46;
      border-radius: 10px;
      padding: 24px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #065f46;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #064e3b;
      letter-spacing: 0.5px;
    }
    .brand-sub {
      font-size: 11px;
      color: #047857;
      margin-top: 2px;
      font-weight: 600;
    }
    .doc-type {
      margin-top: 8px;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 1px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .info-table td {
      padding: 6px 10px;
      font-size: 12px;
      border: 1px solid #e2e8f0;
    }
    .info-label {
      font-weight: 600;
      color: #475569;
      background: #f8fafc;
      width: 25%;
    }
    .split-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .split-table th {
      background: #047857;
      color: #fff;
      padding: 8px 12px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .split-table td {
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      font-size: 12px;
    }
    .amount {
      text-align: right;
      font-weight: 600;
      font-family: monospace;
    }
    .net-box {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 12px 16px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .net-label {
      font-size: 12px;
      font-weight: 700;
      color: #064e3b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .net-amount {
      font-size: 20px;
      font-weight: 800;
      color: #047857;
      font-family: monospace;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      margin-top: 36px;
      padding-top: 10px;
    }
    .signature {
      width: 200px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
    }
    .signature-line {
      border-bottom: 1px dashed #94a3b8;
      margin-bottom: 6px;
      height: 40px;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 15mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand-title">SANJEEVANI FINANCE</div>
      <div class="brand-sub">Your Money. Your Future. Our Responsibility.</div>
      <div class="brand-sub">संजीवनी फाइनेंस — भरोसे के साथ, बेहतर कल की ओर</div>
      <div class="doc-type">SALARY PAYSLIP — ${escapeHtml(data.month)}</div>
    </div>

    <table class="info-table">
      <tr>
        <td class="info-label">Employee ID</td>
        <td><strong>${escapeHtml(data.employee.number)}</strong></td>
        <td class="info-label">Employee Name</td>
        <td><strong>${escapeHtml(data.employee.name)}</strong></td>
      </tr>
      <tr>
        <td class="info-label">Designation</td>
        <td>${escapeHtml(data.employee.designation)}</td>
        <td class="info-label">Branch</td>
        <td>${escapeHtml(data.employee.branch)}</td>
      </tr>
      <tr>
        <td class="info-label">Payslip ID</td>
        <td><span style="font-family: monospace;">${escapeHtml(data.payslipId)}</span></td>
        <td class="info-label">Status</td>
        <td><strong style="color: #047857;">${escapeHtml(data.status)}</strong></td>
      </tr>
    </table>

    <table class="split-table">
      <thead>
        <tr>
          <th style="width: 50%;">Earnings</th>
          <th style="width: 50%;">Deductions</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
              <span>Basic Salary</span>
              <span class="amount">₹${data.earnings.basicSalary.toLocaleString('en-IN')}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
              <span>House Rent Allowance (HRA)</span>
              <span class="amount">₹${data.earnings.hra.toLocaleString('en-IN')}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
              <span>Conveyance Allowance</span>
              <span class="amount">₹${data.earnings.conveyance.toLocaleString('en-IN')}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
              <span>Performance Incentive (SRS §41)</span>
              <span class="amount">₹${data.earnings.performanceIncentive.toLocaleString('en-IN')}</span>
            </div>
          </td>
          <td style="vertical-align: top;">
            <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
              <span>TDS / Income Tax</span>
              <span class="amount">₹${data.deductions.incomeTax.toLocaleString('en-IN')}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
              <span>Provident Fund (PF)</span>
              <span class="amount">₹${data.deductions.providentFund.toLocaleString('en-IN')}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
              <span>Unpaid Leave Deductions</span>
              <span class="amount">₹${data.deductions.unpaidLeaves.toLocaleString('en-IN')}</span>
            </div>
          </td>
        </tr>
        <tr style="font-weight: 700; background: #f8fafc;">
          <td>
            <div style="display:flex; justify-content:space-between;">
              <span>Gross Earnings</span>
              <span class="amount">₹${data.earnings.grossEarnings.toLocaleString('en-IN')}</span>
            </div>
          </td>
          <td>
            <div style="display:flex; justify-content:space-between;">
              <span>Total Deductions</span>
              <span class="amount">₹${data.deductions.totalDeductions.toLocaleString('en-IN')}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="net-box">
      <div>
        <div class="net-label">NET TAKE-HOME SALARY</div>
        <div style="font-size: 11px; color: #065f46; margin-top: 2px;">
          ${escapeHtml(data.amountInWords || '')}
        </div>
      </div>
      <div class="net-amount">₹${data.netPayable.toLocaleString('en-IN')}</div>
    </div>

    <div class="footer">
      <div class="signature">
        <div class="signature-line"></div>
        <div>Employee Acknowledgment</div>
      </div>
      <div class="signature">
        <div class="signature-line"></div>
        <div>Authorized Signatory / Finance Seal</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `);
  printWindow.document.close();
}

export function PayslipModal({
  open,
  data,
  onClose,
}: {
  open: boolean;
  data: IPayslipData | null;
  onClose: () => void;
}) {
  if (!data) return null;

  return (
    <Modal
      title={
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800">
            Employee Payslip: {data.employee.name} ({data.month})
          </span>
          <Tag color="green">{data.status}</Tag>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          style={{ background: '#059669', borderColor: '#059669' }}
          onClick={() => openPayslipPrintWindow(data)}
        >
          Print Official Payslip
        </Button>,
      ]}
    >
      <div className="space-y-4 py-2">
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Employee">{data.employee.name}</Descriptions.Item>
          <Descriptions.Item label="Staff ID">{data.employee.number}</Descriptions.Item>
          <Descriptions.Item label="Designation">{data.employee.designation}</Descriptions.Item>
          <Descriptions.Item label="Branch">{data.employee.branch}</Descriptions.Item>
        </Descriptions>

        <Row gutter={16}>
          <Col span={12}>
            <div className="border border-emerald-200 rounded-lg overflow-hidden">
              <div className="bg-emerald-50 px-3 py-1.5 font-bold text-emerald-900 text-xs uppercase border-b border-emerald-200">
                Earnings Breakdown
              </div>
              <Table
                size="small"
                pagination={false}
                showHeader={false}
                rowKey="key"
                dataSource={[
                  { key: '1', item: 'Basic Salary', amt: data.earnings.basicSalary },
                  { key: '2', item: 'HRA', amt: data.earnings.hra },
                  { key: '3', item: 'Conveyance Allowance', amt: data.earnings.conveyance },
                  { key: '4', item: 'Incentive (SRS §41)', amt: data.earnings.performanceIncentive, highlight: true },
                  { key: '5', item: 'Gross Earnings', amt: data.earnings.grossEarnings, isTotal: true },
                ]}
                columns={[
                  {
                    dataIndex: 'item',
                    key: 'item',
                    render: (text, record: any) =>
                      record.isTotal ? <strong className="text-emerald-950">{text}</strong> : text,
                  },
                  {
                    dataIndex: 'amt',
                    key: 'amt',
                    align: 'right',
                    render: (val, record: any) => (
                      <span
                        className={
                          record.isTotal
                            ? 'font-bold text-emerald-900'
                            : record.highlight
                            ? 'font-bold text-emerald-600'
                            : 'font-medium'
                        }
                      >
                        {FinancialEngine.formatINR(val)}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          </Col>

          <Col span={12}>
            <div className="border border-rose-200 rounded-lg overflow-hidden">
              <div className="bg-rose-50 px-3 py-1.5 font-bold text-rose-900 text-xs uppercase border-b border-rose-200">
                Deductions Breakdown
              </div>
              <Table
                size="small"
                pagination={false}
                showHeader={false}
                rowKey="key"
                dataSource={[
                  { key: '1', item: 'Income Tax (TDS)', amt: data.deductions.incomeTax },
                  { key: '2', item: 'Provident Fund (PF)', amt: data.deductions.providentFund },
                  { key: '3', item: 'Unpaid Leaves (LOP)', amt: data.deductions.unpaidLeaves },
                  { key: '4', item: 'Total Deductions', amt: data.deductions.totalDeductions, isTotal: true },
                ]}
                columns={[
                  {
                    dataIndex: 'item',
                    key: 'item',
                    render: (text, record: any) =>
                      record.isTotal ? <strong className="text-rose-950">{text}</strong> : text,
                  },
                  {
                    dataIndex: 'amt',
                    key: 'amt',
                    align: 'right',
                    render: (val, record: any) => (
                      <span className={record.isTotal ? 'font-bold text-rose-700' : 'font-medium'}>
                        {FinancialEngine.formatINR(val)}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          </Col>
        </Row>

        <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">NET TAKE-HOME PAYABLE</div>
            <div className="text-sm text-emerald-400">{data.amountInWords}</div>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {FinancialEngine.formatINR(data.netPayable)}
          </div>
        </div>
      </div>
    </Modal>
  );
}
