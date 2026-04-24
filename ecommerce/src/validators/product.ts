import { z } from 'zod'

const FragranceNotesSchema = z.object({
  top: z.array(z.string().trim()).default([]),
  heart: z.array(z.string().trim()).default([]),
  base: z.array(z.string().trim()).default([]),
  sizes: z
    .array(
      z.object({
        ml: z.number().positive('ml deve ser positivo'),
        price: z.number().positive('Preco deve ser positivo'),
      })
    )
    .optional(),
})

const ImageUrlSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true
    if (value.startsWith('/')) return true

    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }, 'Informe uma URL valida ou caminho iniciado com /')

const ProductBaseSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim(),
  description: z.string().trim().optional(),
  sku: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9_-]+$/i, 'SKU deve conter apenas letras, numeros, _ e -')
    .toUpperCase()
    .trim(),
  price: z.number().positive('Preco deve ser positivo'),
  promotional_price: z.number().positive().optional().nullable(),
  fragrance_notes: FragranceNotesSchema.optional().default({
    top: [],
    heart: [],
    base: [],
  }),
  category_ids: z.array(z.string().uuid()).optional().default([]),
  is_active: z.boolean().optional().default(true),
  initial_stock: z.number().int().nonnegative().optional().default(0),
  low_stock_threshold: z.number().int().nonnegative().optional().default(5),
  image_url: ImageUrlSchema.optional(),
})

function isPromotionalPriceValid(data: {
  price?: number
  promotional_price?: number | null
}) {
  return data.promotional_price == null || data.price == null || data.promotional_price < data.price
}

export const CreateProductSchema = ProductBaseSchema.refine(
  isPromotionalPriceValid,
  {
    message: 'Preco promocional deve ser menor que o preco normal',
    path: ['promotional_price'],
  }
)

export const UpdateProductSchema = ProductBaseSchema.omit({
  sku: true,
  initial_stock: true,
})
  .partial()
  .refine(isPromotionalPriceValid, {
    message: 'Preco promocional deve ser menor que o preco normal',
    path: ['promotional_price'],
  })

export const ProductQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().optional(),
  category: z.string().uuid().optional(),
  is_active: z
    .string()
    .optional()
    .transform((value) => {
      if (value === 'true') return true
      if (value === 'false') return false
      return undefined
    }),
  min_price: z.coerce.number().nonnegative().optional(),
  max_price: z.coerce.number().nonnegative().optional(),
  sort: z
    .enum(['created_at', 'price', 'name', 'updated_at'])
    .optional()
    .default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const CreateCategorySchema = z.object({
  name: z.string().min(2).trim(),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minusculas, numeros e -')
    .trim(),
  description: z.string().trim().optional(),
})

export type CreateProductInput = z.infer<typeof CreateProductSchema>
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>
export type ProductQuery = z.infer<typeof ProductQuerySchema>
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>
