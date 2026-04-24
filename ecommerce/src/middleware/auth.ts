/**
 * Middleware de autenticação e autorização.
 *
 * Uso nos route handlers:
 *   const auth = await requireAuth(request);
 *   if (auth instanceof NextResponse) return auth; // não autenticado
 *
 *   const adminCheck = await requireAdmin(request);
 *   if (adminCheck instanceof NextResponse) return adminCheck; // não é admin
 *
 * A verificação de papel SEMPRE acontece no servidor — nunca confiamos
 * em claims de papel vindas do cliente/token sem confirmar no banco.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import type { AuthenticatedRequest, UserRole } from '@/types';

/**
 * Verifica se a requisição tem uma sessão válida.
 * Retorna os dados do usuário ou uma resposta 401.
 */
export async function requireAuth(
  _request: NextRequest
): Promise<AuthenticatedRequest | NextResponse> {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } },
        { status: 401 }
      );
    }

    // Busca papel do usuário no banco — nunca usa claims do token
    const serviceClient = createServiceClient();
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'Perfil de usuário não encontrado',
          },
        },
        { status: 401 }
      );
    }

    return {
      userId: user.id,
      role: profile.role as UserRole,
      email: user.email ?? '',
    };
  } catch (err) {
    console.error('[requireAuth] Exceção:', err);
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Erro de autenticação' } },
      { status: 500 }
    );
  }
}

/**
 * Exige papel de admin. Retorna os dados do usuário ou uma resposta 403.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AuthenticatedRequest | NextResponse> {
  const result = await requireAuth(request);

  if (result instanceof NextResponse) return result;

  if (result.role !== 'admin') {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Acesso negado' } },
      { status: 403 }
    );
  }

  return result;
}

/**
 * Exige papel de customer (ou admin — admins têm acesso total).
 */
export async function requireCustomer(
  request: NextRequest
): Promise<AuthenticatedRequest | NextResponse> {
  const result = await requireAuth(request);

  if (result instanceof NextResponse) return result;

  if (result.role !== 'customer' && result.role !== 'admin') {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Acesso negado' } },
      { status: 403 }
    );
  }

  return result;
}

/**
 * Type guard: verifica se o resultado é um erro de resposta HTTP.
 */
export function isAuthError(
  result: AuthenticatedRequest | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
