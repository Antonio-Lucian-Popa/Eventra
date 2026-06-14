/** @type {import('next').NextConfig} */
import path from 'node:path';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
