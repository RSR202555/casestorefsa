const ContentSecurityPolicy = `
  default-src 'self';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  object-src 'none';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co https://api.mercadopago.com https://api.correios.com.br https://*.public.blob.vercel-storage.com;
  frame-src 'self' https://www.google.com https://maps.google.com;
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, ' ')
  .trim()

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
    ],
    domains: [
      'images.unsplash.com',
      'localhost',
      // Supabase Storage — substitua pelo seu projeto
      `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '')
        ?.replace('/rest/v1', '') ?? 'placeholder.supabase.co'}`,
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Garante que variáveis server-side não vazem para o bundle do cliente
  serverRuntimeConfig: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    INFINITY_PAY_API_KEY: process.env.INFINITY_PAY_API_KEY,
    INFINITY_PAY_WEBHOOK_SECRET: process.env.INFINITY_PAY_WEBHOOK_SECRET,
    CORREIOS_API_USER: process.env.CORREIOS_API_USER,
    CORREIOS_API_PASS: process.env.CORREIOS_API_PASS,
    CORREIOS_CONTRACT_NUMBER: process.env.CORREIOS_CONTRACT_NUMBER,
  },
  publicRuntimeConfig: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
