import { z } from 'zod'

export const CreateCouponSchema = z.object({
  code: z
    .string()
    .min(2, 'Código deve ter no mínimo 2 caracteres')
    .max(50, 'Código deve ter no máximo 50 caracteres')
    .toUpperCase()
    .trim()
    .regex(/^[A-Z0-9_-]+$/, 'Código deve conter apenas letras maiúsculas, números, - e _'),
  discount_type: z.enum(['percentage', 'fixed'], {
    message: 'Tipo de desconto inválido. Deve ser "percentage" ou "fixed".',
  }),
  discount_value: z.number().positive('O valor do desconto deve ser positivo'),
  min_purchase_value: z.number().nonnegative().optional().default(0),
  max_uses: z.number().int().positive().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional().default(true),
})

export const UpdateCouponSchema = CreateCouponSchema.partial()

export const ValidateCouponSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, 'Código do cupom é obrigatório'),
  subtotal: z.number().nonnegative('O subtotal deve ser um valor positivo'),
})

export type CreateCouponInput = z.infer<typeof CreateCouponSchema>
export type UpdateCouponInput = z.infer<typeof UpdateCouponSchema>
export type ValidateCouponInput = z.infer<typeof ValidateCouponSchema>
