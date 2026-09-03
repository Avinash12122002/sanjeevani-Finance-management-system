const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    'antd',
    '@ant-design/icons',
    '@ant-design/nextjs-registry',
  ],
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', 'recharts', 'dayjs'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Keep compiled pages in memory longer to prevent ChunkLoadError on hot reload
  onDemandEntries: {
    maxInactiveAge: 120 * 1000,   // 2 minutes (default is 15s)
    pagesBufferLength: 10,         // keep 10 pages in memory (default is 2)
  },
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
