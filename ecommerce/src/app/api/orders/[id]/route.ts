/**
 * GET /api/orders/[id]
 * Clientes: acessam apenas seus próprios pedidos.
 * Admin: acessa qualquer pedido.
 */

import { NextRequest } from 'next/server';
import { OrderService } from '@/services/order.service';
import { requireAuth, isAuthError } from '@/middleware/auth';
import { ok, Errors } from '@/lib/utils';

type Params = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const isAdmin = auth.role === 'admin';

  try {
    const order = await OrderService.getById(
      params.id,
      isAdmin ? undefined : auth.userId,
      isAdmin
    );

    if (!order) return Errors.notFound('Pedido');
    return ok(order);
  } catch (err) {
    console.error('[GET /api/orders/[id]]', err);
    return Errors.internal();
  }
}
