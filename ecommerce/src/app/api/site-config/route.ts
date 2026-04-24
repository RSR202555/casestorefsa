/**
 * GET  /api/site-config?key=promo_enabled  — leitura pública
 * PUT  /api/site-config                    — escrita (admin only)
 *
 * Body PUT: { key: string, value: unknown }
 */

import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ok, Errors } from '@/lib/utils'
import { requireAuth, isAuthError } from '@/middleware/auth'

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  if (!key) return Errors.badRequest('Parâmetro key obrigatório')

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', key)
    .maybeSingle()

  if (error) return Errors.internal('Erro ao buscar configuração')

  return ok({ key, value: data?.value ?? null })
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth
  if (auth.role !== 'admin') return Errors.forbidden()

  let body: unknown
  try { body = await request.json() } catch { return Errors.badRequest('JSON inválido') }

  const { key, value } = body as { key?: string; value?: unknown }
  if (!key) return Errors.badRequest('Campo key obrigatório')

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('site_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) return Errors.internal('Erro ao salvar configuração')

  return ok({ key, value })
}
