/**
 * GET  /api/categories — Lista categorias (público)
 * POST /api/categories — Cria categoria (admin only)
 */

import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin, isAuthError } from '@/middleware/auth'
import { ok, Errors } from '@/lib/utils'
import { CreateCategorySchema } from '@/validators/product'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, description, created_at')
      .order('name', { ascending: true })

    if (error) {
      console.error('[GET /api/categories]', error)
      return Errors.internal('Erro ao buscar categorias')
    }

    return ok(data ?? [])
  } catch (err) {
    console.error('[GET /api/categories]', err)
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

  const parsed = CreateCategorySchema.safeParse(body)
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten())
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description ?? null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return Errors.conflict('Já existe uma categoria com esse nome ou slug')
      }
      console.error('[POST /api/categories]', error)
      return Errors.internal('Erro ao criar categoria')
    }

    return ok(data, 201)
  } catch (err) {
    console.error('[POST /api/categories]', err)
    return Errors.internal()
  }
}
