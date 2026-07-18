import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin, isAuthError } from '@/middleware/auth'
import { ok, Errors } from '@/lib/utils'
import { UpdateCouponSchema } from '@/validators/coupon'

type Params = { params: { id: string } }

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if (isAuthError(auth)) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest('JSON inválido')
  }

  const parsed = UpdateCouponSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten())
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('coupons')
      .update({
        code: parsed.data.code,
        discount_type: parsed.data.discount_type,
        discount_value: parsed.data.discount_value,
        min_purchase_value: parsed.data.min_purchase_value,
        max_uses: parsed.data.max_uses !== undefined ? parsed.data.max_uses : undefined,
        expires_at: parsed.data.expires_at !== undefined ? parsed.data.expires_at : undefined,
        is_active: parsed.data.is_active,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return Errors.conflict('Já existe um cupom cadastrado com este código')
      }
      console.error('[PUT /api/coupons/[id]]', error)
      return Errors.internal('Erro ao atualizar cupom')
    }

    return ok(data)
  } catch (err) {
    console.error('[PUT /api/coupons/[id]]', err)
    return Errors.internal()
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if (isAuthError(auth)) return auth

  try {
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('[DELETE /api/coupons/[id]]', error)
      return Errors.internal('Erro ao excluir cupom')
    }

    return ok({ message: 'Cupom excluído com sucesso' })
  } catch (err) {
    console.error('[DELETE /api/coupons/[id]]', err)
    return Errors.internal()
  }
}
