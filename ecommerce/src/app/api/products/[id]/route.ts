/**
 * GET    /api/products/[id] — Detalhe do produto (público)
 * PUT    /api/products/[id] — Atualiza produto (admin)
 * DELETE /api/products/[id] — Desativa produto (admin, soft delete)
 */

import { NextRequest } from 'next/server';
import { ProductService } from '@/services/product.service';
import { requireAdmin, requireAuth, isAuthError } from '@/middleware/auth';
import { ok, Errors, getClientIp } from '@/lib/utils';
import { UpdateProductSchema } from '@/validators/product';

type Params = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Params) {
  let isAdmin = false;
  const auth = await requireAuth(request);
  if (!isAuthError(auth)) isAdmin = auth.role === 'admin';

  const product = await ProductService.getById(params.id, isAdmin).catch(() => null);
  if (!product) return Errors.notFound('Produto');

  return ok(product);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('JSON inválido');
  }

  const parsed = UpdateProductSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten());
  }

  try {
    const product = await ProductService.update(
      params.id,
      parsed.data,
      auth.userId,
      {
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? undefined,
      }
    );
    return ok(product);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar produto';
    if (msg.includes('não encontrado')) return Errors.notFound('Produto');
    console.error('[PUT /api/products/[id]]', err);
    return Errors.internal(msg);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    await ProductService.deactivate(params.id, auth.userId, {
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? undefined,
    });
    return ok({ message: 'Produto desativado com sucesso' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao desativar produto';
    if (msg.includes('não encontrado')) return Errors.notFound('Produto');
    console.error('[DELETE /api/products/[id]]', err);
    return Errors.internal(msg);
  }
}
