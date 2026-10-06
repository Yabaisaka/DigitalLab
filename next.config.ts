import type { NextConfig } from 'next';
const config: NextConfig = {
  devIndicators: false,
  output: 'standalone', serverExternalPackages: ['pg', 'pdfkit', 'svg-to-pdfkit', 'exceljs'],
  outputFileTracingIncludes: { '/api/labels': ['./assets/fonts/**/*'] },
  outputFileTracingExcludes: { '/*': ['./uploads/**/*','./backups/**/*','./.local-db/**/*','./.env*','./test-results/**/*','./tests/**/*','./node_modules/@embedded-postgres/**/*'] },
  async headers() { return [{ source: '/:path*', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'same-origin' },
    { key: 'Content-Security-Policy', value: `default-src 'self'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV==='development'?" 'unsafe-eval'":''}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'` }
  ] }]; }
};
export default config;
