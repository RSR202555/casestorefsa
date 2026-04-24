import { z } from 'zod'

export const GeneratePixSchema = z.object({
  order_id: z.string().uuid('ID de pedido invalido'),
})

/**
 * Schema do webhook Mercado Pago.
 * Eventos mapeados para o nosso tipo interno WebhookPaymentEvent.
 */
export const MercadoPagoWebhookSchema = z.object({
  event: z.enum([
    'payment.confirmed',
    'payment.failed',
    'payment.refunded',
    'payment.expired',
  ]),
  payment_id: z.string().min(1),
  order_reference: z.string().min(1),
  amount: z.number(),
  paid_at: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type GeneratePixInput = z.infer<typeof GeneratePixSchema>
export type MercadoPagoWebhookInput = z.infer<typeof MercadoPagoWebhookSchema>
