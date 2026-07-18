import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, isAuthError } from '@/middleware/auth'
import { ok, Errors } from '@/lib/utils'
import { ValidateCouponSchema } from '@/validators/coupon'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest('JSON inválido')
  }

  const parsed = ValidateCouponSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten())
  }

  const { code, subtotal } = parsed.data

  try {
    const supabase = createServiceClient()
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .maybeSingle()

    if (error) {
      console.error('[POST /api/coupons/validate]', error)
      return Errors.internal('Erro ao consultar cupom')
    }

    if (!coupon) {
      return Errors.badRequest('Cupom inválido ou inexistente')
    }

    if (!coupon.is_active) {
      return Errors.badRequest('Este cupom não está ativo')
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return Errors.badRequest('Este cupom já expirou')
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return Errors.badRequest('Este cupom já atingiu o limite de usos')
    }

    if (subtotal < coupon.min_purchase_value) {
      const minValFormatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(coupon.min_purchase_value)
      return Errors.badRequest(`O valor mínimo de compra para este cupom é de ${minValFormatted}`)
    }

    // Calcula o desconto
    let discount = 0
    if (coupon.discount_type === 'percentage') {
      discount = parseFloat((subtotal * (coupon.discount_value / 100)).toFixed(2))
    } else if (coupon.discount_type === 'fixed') {
      discount = coupon.discount_value
    }

    // Limita o desconto ao valor do subtotal
    discount = parseFloat(Math.min(discount, subtotal).toFixed(2))

    return ok({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
      },
      discount,
    })
  } catch (err) {
    console.error('[POST /api/coupons/validate]', err)
    return Errors.internal()
  }
}
