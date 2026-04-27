/**
 * GET  /api/products — Lista produtos (público para ativos; admin vê todos)
 * POST /api/products — Cria produto (admin only)
 */

import { NextRequest } from 'next/server';
import { ProductService } from '@/services/product.service';
import { requireAdmin, requireAuth, isAuthError } from '@/middleware/auth';
import { ok, Errors, getClientIp } from '@/lib/utils';
import { checkRateLimit } from '@/middleware/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';
import {
  ProductQuerySchema,
  CreateProductSchema,
} from '@/validators/product';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit('public_api', ip, RATE_LIMITS.PUBLIC_API);
  if (!rl.allowed) return Errors.tooManyRequests();

  // Tenta autenticar (opcional — não bloqueia se não autenticado)
  let isAdmin = false;
  const auth = await requireAuth(request);
  if (!isAuthError(auth)) {
    isAdmin = auth.role === 'admin';
  }

  const { searchParams } = request.nextUrl;
  const rawQuery = Object.fromEntries(searchParams.entries());

  const parsed = ProductQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return Errors.badRequest('Parâmetros inválidos', parsed.error.flatten());
  }

  try {
    const result = await ProductService.list(parsed.data, isAdmin);
    return ok(result);
  } catch (err) {
    console.error('[GET /api/products]', err);
    return Errors.internal();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('JSON inválido');
  }

  const parsed = CreateProductSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten());
  }

  try {
    const product = await ProductService.create(
      parsed.data,
      auth.userId,
      {
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? undefined,
      }
    );
    return ok(product, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar produto';
    if (msg.includes('já está em uso')) return Errors.conflict(msg);
    console.error('[POST /api/products]', err);
    return Errors.internal(msg);
  }
}
