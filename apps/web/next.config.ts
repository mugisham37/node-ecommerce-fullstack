import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: [
      '@ecommerce/shared',
      '@ecommerce/api-client',
      '@ecommerce/validation',
    ],
  },

  // Transpile packages from the monorepo
  transpilePackages: [
    '@ecommerce/shared',
    '@ecommerce/api-client',
    '@ecommerce/validation',
    '@ecommerce/ui',
  ],

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: [
      'localhost',
      // Add your production domains here
    ],
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/overview',
        permanent: false,
      },
    ];
  },

  // Output configuration
  output: 'standalone',

  // Compression
  compress: true,

  // Power by header
  poweredByHeader: false,

  // React strict mode
  reactStrictMode: true,

  // Trailing slash
  trailingSlash: false,

  // TypeScript configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
