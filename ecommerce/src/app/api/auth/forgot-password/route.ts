/**
 * POST /api/auth/forgot-password
 * Envia e-mail de recuperação de senha com redirect para /reset-password.
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, Errors, getClientIp } from '@/lib/utils';
import { checkRateLimit } from '@/middleware/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';
import { z } from 'zod';

const Schema = z.object({
  email: z.string().email('E-mail inválido'),
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://case-storefsa.vercel.app';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit('auth', ip, RATE_LIMITS.AUTH);
  if (!rl.allowed) return Errors.tooManyRequests();

  let body: unknown;
  try { body = await request.json(); } catch { return Errors.badRequest('JSON inválido'); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Errors.badRequest('E-mail inválido');

  const supabase = createServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  // Sempre retorna sucesso para não revelar se o e-mail existe
  return ok({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções.' });
}
