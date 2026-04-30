import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ok, Errors } from '@/lib/utils';
import { RegisterSchema } from '@/validators/auth';
import { checkRateLimit } from '@/middleware/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';
import { getClientIp } from '@/lib/utils';

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIp(request);
  const rl = checkRateLimit('auth', ip, RATE_LIMITS.AUTH);
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

  // Usa service role para criar o usuário sem enviar e-mail de confirmação,
  // evitando o rate limit de e-mails do Supabase no plano gratuito.
  const supabase = createServiceClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone: phone ?? null, cpf: cpf ?? null },
  });

  if (error) {
    if (
      error.message.toLowerCase().includes('already registered') ||
      error.message.toLowerCase().includes('already exists') ||
      error.message.toLowerCase().includes('duplicate')
    ) {
      return Errors.conflict('E-mail já cadastrado');
    }
    console.error('[register]', error.message);
    return Errors.internal('Erro ao criar conta');
  }

  if (data.user?.id) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          role: 'customer',
          full_name,
          phone: phone ?? null,
          cpf: cpf ?? null,
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.error('[register profile]', profileError.message);
      return Errors.internal('Erro ao criar perfil da conta');
    }
  }

  return ok(
    { user_id: data.user?.id, message: 'Conta criada com sucesso! Você já pode entrar.' },
    201
  );
}
