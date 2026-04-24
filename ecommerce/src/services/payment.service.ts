/**
 * Serviço de Pagamentos — Mercado Pago API v1.
 *
 * Docs: https://www.mercadopago.com.br/developers/pt/reference
 *
 * Fluxo PIX:
 *  1. Frontend chama POST /api/payments/pix com order_id
 *  2. Este serviço cria um pagamento PIX via POST /v1/payments
 *  3. Mercado Pago chama nosso webhook ao confirmar/falhar
 *  4. Webhook valida assinatura e atualiza o pedido
 *
 * Autenticação: Bearer token
 *   Authorization: Bearer <MP_ACCESS_TOKEN>
 *
 * Variáveis de ambiente necessárias:
 *   MP_ACCESS_TOKEN   — token de acesso (produção ou sandbox)
 *   MP_WEBHOOK_SECRET — chave secreta do webhook configurada no painel MP
 *
 * NUNCA confiar em status de pagamento vindo do frontend.
 */

import crypto from 'crypto';
import { MP_API_BASE_URL, PIX_EXPIRATION_SECONDS } from '@/lib/constants';
import { withRetry } from '@/lib/utils';
import type { PixPaymentResponse, WebhookPaymentEvent } from '@/types';

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`[PaymentService] ${name} não configurada`);
  return value;
}

function authHeader(token: string): string {
  return `Bearer ${token}`;
}

// ── Tipos internos da resposta Mercado Pago ──────────────────────────────────

interface MpPixResponse {
  id: number;
  status: string;         // 'pending' | 'approved' | 'rejected' | 'cancelled'
  external_reference: string;
  point_of_interaction: {
    transaction_data: {
      qr_code: string;         // código EMV copia-e-cola
      qr_code_base64: string;  // imagem QR code em base64
      ticket_url?: string;     // URL do ticket MP
    };
  };
  date_of_expiration: string; // ISO 8601
}

interface MpPaymentResponse {
  id: number;
  status: string;           // 'approved' | 'pending' | 'rejected' | 'cancelled' | 'refunded'
  status_detail: string;
  external_reference: string;
  date_approved?: string;
}

interface MpErrorResponse {
  message?: string;
  error?: string;
  cause?: Array<{ description: string }>;
}

// ── Tipos do webhook Mercado Pago ────────────────────────────────────────────

interface MpWebhookPayload {
  id: number;           // notification ID
  live_mode: boolean;
  type: string;         // 'payment'
  date_created: string;
  user_id: number;
  api_version: string;
  action: string;       // 'payment.created' | 'payment.updated'
  data: {
    id: string;         // payment_id como string
  };
}

