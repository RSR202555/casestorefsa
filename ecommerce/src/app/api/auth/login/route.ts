import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, Errors, getClientIp } from '@/lib/utils';
import { LoginSchema } from '@/validators/auth';
import { checkRateLimit } from '@/middleware/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit('auth', ip, RATE_LIMITS.AUTH);
  if (!rl.allowed) return Errors.tooManyRequests();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('JSON inválido');
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten());
  }

  const supabase = createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Distingue erro de e-mail não confirmado dos demais
    if (
      error.message.toLowerCase().includes('email not confirmed') ||
      error.message.toLowerCase().includes('email_not_confirmed')
    ) {
      return Errors.badRequest('E-mail ainda não confirmado. Verifique sua caixa de entrada.');
    }
    return Errors.badRequest('E-mail ou senha inválidos');
  }

  return ok({
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    // O token de sessão é gerenciado pelo Supabase via cookies HttpOnly
    message: 'Login realizado com sucesso',
  });
}
