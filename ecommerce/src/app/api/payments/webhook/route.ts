/**
 * POST /api/payments/webhook
 * Receptor de webhooks do Mercado Pago.
 *
 * Segurança obrigatória:
 *  1. Valida assinatura HMAC-SHA256 antes de qualquer processamento
 *  2. Rejeita requisições sem assinatura ou com assinatura inválida
 *  3. Idempotente — processa cada evento uma única vez
 *
 * Headers de assinatura do Mercado Pago:
 *  x-signature: ts=<timestamp>,v1=<hmac-sha256>
 *  x-request-id: <uuid>
 *
 * Configure a URL do webhook no painel Mercado Pago:
 *  https://yourdomain.com/api/payments/webhook
 *
 * Rota EXCLUÍDA da verificação CSRF (usa validação por assinatura própria).
 */

import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment.service';
import { OrderService } from '@/services/order.service';
import { AuditService } from '@/services/audit.service';
import { checkRateLimit } from '@/middleware/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';
import { getClientIp, withRetry } from '@/lib/utils';
import { MercadoPagoWebhookSchema } from '@/validators/payment';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit('webhook', ip, RATE_LIMITS.WEBHOOK);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  // Lê o corpo raw para validação de assinatura
  const rawBody = await request.text();

  // ── PASSO 1: Validar assinatura ───────────────────────────────────────────
  // MP envia x-signature: ts=<timestamp>,v1=<hmac-sha256>
  const signature = request.headers.get('x-signature');
  const requestId = request.headers.get('x-request-id');

  // Extrai o data.id do payload para validar a assinatura
  let dataId: string = '';
  try {
    const parsed = JSON.parse(rawBody) as { data?: { id?: string } };
    dataId = parsed?.data?.id ?? '';
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const isValid = PaymentService.validateWebhookSignature(dataId, requestId, signature);

  if (!isValid) {
    console.warn('[webhook] Assinatura inválida ou ausente — IP:', ip);
    await AuditService.log({
      action: 'webhook.invalid_signature',
      entity_type: 'payment',
      ip_address: ip,
    });
    return NextResponse.json({ received: false }, { status: 401 });
  }

  // ── PASSO 2: Parse do payload ─────────────────────────────────────────────
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // ── PASSO 3: Processar evento com retry ───────────────────────────────────
  try {
    await withRetry(async () => {
      // Busca o pagamento na API MP para obter o status real
      const event = await PaymentService.parseWebhookEvent(parsedBody);

      // Valida com o schema interno
      const validated = MercadoPagoWebhookSchema.safeParse(event);
      if (!validated.success) {
        // Evento desconhecido ou status intermediário (ex: pending) — ignora silenciosamente
        console.info('[webhook] Evento ignorado (não mapeado):', event.event);
        return;
      }

      const ev = validated.data;

      switch (ev.event) {
        case 'payment.confirmed': {
          const order = await OrderService.getByPaymentReference(ev.order_reference);
          if (!order) {
            // Tenta também buscar pelo payment_id (MP retorna payment_id no external_reference)
            console.error('[webhook] Pedido não encontrado para referência:', ev.order_reference);
            return;
          }
          await OrderService.markAsPaid(
            order.id,
            ev.payment_id,
            parsedBody as Record<string, unknown>,
            ev.paid_at ?? new Date().toISOString()
          );
          break;
        }

        case 'payment.failed':
          await OrderService.markPaymentFailed(ev.order_reference, 'failed');
          break;

        case 'payment.expired':
          await OrderService.markPaymentFailed(ev.order_reference, 'expired');
          break;

        case 'payment.refunded':
          await OrderService.markPaymentFailed(ev.order_reference, 'refunded');
          break;

        default:
          console.warn('[webhook] Evento desconhecido:', (ev as { event: string }).event);
      }
    }, 3, 1000);
  } catch (err) {
    console.error('[webhook] Falha após retries:', err);
    await AuditService.log({
      action: 'webhook.processing_failed',
      entity_type: 'payment',
      new_data: { error: String(err) },
    });
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
