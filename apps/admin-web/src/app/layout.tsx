import React from 'react';
import type { Metadata } from 'next';
import { ConfigProvider } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import AppShell from '@/components/layout/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sanjeevani Finance Management System | SFMS',
  description: 'Enterprise Financial Operations, Member Management, Loan Origination & Accounting System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#059669', // Emerald brand
                colorInfo: '#0284c7',
                colorSuccess: '#10b981',
                colorWarning: '#f59e0b',
                colorError: '#ef4444',
                borderRadius: 8,
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              },
              components: {
                Menu: {
                  darkItemBg: 'transparent',
                  darkItemSelectedBg: '#059669',
                  darkItemSelectedColor: '#ffffff',
                  darkItemColor: '#cbd5e1',
                  darkItemHoverBg: '#1e293b',
                  darkItemHoverColor: '#34d399',
                  itemBorderRadius: 8,
                  itemMarginInline: 8,
                },
              },
            }}
          >
            <AppShell>{children}</AppShell>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
