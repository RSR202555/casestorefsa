/**
 * POST /api/admin/reset-user-password
 * Redefine a senha de um usuário diretamente via service role (sem e-mail).
 * Protegido por requireAdmin — apenas admins autenticados podem usar.
 */

import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin, isAuthError } from '@/middleware/auth';
import { ok, Errors } from '@/lib/utils';
import { z } from 'zod';

const Schema = z.object({
  email: z.string().email(),
  new_password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  let body: unknown;
  try { body = await request.json(); } catch { return Errors.badRequest('JSON inválido'); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Errors.badRequest('Dados inválidos', parsed.error.flatten());

  const supabase = createServiceClient();

  // Busca o usuário pelo e-mail
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) return Errors.internal('Erro ao buscar usuários');

  const user = listData.users.find((u) => u.email === parsed.data.email);
  if (!user) return Errors.notFound('Usuário');

  // Atualiza a senha diretamente
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: parsed.data.new_password,
    email_confirm: true, // garante que o e-mail também fica confirmado
  });

  if (updateError) {
    console.error('[reset-user-password]', updateError.message);
    return Errors.internal('Erro ao redefinir senha');
  }

  return ok({ message: `Senha do usuário ${parsed.data.email} redefinida com sucesso.` });
}
