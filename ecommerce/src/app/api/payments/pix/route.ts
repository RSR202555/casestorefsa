/**
 * POST /api/payments/pix
 * Gera um pagamento PIX para um pedido existente via Mercado Pago.
 * Retorna código copia-e-cola e URL do QR code.
 *
 * NUNCA confiar em status de pagamento vindo do frontend.
 * O status real vem exclusivamente pelo webhook /api/payments/webhook.
 */

import { NextRequest } from 'next/server';
import { OrderService } from '@/services/order.service';
import { PaymentService } from '@/services/payment.service';
import { requireAuth, isAuthError } from '@/middleware/auth';
import { ok, Errors, getClientIp } from '@/lib/utils';
import { checkRateLimit } from '@/middleware/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';
import { GeneratePixSchema } from '@/validators/payment';
import { createServiceClient } from '@/lib/supabase/server';

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

  const parsed = GeneratePixSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten());
  }

  const order = await OrderService.getById(
    parsed.data.order_id,
    auth.userId,
    auth.role === 'admin'
  );
  if (!order) return Errors.notFound('Pedido');

  if (order.payment_status === 'paid') {
    return Errors.conflict('Este pedido já foi pago');
  }

  if (order.payment_method !== 'pix') {
    return Errors.badRequest('Este pedido não usa PIX como método de pagamento');
  }

  try {
    // Busca email do cliente
    const supabase = createServiceClient();
    const { data: userData } = await supabase.auth.admin.getUserById(auth.userId);
    const customerEmail = userData?.user?.email ?? 'cliente@essenciafeminina.com';

    const pix = await PaymentService.generatePix({
      orderId: order.id,
      amount: Math.round(order.total * 100), // reais → centavos
      customerName: order.customer_snapshot.full_name || 'Cliente',
      customerEmail,
      customerCpf: order.customer_snapshot.cpf,
      description: `Essência Feminina - Pedido #${order.id.slice(0, 8).toUpperCase()}`,
    });

    // Persiste a referência do pagamento (charge_id) no pedido
    await supabase
      .from('orders')
      .update({ payment_reference: pix.payment_id })
      .eq('id', order.id);

    return ok(pix);
  } catch (err) {
    console.error('[POST /api/payments/pix]', err);
    return Errors.internal('Erro ao gerar PIX');
  }
}
