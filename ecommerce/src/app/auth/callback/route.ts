/**
 * GET /auth/callback
 * Processa o código de confirmação enviado pelo Supabase por e-mail.
 *
 * Fluxo:
 *  1. Usuário clica no link do e-mail de confirmação
 *  2. Supabase redireciona para esta rota com ?code=...
 *  3. Trocamos o código por uma sessão (PKCE)
 *  4. Redirecionamos o usuário para a página inicial (logado)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Confirmação bem-sucedida — redireciona para a página solicitada ou home
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('[auth/callback] Erro ao trocar código:', error.message);
  }

  // Falha — redireciona para login com mensagem de erro
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
