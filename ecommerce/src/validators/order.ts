import { z } from 'zod'

const CartItemSchema = z.object({
  product_id: z.string().uuid('ID de produto invalido'),
  quantity: z.number().int().min(1, 'Quantidade minima e 1').max(99),
})

const AddressDataSchema = z.object({
  street: z.string().trim().min(1, 'Rua obrigatória'),
  number: z.string().trim().min(1, 'Número obrigatório'),
  complement: z.string().trim().max(80).optional(),
  neighborhood: z.string().trim().min(1, 'Bairro obrigatório'),
  city: z.string().trim().min(1, 'Cidade obrigatória'),
  state: z.string().trim().length(2, 'Estado deve ter 2 letras'),
  zip_code: z.string().trim().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
})

export const CheckoutSchema = z.object({
  items: z
    .array(CartItemSchema)
    .min(1, 'Carrinho nao pode estar vazio')
    .max(50, 'Maximo de 50 itens por pedido'),
  address: AddressDataSchema,
  shipping_method: z.string().min(1, 'Metodo de envio obrigatorio'),
  shipping_cost: z.number().nonnegative().default(0),
  payment_method: z.enum(['pix', 'credit_card', 'boleto'], {
    message: 'Metodo de pagamento invalido',
  }),
  coupon_code: z.string().trim().optional(),
})

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(
    [
      'aguardando_pagamento',
      'pago',
      'enviado',
      'entregue',
      'cancelado',
      'estornado',
    ],
    { message: 'Status invalido' }
  ),
  note: z.string().trim().optional(),
})

export const OrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z
    .enum([
      'carrinho',
      'checkout',
      'aguardando_pagamento',
      'pago',
      'enviado',
      'entregue',
      'cancelado',
      'estornado',
    ])
    .optional(),
  payment_status: z
    .enum(['pending', 'paid', 'failed', 'refunded', 'expired'])
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  user_id: z.string().uuid().optional(),
})

export type CheckoutInput = z.infer<typeof CheckoutSchema>
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>
export type OrderQuery = z.infer<typeof OrderQuerySchema>
