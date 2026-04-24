/**
 * PATCH /api/orders/[id]/status — Altera status do pedido (admin only)
 */

import { NextRequest } from 'next/server';
import { OrderService } from '@/services/order.service';
import { requireAdmin, isAuthError } from '@/middleware/auth';
import { ok, Errors, getClientIp } from '@/lib/utils';
import { UpdateOrderStatusSchema } from '@/validators/order';

type Params = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('JSON inválido');
  }

  const parsed = UpdateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten());
  }

  try {
    const order = await OrderService.updateStatus(
      params.id,
      parsed.data,
      auth.userId,
      {
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? undefined,
      }
    );
    return ok(order);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar status';
    if (msg.includes('não encontrado')) return Errors.notFound('Pedido');
    if (msg.includes('Transição inválida')) return Errors.badRequest(msg);
    console.error('[PATCH /api/orders/[id]/status]', err);
    return Errors.internal(msg);
  }
}
