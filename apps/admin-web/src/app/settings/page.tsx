'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Tabs,
  Space,
  Form,
  Input,
  Switch,
  Row,
  Col,
  Descriptions,
  message,
} from 'antd';
import {
  SettingOutlined,
  BranchesOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { fetchApi } from '@/lib/api-client';

export default function SettingsPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Feature Flags (SRS §43)
  const [featureFlags, setFeatureFlags] = useState({
    RD_PRODUCT: true,
    TERM_DEPOSIT: true,
    COMMITTEE: false, // Committee / Chit disabled by default
    LUCKY_DRAW: false, // Lucky draw disabled by default
    PREMATURE_WITHDRAWAL: true,
    LOAN_GUARANTOR: true,
    CASH_DISBURSEMENT: true,
  });

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    setLoading(true);
    const [bRes, eRes, pRes] = await Promise.all([
      fetchApi('/branches'),
      fetchApi('/employees'),
      fetchApi('/products'),
    ]);

    if (bRes.success && bRes.data) setBranches(bRes.data);
    if (eRes.success && eRes.data) setEmployees(eRes.data);
    if (pRes.success && pRes.data) setProducts(pRes.data);
    setLoading(false);
  };

  const handleToggleFlag = (key: string, checked: boolean) => {
    setFeatureFlags({ ...featureFlags, [key]: checked });
    message.success(`Compliance Feature Flag [${key}] updated to ${checked ? 'ENABLED' : 'DISABLED'}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">System Configuration & Compliance Master</h1>
          <p className="text-slate-500 text-sm mt-1 m-0">
            System settings, multi-branch network, staff role authorizations and regulatory feature gating (SRS §43, §104).
          </p>
        </div>
      </div>

      <Tabs
        defaultActiveKey="flags"
        items={[
          {
            key: 'flags',
            label: 'Compliance Feature Flags (§43, BR-019)',
            children: (
              <Card className="glass-card" title="Operational Compliance & Legal Feature Switches">
                <div className="space-y-4">
                  <div className="text-xs text-slate-500">
                    Feature switches allow Sanjeevani management to enable or disable financial products dynamically without code deployments.
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'RD_PRODUCT', title: 'Recurring Deposit (RD) Product Operations', desc: 'Allows opening and collecting on monthly RD accounts' },
                      { key: 'TERM_DEPOSIT', title: 'Term Deposit / Fixed Deposit Operations', desc: 'Allows opening term certificates' },
                      { key: 'COMMITTEE', title: 'Committee / Chit Fund Module (§42)', desc: 'Must remain OFF unless explicitly permitted by local jurisdiction' },
                      { key: 'LUCKY_DRAW', title: 'Lucky Draw & Promotional Scheme (§44)', desc: 'Must remain OFF unless permitted' },
                      { key: 'PREMATURE_WITHDRAWAL', title: 'Allow Premature Account Closures', desc: 'Enforces premature penalty deduction' },
                      { key: 'LOAN_GUARANTOR', title: 'Mandatory Guarantor Requirement', desc: 'Requires guarantor records on loans over ₹ 50,000' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <div className="font-bold text-sm text-slate-800">{item.title}</div>
                          <div className="text-xs text-slate-500">{item.desc}</div>
                        </div>
                        <Switch
                          checked={(featureFlags as any)[item.key]}
                          onChange={(checked) => handleToggleFlag(item.key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ),
          },
          {
            key: 'config',
            label: 'System Parameters (§104)',
            children: (
              <Card className="glass-card" title="Global Operational Parameters">
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="Company Name">Sanjeevani Finance Operations Ltd.</Descriptions.Item>
                  <Descriptions.Item label="Financial Year">FY 2026-2027 (April - March)</Descriptions.Item>
                  <Descriptions.Item label="Base Currency">INR (₹ - Indian Rupee)</Descriptions.Item>
                  <Descriptions.Item label="Timezone">Asia/Kolkata (IST +05:30)</Descriptions.Item>
                  <Descriptions.Item label="Customer ID Prefix">SJF-CUS-</Descriptions.Item>
                  <Descriptions.Item label="Loan ID Prefix">SJF-LN-</Descriptions.Item>
                  <Descriptions.Item label="Receipt ID Prefix">SJF-RCP-</Descriptions.Item>
                  <Descriptions.Item label="Daily Closing Cutoff">19:30 IST</Descriptions.Item>
                  <Descriptions.Item label="Maker-Checker Limit">₹ 1,00,000 (Branch Manager)</Descriptions.Item>
                  <Descriptions.Item label="Director Approval Limit">&gt; ₹ 3,00,000</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'branches',
            label: `Branches (${branches.length})`,
            children: (
              <Card className="glass-card">
                <Table
                  dataSource={branches}
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 800 }}
                  columns={[
                    { title: 'Branch Code', dataIndex: 'branchCode', key: 'code', render: (c) => <span className="font-mono font-bold text-emerald-700">{c}</span> },
                    { title: 'Branch Name', dataIndex: 'name', key: 'name' },
                    { title: 'City', dataIndex: 'city', key: 'city' },
                    { title: 'State', dataIndex: 'state', key: 'state' },
                    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
                    { title: 'Status', dataIndex: 'status', key: 'st', render: (s) => <Tag color="success">{s}</Tag> },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'staff',
            label: `Employees & Roles (${employees.length})`,
            children: (
              <Card className="glass-card">
                <Table
                  dataSource={employees}
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 800 }}
                  columns={[
                    { title: 'Employee ID', dataIndex: 'employeeNumber', key: 'emp', render: (e) => <span className="font-mono font-bold">{e}</span> },
                    { title: 'Staff Name', dataIndex: 'name', key: 'name' },
                    { title: 'Designation / Role', dataIndex: 'designation', key: 'role', render: (r) => <Tag color="blue">{r}</Tag> },
                    { title: 'Mobile', dataIndex: 'mobile', key: 'mob' },
                    { title: 'Assigned Branch', dataIndex: 'branchName', key: 'br' },
                    { title: 'Status', dataIndex: 'employmentStatus', key: 'st', render: (s) => <Tag color="green">{s}</Tag> },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
