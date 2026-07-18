import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin, isAuthError } from '@/middleware/auth'
import { ok, Errors } from '@/lib/utils'
import { CreateCouponSchema } from '@/validators/coupon'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (isAuthError(auth)) return auth

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET /api/coupons]', error)
      return Errors.internal('Erro ao buscar cupons')
    }

    return ok(data ?? [])
  } catch (err) {
    console.error('[GET /api/coupons]', err)
    return Errors.internal()
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (isAuthError(auth)) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest('JSON inválido')
  }

  const parsed = CreateCouponSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten())
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code: parsed.data.code,
        discount_type: parsed.data.discount_type,
        discount_value: parsed.data.discount_value,
        min_purchase_value: parsed.data.min_purchase_value,
        max_uses: parsed.data.max_uses ?? null,
        expires_at: parsed.data.expires_at ?? null,
        is_active: parsed.data.is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return Errors.conflict('Já existe um cupom cadastrado com este código')
      }
      console.error('[POST /api/coupons]', error)
      return Errors.internal('Erro ao cadastrar cupom')
    }

    return ok(data, 201)
  } catch (err) {
    console.error('[POST /api/coupons]', err)
    return Errors.internal()
  }
}
