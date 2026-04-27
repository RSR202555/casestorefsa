/**
 * POST /api/payments/preference
 * Cria uma preferência de pagamento do Mercado Pago (Checkout Pro).
 *
 * Fluxo:
 *  1. Recebe order_id
 *  2. Cria a preferência na API MP com os itens do pedido + back_urls
 *  3. Retorna a init_point (URL para redirecionar o cliente)
 *
 * Após o pagamento, MP redireciona o cliente para as back_urls configuradas.
 * O status real é atualizado pelo webhook /api/payments/webhook.
 *
 * Docs: https://www.mercadopago.com.br/developers/pt/reference/preferences/resource
 */

import { NextRequest } from 'next/server';
import { OrderService } from '@/services/order.service';
import { requireAuth, isAuthError } from '@/middleware/auth';
import { ok, Errors, getClientIp } from '@/lib/utils';
import { checkRateLimit } from '@/middleware/rate-limit';
import { RATE_LIMITS, MP_API_BASE_URL } from '@/lib/constants';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const PreferenceSchema = z.object({
  order_id: z.string().uuid('ID de pedido inválido'),
});

function getBaseUrl(request: NextRequest): string {
  // Em produção (Vercel), usa a URL do deploy
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  // Em desenvolvimento, usa o origin da request
  const origin = request.headers.get('origin') ?? 'http://localhost:3000';
  return origin;
}

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

  const parsed = PreferenceSchema.safeParse(body);
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
    console.error('[POST /api/payments/preference] MP_ACCESS_TOKEN não configurada');
    return Errors.internal('Serviço de pagamento indisponível');
  }

  try {
    const supabase = createServiceClient();
    const { data: userData } = await supabase.auth.admin.getUserById(auth.userId);
    const customerEmail = userData?.user?.email ?? 'cliente@casestore.com.br';

    const baseUrl = getBaseUrl(request);

    const preferenceBody = {
      external_reference: order.id,
      items: [
        {
          id: order.id,
          title: `CaseStore — Pedido #${order.id.slice(0, 8).toUpperCase()}`,
          description: `Pedido com ${order.items?.length ?? 1} item(s)`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: order.total, // MP usa reais
        },
      ],
      payer: {
        email: customerEmail,
        ...(order.customer_snapshot.full_name
          ? {
              name: order.customer_snapshot.full_name.split(' ')[0],
              surname: order.customer_snapshot.full_name.split(' ').slice(1).join(' '),
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
      back_urls: {
        success: `${baseUrl}/checkout/confirmacao/${order.id}`,
        failure: `${baseUrl}/checkout/pagamento/${order.id}?method=card&status=failed`,
        pending: `${baseUrl}/checkout/confirmacao/${order.id}?status=pending`,
      },
      auto_return: 'approved', // redireciona automaticamente após aprovação
      notification_url: `${baseUrl}/api/payments/webhook`,
      statement_descriptor: 'CASESTORE',
    };

    const res = await fetch(`${MP_API_BASE_URL}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': `pref-${order.id}`,
      },
      body: JSON.stringify(preferenceBody),
    });

    const result = await res.json() as {
      id?: string;
      init_point?: string;
      sandbox_init_point?: string;
      message?: string;
      error?: string;
      cause?: Array<{ description: string }>;
    };

    if (!res.ok) {
      const msg =
        result.cause?.[0]?.description ?? result.message ?? result.error ?? 'Erro ao criar preferência';
      console.error('[POST /api/payments/preference] MP error:', result);
      return Errors.badRequest(msg);
    }

    // Persiste a referência do pagamento (preference_id) no pedido
    await supabase
      .from('orders')
      .update({ payment_reference: result.id })
      .eq('id', order.id);

    return ok({
      preference_id: result.id,
      init_point: result.init_point, // URL de produção
    });
  } catch (err) {
    console.error('[POST /api/payments/preference]', err);
    return Errors.internal('Erro ao criar preferência de pagamento');
  }
}
