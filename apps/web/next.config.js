const withNextIntl = require('next-intl/plugin')('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['monaco-editor'],

  // Proxy API requests to FastAPI backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/:path*`
          : 'http://api:8000/api/v1/:path*',
      },
    ];
  },

  webpack: (config, { isServer }) => {
    // Handle monaco-editor
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
