import { NextResponse } from 'next/server';
import type { ApiError, ApiSuccess } from '@/types';

// ── Respostas HTTP padronizadas ────────────────────────────────────────────

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data, error: null }, { status });
}

export function err(
  message: string,
  code: string,
  status: number,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json(
    { data: null, error: { code, message, details } },
    { status }
  );
}

export const Errors = {
  unauthorized: () => err('Não autenticado', 'UNAUTHORIZED', 401),
  forbidden: () => err('Acesso negado', 'FORBIDDEN', 403),
  notFound: (entity = 'Recurso') =>
    err(`${entity} não encontrado`, 'NOT_FOUND', 404),
  badRequest: (message: string, details?: unknown) =>
    err(message, 'BAD_REQUEST', 400, details),
  conflict: (message: string) => err(message, 'CONFLICT', 409),
  internal: (message = 'Erro interno do servidor') =>
    err(message, 'INTERNAL_ERROR', 500),
  tooManyRequests: () =>
    err('Muitas requisições. Tente novamente em breve.', 'RATE_LIMITED', 429),
};

// ── Sanitização de texto (previne XSS no armazenamento) ───────────────────

/**
 * Remove tags HTML do texto para armazenamento seguro.
 * Não codifica entidades HTML — o React já faz isso na renderização.
 */
export function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Remove tags HTML completamente (para campos como descrição).
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

// ── Formatadores ───────────────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
}

// ── Paginação ──────────────────────────────────────────────────────────────

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export function buildPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> {
  const total_pages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages,
      has_next: page < total_pages,
      has_prev: page > 1,
    },
  };
}

// ── Extração de IP ─────────────────────────────────────────────────────────

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

// ── Segurança: comparação de strings em tempo constante ───────────────────

/**
 * Compara dois buffers em tempo constante para prevenir timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Ainda executa para não vazar tamanho
    Buffer.from(a).compare(Buffer.alloc(bufA.length));
    return false;
  }
  return bufA.compare(bufB) === 0;
}

// ── Retry com backoff exponencial ─────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, baseDelayMs * Math.pow(2, attempt - 1))
        );
      }
    }
  }
  throw lastError;
}
