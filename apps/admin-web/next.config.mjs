const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@sanjeevani/shared-types',
    '@sanjeevani/financial-engine',
    'antd',
    '@ant-design/icons',
    '@ant-design/nextjs-registry',
  ],
  async rewrites() {
    const target = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1';
    const baseUrl = target.replace(/\/v1\/?$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${baseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
