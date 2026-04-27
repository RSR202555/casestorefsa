import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, Errors } from '@/lib/utils';
import { RegisterSchema } from '@/validators/auth';
import { checkRateLimit } from '@/middleware/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';
import { getClientIp } from '@/lib/utils';

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIp(request);
  const rl = await checkRateLimit('auth', ip, RATE_LIMITS.AUTH);
  if (!rl.allowed) return Errors.tooManyRequests();

  // Parse e validação
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('JSON inválido');
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten());
  }

  const { email, password, full_name, phone, cpf } = parsed.data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  // Cadastro público deve exigir comprovação do e-mail antes da ativação.
  const supabase = createServerClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/conta`,
      data: {
        full_name,
        phone: phone ?? null,
        cpf: cpf ?? null,
      },
    },
  });

  if (error) {
    const normalizedMessage = error.message.toLowerCase();
    if (
      normalizedMessage.includes('already registered') ||
      normalizedMessage.includes('already exists') ||
      normalizedMessage.includes('duplicate')
    ) {
      return ok(
        {
          message:
            'Se o e-mail estiver disponível, você receberá um link de confirmação para ativar a conta.',
        },
        201
      );
    }
    console.error('[register]', error.message);
    return Errors.internal('Erro ao criar conta');
  }

  return ok(
    {
      message:
        'Cadastro recebido. Confira seu e-mail para confirmar a conta antes de entrar.',
    },
    201
  );
}
