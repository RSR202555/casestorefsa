import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth, isAuthError } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { Errors, ok } from '@/lib/utils'

const UpdateProfileSchema = z.object({
  full_name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z
    .string()
    .trim()
    .regex(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, 'Telefone invalido')
    .optional()
    .or(z.literal('')),
  cpf: z
    .string()
    .trim()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF invalido')
    .optional()
    .or(z.literal('')),
})

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, full_name, phone, cpf, created_at, updated_at')
      .eq('id', auth.userId)
      .single()

    if (error || !data) {
      return Errors.notFound('Perfil')
    }

    return ok({
      ...data,
      email: auth.email,
    })
  } catch (error) {
    console.error('[GET /api/auth/me]', error)
    return Errors.internal('Erro ao carregar perfil')
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest('JSON invalido')
  }

  const parsed = UpdateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.badRequest('Dados invalidos', parsed.error.flatten())
  }

  try {
    const supabase = createServiceClient()
    const payload = {
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      cpf: parsed.data.cpf || null,
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', auth.userId)
      .select('id, role, full_name, phone, cpf, created_at, updated_at')
      .single()

    if (error || !data) {
      console.error('[PATCH /api/auth/me]', error)
      return Errors.internal('Erro ao atualizar perfil')
    }

    return ok({
      ...data,
      email: auth.email,
    })
  } catch (error) {
    console.error('[PATCH /api/auth/me]', error)
    return Errors.internal('Erro ao atualizar perfil')
  }
}
