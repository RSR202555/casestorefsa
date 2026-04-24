import { z } from 'zod';

// CEP: apenas dígitos, 8 caracteres
const ZipCodeSchema = z
  .string()
  .regex(/^\d{5}-?\d{3}$/, 'CEP inválido')
  .transform((v) => v.replace('-', ''));

export const CalculateShippingSchema = z.object({
  destination_zip: ZipCodeSchema,
  weight_grams: z
    .number()
    .int()
    .positive('Peso deve ser positivo')
    .max(30_000, 'Peso máximo 30kg'),
  // Dimensões em centímetros
  length_cm: z.number().positive().max(105),
  height_cm: z.number().positive().max(105),
  width_cm: z.number().positive().max(105),
  declared_value: z.number().nonnegative().optional().default(0),
});

export const UpdateTrackingSchema = z.object({
  order_id: z.string().uuid('ID de pedido inválido'),
  tracking_code: z.string().min(2).trim(),
  shipping_method: z.enum(['PAC', 'SEDEX']),
  estimated_delivery: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .optional(),
});

export type CalculateShippingInput = z.infer<typeof CalculateShippingSchema>;
export type UpdateTrackingInput = z.infer<typeof UpdateTrackingSchema>;
