/**
 * POST /api/addresses
 * Cria um endereço para o usuário autenticado.
 * Retorna o endereço criado com o ID gerado.
 */

import { NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/middleware/auth'
import { ok, Errors } from '@/lib/utils'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateAddressSchema = z.object({
  label: z.string().trim().max(60).optional(),
  street: z.string().trim().min(1, 'Rua obrigatória'),
  number: z.string().trim().min(1, 'Número obrigatório'),
  complement: z.string().trim().max(80).optional(),
  neighborhood: z.string().trim().min(1, 'Bairro obrigatório'),
  city: z.string().trim().min(1, 'Cidade obrigatória'),
  state: z.string().trim().length(2, 'Estado deve ter 2 letras'),
  zip_code: z.string().trim().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest('JSON inválido')
  }

  const parsed = CreateAddressSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten())
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('addresses')
    .insert({
      user_id: auth.userId,
      label: parsed.data.label ?? null,
      street: parsed.data.street,
      number: parsed.data.number,
      complement: parsed.data.complement ?? null,
      neighborhood: parsed.data.neighborhood,
      city: parsed.data.city,
      state: parsed.data.state.toUpperCase(),
      zip_code: parsed.data.zip_code.replace('-', ''),
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/addresses]', error)
    return Errors.internal('Erro ao salvar endereço')
  }

  return ok(data, 201)
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/addresses]', error)
    return Errors.internal('Erro ao buscar endereços')
  }

  return ok(data ?? [])
}
