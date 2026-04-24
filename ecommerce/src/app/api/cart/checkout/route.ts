/**
 * POST /api/cart/checkout
 * Cria um pedido a partir do carrinho.
 * Valida estoque, cria snapshot e reserva produtos.
 */

import { NextRequest } from 'next/server';
import { OrderService } from '@/services/order.service';
import { requireAuth, isAuthError } from '@/middleware/auth';
import { ok, Errors, getClientIp } from '@/lib/utils';
import { checkRateLimit } from '@/middleware/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';
import { CheckoutSchema } from '@/validators/order';
import { InsufficientStockError } from '@/services/inventory.service';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit('checkout', ip, RATE_LIMITS.CHECKOUT);
  if (!rl.allowed) return Errors.tooManyRequests();

  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('JSON inválido');
  }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten());
  }

  try {
    const order = await OrderService.createFromCheckout(
      parsed.data,
      auth.userId
    );
    return ok(order, 201);
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return Errors.badRequest(err.message);
    }
    const msg = err instanceof Error ? err.message : 'Erro ao criar pedido';
    console.error('[POST /api/cart/checkout]', err);
    return Errors.internal(msg);
  }
}
