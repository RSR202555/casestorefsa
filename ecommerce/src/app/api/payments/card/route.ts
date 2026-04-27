/**
 * POST /api/payments/card
 * Inicia pagamento com cartão de crédito via Mercado Pago.
 *
 * Fluxo:
 *  1. Recebe order_id + card_token (gerado pelo SDK MercadoPago.js no frontend)
 *  2. Cria o pagamento na API Mercado Pago POST /v1/payments
 *  3. Retorna status da transação (approved / pending / rejected)
 *
 * IMPORTANTE: nunca receber dados brutos do cartão — apenas o token
 * gerado pelo SDK JS do Mercado Pago (tokenização no frontend).
 *
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/payment-methods/receiving-payment-by-card
 */

import { NextRequest } from 'next/server';
import { OrderService } from '@/services/order.service';
import { requireAuth, isAuthError } from '@/middleware/auth';
import { ok, Errors, getClientIp } from '@/lib/utils';
import { checkRateLimit } from '@/middleware/rate-limit';
import { RATE_LIMITS, MP_API_BASE_URL } from '@/lib/constants';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const CardPaymentSchema = z.object({
  order_id: z.string().uuid('ID de pedido inválido'),
  card_token: z.string().min(1, 'Token do cartão obrigatório'),
  installments: z.number().int().min(1).max(12).default(1),
  payment_method_id: z.string().min(1, 'payment_method_id obrigatório'), // ex: 'visa', 'master'
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit('checkout', ip, RATE_LIMITS.CHECKOUT);
  if (!rl.allowed) return Errors.tooManyRequests();

  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('JSON inválido');
  }

  const parsed = CardPaymentSchema.safeParse(body);
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

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('[POST /api/payments/card] MP_ACCESS_TOKEN não configurada');
    return Errors.internal('Serviço de pagamento indisponível');
  }

  try {
    const supabase = createServiceClient();
    const { data: userData } = await supabase.auth.admin.getUserById(auth.userId);
    const customerEmail = userData?.user?.email ?? 'cliente@casestore.com.br';

    const amountBrl = order.total; // MP usa reais diretamente

    const res = await fetch(`${MP_API_BASE_URL}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': order.id,
      },
      body: JSON.stringify({
        transaction_amount: amountBrl,
        token: parsed.data.card_token,
        description: `CaseStore - Pedido #${order.id.slice(0, 8).toUpperCase()}`,
        installments: parsed.data.installments,
        payment_method_id: parsed.data.payment_method_id,
        external_reference: order.id,
        payer: {
          email: customerEmail,
          ...(order.customer_snapshot.full_name
            ? {
                first_name: order.customer_snapshot.full_name.split(' ')[0],
                last_name: order.customer_snapshot.full_name.split(' ').slice(1).join(' '),
              }
            : {}),
          ...(order.customer_snapshot.cpf
            ? {
                identification: {
                  type: 'CPF',
                  number: order.customer_snapshot.cpf.replace(/\D/g, ''),
                },
              }
            : {}),
        },
      }),
    });

    const result = await res.json() as {
      id?: number;
      status?: string;
      status_detail?: string;
      message?: string;
      error?: string;
      cause?: Array<{ description: string }>;
    };

    if (!res.ok) {
      const msg =
        result.cause?.[0]?.description ?? result.message ?? result.error ?? 'Pagamento recusado';
      console.error('[POST /api/payments/card] MP error:', result);
      return Errors.badRequest(msg);
    }

    const paymentId = String(result.id);
    const status = result.status ?? 'pending';

    // Persiste referência do pagamento
    await supabase
      .from('orders')
      .update({ payment_reference: paymentId })
      .eq('id', order.id);

    // Se aprovado imediatamente, marca como pago
    if (status === 'approved') {
      await OrderService.markAsPaid(
        order.id,
        paymentId,
        result as unknown as Record<string, unknown>,
        new Date().toISOString()
      );
    }

    return ok({
      payment_id: paymentId,
      status,
      status_detail: result.status_detail,
    });
  } catch (err) {
    console.error('[POST /api/payments/card]', err);
    return Errors.internal('Erro ao processar pagamento');
  }
}
