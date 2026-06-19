import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  distDir: '.next',
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  serverActions: {
    allowedOrigins: ['localhost:3000', 'localhost:5000', '127.0.0.1:3000', '127.0.0.1:5000'],
  },
  experimental: {
    optimizePackageImports: [
      'recharts',
      'lucide-react',
      'date-fns',
      'exceljs',
      'xlsx',
      'pptxgenjs',
    ],
  },
  outputFileTracingExcludes: {
    '*': [
      '**/electron/**',
      '**/mobile-app/**',
      '**/scripts/**',
      '**/drizzle/**',
      '**/docs-archive/**',
      '**/backups/**',
      '**/.git/**',
    ],
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
        chunkIds: 'named',
      };
    }

    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendors: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            charts: {
              test: /[\\/]node_modules[\\/](recharts|d3-)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 20,
            },
            excel: {
              test: /[\\/]node_modules[\\/](exceljs|xlsx)[\\/]/,
              name: 'excel',
              chunks: 'all',
              priority: 20,
            },
            ui: {
              test: /[\\/]node_modules[\\/](lucide-react|@hello-pangea)[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 20,
            },
          },
          maxInitialRequests: 25,
          minSize: 20000,
        },
        minimize: true,
      };
    }

    return config;
  },
  serverExternalPackages: ['pg', 'drizzle-orm', 'drizzle-kit', 'bcryptjs'],
  allowedDevOrigins: ['https://3000-fd63a80e84d5dda2.monkeycode-ai.online', '*.monkeycode-ai.online'],
};

export default withNextIntl(nextConfig);