export const PaymentService = {
  /**
   * Gera um pagamento PIX para um pedido via Mercado Pago.
   * POST /v1/payments com payment_method_id: 'pix'
   */
  async generatePix(params: {
    orderId: string;
    amount: number;          // em centavos — convertido para reais internamente
    customerName: string;
    customerEmail: string;
    customerCpf: string | null;
    description: string;
  }): Promise<PixPaymentResponse> {
    const token = requireEnv('MP_ACCESS_TOKEN', ACCESS_TOKEN);

    // MP trabalha em reais, não centavos
    const amountBrl = params.amount / 100;

    // Calcula a data de expiração
    const expiresAt = new Date(
      Date.now() + PIX_EXPIRATION_SECONDS * 1000
    ).toISOString();

    const body: Record<string, unknown> = {
      transaction_amount: amountBrl,
      description: params.description,
      payment_method_id: 'pix',
      external_reference: params.orderId,
      date_of_expiration: expiresAt,
      payer: {
        email: params.customerEmail,
        first_name: params.customerName.split(' ')[0] || params.customerName,
        last_name: params.customerName.split(' ').slice(1).join(' ') || '',
        ...(params.customerCpf
          ? {
              identification: {
                type: 'CPF',
                number: params.customerCpf.replace(/\D/g, ''),
              },
            }
          : {}),
      },
    };

    const response = await withRetry(async () => {
      const res = await fetch(`${MP_API_BASE_URL}/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader(token),
          'X-Idempotency-Key': params.orderId, // evita duplicatas
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as MpErrorResponse;
        const msg =
          err.cause?.[0]?.description ?? err.message ?? err.error ?? 'Erro MP';
        throw new Error(`Mercado Pago PIX error ${res.status}: ${msg}`);
      }

      return res.json() as Promise<MpPixResponse>;
    });

    const txData = response.point_of_interaction?.transaction_data;

    if (!txData?.qr_code) {
      throw new Error(
        '[PaymentService] Resposta do Mercado Pago não contém qr_code'
      );
    }

    // Monta URL da imagem do QR Code a partir do base64 (data URI)
    const qrCodeUrl = txData.qr_code_base64
      ? `data:image/png;base64,${txData.qr_code_base64}`
      : (txData.ticket_url ?? '');

    return {
      payment_id: String(response.id),
      pix_code: txData.qr_code,
      qr_code_url: qrCodeUrl,
      expires_at: response.date_of_expiration ?? expiresAt,
      amount: params.amount,
    };
  },

  /**
   * Valida a assinatura do webhook do Mercado Pago.
   *
   * O MP envia o header `x-signature` no formato:
   *   ts=<timestamp>,v1=<hmac-sha256>
   *
   * O dado assinado é:
   *   id:<data.id>;request-id:<x-request-id>;ts:<timestamp>
   *
   * Retorna false se a assinatura for inválida ou ausente.
   */
  validateWebhookSignature(
    dataId: string,
    requestId: string | null,
    signatureHeader: string | null
  ): boolean {
    if (!signatureHeader) return false;

    const secret = requireEnv('MP_WEBHOOK_SECRET', WEBHOOK_SECRET);

    // Extrai ts e v1 do header
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((p) => p.split('=').map((s) => s.trim()) as [string, string])
    );

    const ts = parts['ts'];
    const v1 = parts['v1'];

    if (!ts || !v1) return false;

    // Monta o template assinado
    const template = `id:${dataId};request-id:${requestId ?? ''};ts:${ts}`;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(template, 'utf-8')
      .digest('hex');

    try {
      const bufExpected = Buffer.from(expected, 'hex');
      const bufReceived = Buffer.from(v1, 'hex');
      if (bufExpected.length !== bufReceived.length) return false;
      return crypto.timingSafeEqual(bufExpected, bufReceived);
    } catch {
      return false;
    }
  },

  /**
   * Busca os detalhes de um pagamento na API do Mercado Pago.
   * Necessário pois o webhook do MP apenas notifica — não traz o status.
   */
  async getPayment(paymentId: string): Promise<MpPaymentResponse> {
    const token = requireEnv('MP_ACCESS_TOKEN', ACCESS_TOKEN);

    const res = await fetch(`${MP_API_BASE_URL}/v1/payments/${paymentId}`, {
      headers: {
        Authorization: authHeader(token),
      },
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as MpErrorResponse;
      throw new Error(
        `Mercado Pago getPayment error ${res.status}: ${err.message ?? 'erro desconhecido'}`
      );
    }

    return res.json() as Promise<MpPaymentResponse>;
  },

  /**
   * Converte o payload do webhook MP para o nosso tipo interno WebhookPaymentEvent.
   * Faz uma chamada à API para buscar o status real do pagamento.
   */
  async parseWebhookEvent(body: unknown): Promise<WebhookPaymentEvent> {
    const raw = body as MpWebhookPayload;
    const action = raw.action ?? '';
    const paymentId = raw.data?.id ?? '';

    if (!paymentId) {
      return {
        event: action as WebhookPaymentEvent['event'],
        payment_id: '',
        order_reference: '',
        amount: 0,
        metadata: raw as unknown as Record<string, unknown>,
      };
    }

    // Busca o pagamento real para obter status e external_reference
    const payment = await PaymentService.getPayment(paymentId);

    let event: WebhookPaymentEvent['event'];
    if (payment.status === 'approved') {
      event = 'payment.confirmed';
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      event = 'payment.failed';
    } else if (payment.status === 'refunded') {
      event = 'payment.refunded';
    } else {
      // pending, in_process, etc.
      event = action as WebhookPaymentEvent['event'];
    }

    return {
      event,
      payment_id: paymentId,
      order_reference: payment.external_reference,
      amount: 0, // usamos o valor do pedido salvo no banco
      paid_at: payment.date_approved,
      metadata: raw as unknown as Record<string, unknown>,
    };
  },

  /**
   * Cancela/estorna um pagamento via API do Mercado Pago.
   * PUT /v1/payments/{id} com status: 'cancelled' (pagamento pendente)
   * POST /v1/payments/{id}/refunds (pagamento já aprovado)
   */
  async refund(paymentId: string, amountCents?: number): Promise<void> {
    const token = requireEnv('MP_ACCESS_TOKEN', ACCESS_TOKEN);

    await withRetry(async () => {
      const body = amountCents ? { amount: amountCents / 100 } : {};
      const res = await fetch(
        `${MP_API_BASE_URL}/v1/payments/${paymentId}/refunds`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader(token),
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as MpErrorResponse;
        throw new Error(
          `Mercado Pago refund error ${res.status}: ${err.message ?? 'erro desconhecido'}`
        );
      }
    });
  },
};
