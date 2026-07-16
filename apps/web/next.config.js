/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@closerai/shared', 'retell-client-js-sdk'],
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${api}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
