/**
 * Next.js Middleware — executado na Edge antes de cada requisição.
 *
 * Responsabilidades:
 *  1. Renovação automática de sessão Supabase (refresh token)
 *  2. Proteção de rotas: redireciona usuários não autenticados
 *  3. Proteção de rotas admin: bloqueia clientes
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { validateCsrf } from '@/middleware/csrf';

// Rotas que exigem autenticação
const PROTECTED_ROUTES = [
  '/conta',
  '/admin',
  '/api/orders',
  '/api/cart',
  '/api/payments/pix',
];

// Rotas exclusivas para admin
const ADMIN_ROUTES = [
  '/api/admin',
  '/api/products',      // POST/PUT/DELETE
  '/api/inventory',
  '/api/shipping/tracking',
];

// Rotas que nunca devem ser acessadas por usuário autenticado
const AUTH_ROUTES = ['/login', '/registro'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;
  }

  // Cria cliente Supabase com acesso aos cookies da requisição
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Atualiza sessão (renova token se necessário)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redireciona usuário autenticado para longe das páginas de auth
  if (user && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/conta', request.url));
  }

  // Bloqueia rotas protegidas para não autenticados
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (isProtected && !user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Para rotas admin: o papel é verificado no route handler (não aqui,
  // pois o middleware Edge não tem acesso ao banco com service key).
  // O middleware apenas garante que o usuário está autenticado.
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  if (isAdminRoute && !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } },
      { status: 401 }
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Executa em todas as rotas exceto arquivos estáticos e _next
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
