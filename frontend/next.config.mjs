import createNextIntlPlugin from 'next-intl/plugin';
import { fileURLToPath } from 'node:url';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: fileURLToPath(new URL('.', import.meta.url)),
  },
  images: {

    unoptimized: true,
  },
  experimental: {
    // 防止 Turbopack 在开发模式下将整 个 .next 缓存加载进内存导致内存累积耗尽
    turbopackFileSystemCacheForDev: false,
  },
};

export default withNextIntl(nextConfig);
