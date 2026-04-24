import { z } from 'zod'

export const AdjustInventorySchema = z.object({
  product_id: z.string().uuid(),
  quantity_delta: z
    .number()
    .int('Delta deve ser inteiro')
    .refine((value) => value !== 0, 'Delta nao pode ser zero'),
  reason: z.enum(['adjustment', 'return', 'admin_adjustment'], {
    message: 'Motivo invalido para ajuste manual',
  }),
  notes: z.string().trim().optional(),
  low_stock_threshold: z.number().int().nonnegative().optional(),
})

export const InventoryQuerySchema = z.object({
  low_stock_only: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  product_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})

export type AdjustInventoryInput = z.infer<typeof AdjustInventorySchema>
export type InventoryQuery = z.infer<typeof InventoryQuerySchema>
