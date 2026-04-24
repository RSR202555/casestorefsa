/**
 * GET   /api/inventory — Lista estoque (admin only)
 * PATCH /api/inventory — Ajuste manual de estoque (admin only)
 */

import { NextRequest } from 'next/server';
import { InventoryService, InsufficientStockError } from '@/services/inventory.service';
import { requireAdmin, isAuthError } from '@/middleware/auth';
import { ok, Errors, getClientIp, buildPaginationResult } from '@/lib/utils';
import { AdjustInventorySchema, InventoryQuerySchema } from '@/validators/inventory';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = request.nextUrl;
  const parsed = InventoryQuerySchema.safeParse(
    Object.fromEntries(searchParams)
  );
  if (!parsed.success) {
    return Errors.badRequest('Parâmetros inválidos', parsed.error.flatten());
  }

  try {
    const result = await InventoryService.list({
      low_stock_only: parsed.data.low_stock_only,
      product_id: parsed.data.product_id,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });
    return ok(
      buildPaginationResult(
        result.data,
        result.total,
        parsed.data.page,
        parsed.data.limit
      )
    );
  } catch (err) {
    console.error('[GET /api/inventory]', err);
    return Errors.internal();
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('JSON inválido');
  }

  const parsed = AdjustInventorySchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten());
  }

  try {
    const inventory = await InventoryService.adjust(
      parsed.data,
      auth.userId,
      {
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? undefined,
      }
    );
    return ok(inventory);
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return Errors.badRequest(err.message);
    }
    const msg = err instanceof Error ? err.message : 'Erro ao ajustar estoque';
    console.error('[PATCH /api/inventory]', err);
    return Errors.internal(msg);
  }
}
