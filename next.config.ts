import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-libsql', '@libsql/client'],
};
export default config;
