/** @type {import('next').NextConfig} */
import path from 'node:path';

const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  reactStrictMode: true,
  basePath: isProd ? '/eventpro' : '',
  assetPrefix: isProd ? '/eventpro' : '',
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
