/**
 * Proteção CSRF para rotas de mutação (POST, PUT, PATCH, DELETE).
 *
 * Estratégia: Double Submit Cookie Pattern
 *  1. GET /api/csrf → gera token, grava em cookie HttpOnly + retorna no corpo
 *  2. Frontend inclui o token no header `x-csrf-token` em cada mutação
 *  3. Este middleware verifica que o header bate com o cookie
 *
 * Rotas excluídas: webhooks externos (validam por assinatura HMAC própria)
 */

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CSRF_COOKIE = '__csrf';
const CSRF_HEADER = 'x-csrf-token';
const TOKEN_LENGTH = 32; // bytes

// Rotas que possuem validação própria de autenticidade (ex: HMAC de webhook)
const CSRF_EXEMPT_PATHS = ['/api/payments/webhook'];

// Métodos seguros que não precisam de proteção CSRF
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function generateCsrfToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Valida o token CSRF da requisição.
 * Retorna null se válido, ou uma NextResponse de erro se inválido.
 */
export function validateCsrf(
  request: NextRequest
): NextResponse | null {
  if (SAFE_METHODS.has(request.method)) return null;
  if (CSRF_EXEMPT_PATHS.some((p) => request.nextUrl.pathname.startsWith(p))) {
    return null;
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) {
    return NextResponse.json(
      { data: null, error: { code: 'CSRF_MISSING', message: 'Token CSRF ausente' } },
      { status: 403 }
    );
  }

  // Comparação em tempo constante
  const bufCookie = Buffer.from(cookieToken);
  const bufHeader = Buffer.from(headerToken);

  const valid =
    bufCookie.length === bufHeader.length &&
    crypto.timingSafeEqual(bufCookie, bufHeader);

  if (!valid) {
    return NextResponse.json(
      { data: null, error: { code: 'CSRF_INVALID', message: 'Token CSRF inválido' } },
      { status: 403 }
    );
  }

  return null; // válido
}

/**
 * Define o cookie CSRF na resposta.
 */
export function setCsrfCookie(
  response: NextResponse,
  token: string
): NextResponse {
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 horas
  });
  return response;
}
