/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://64.112.127.107:3000/api/v1/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://64.112.127.107:3000/uploads/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'status-admin-dashboard.vercel.app',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
