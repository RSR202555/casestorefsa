/**
 * GET /api/orders — Lista pedidos
 *   - Cliente: retorna apenas seus próprios pedidos
 *   - Admin: retorna todos (com filtros opcionais)
 */

import { NextRequest } from 'next/server';
import { OrderService } from '@/services/order.service';
import { requireAuth, isAuthError } from '@/middleware/auth';
import { ok, Errors } from '@/lib/utils';
import { OrderQuerySchema } from '@/validators/order';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = request.nextUrl;
  const parsed = OrderQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return Errors.badRequest('Parâmetros inválidos', parsed.error.flatten());
  }

  const isAdmin = auth.role === 'admin';

  try {
    const result = await OrderService.list(
      parsed.data,
      auth.userId,
      isAdmin
    );
    return ok(result);
  } catch (err) {
    console.error('[GET /api/orders]', err);
    return Errors.internal();
  }
}
