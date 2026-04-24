import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ok, Errors } from '@/lib/utils';

export async function POST(_request: NextRequest) {
  const supabase = createServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[logout]', error.message);
    return Errors.internal('Erro ao sair');
  }

  return ok({ message: 'Logout realizado com sucesso' });
}
