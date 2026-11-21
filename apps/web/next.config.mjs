import {existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// The monorepo keeps shared local configuration at the repository root.
// Next runs this workspace from apps/web, so explicitly load that root file
// to keep local auth/database/search settings consistent with workers/scripts.
if (typeof process.loadEnvFile === 'function') {
  const rootEnv=resolve(dirname(fileURLToPath(import.meta.url)),'../../.env.local');
  if(existsSync(rootEnv)) process.loadEnvFile(rootEnv);
}

const isProduction = process.env.NODE_ENV === 'production';
const scriptSrc = isProduction ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), payment=(self)' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
  { key: 'Content-Security-Policy', value: `default-src 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https: wss:; ${scriptSrc}; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` }
];

export default {
  output: 'standalone',
  compress: true,
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  }
};
