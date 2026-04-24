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
}

module.exports = nextConfig
