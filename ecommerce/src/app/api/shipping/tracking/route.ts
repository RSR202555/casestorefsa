/**
 * PATCH /api/shipping/tracking
 * Atualiza código de rastreio de um pedido (admin only).
 * Também atualiza o status do pedido para 'enviado'.
 */

import { NextRequest } from 'next/server';
import { OrderService } from '@/services/order.service';
import { requireAdmin, isAuthError } from '@/middleware/auth';
import { ok, Errors, getClientIp } from '@/lib/utils';
import { UpdateTrackingSchema } from '@/validators/shipping';

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('JSON inválido');
  }

  const parsed = UpdateTrackingSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten());
  }

  const meta = {
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent') ?? undefined,
  };

  try {
    // Atualiza rastreio
    const order = await OrderService.updateTracking(
      parsed.data.order_id,
      parsed.data.tracking_code,
      parsed.data.shipping_method,
      parsed.data.estimated_delivery,
      auth.userId,
      meta
    );

    // Se o pedido estiver pago, avança para 'enviado'
    if (order.status === 'pago') {
      await OrderService.updateStatus(
        order.id,
        { status: 'enviado', note: `Código de rastreio: ${parsed.data.tracking_code}` },
        auth.userId,
        meta
      );
    }

    return ok({ message: 'Rastreio atualizado', order_id: order.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar rastreio';
    if (msg.includes('não encontrado')) return Errors.notFound('Pedido');
    console.error('[PATCH /api/shipping/tracking]', err);
    return Errors.internal(msg);
  }
}
