import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin, isAuthError } from '@/middleware/auth'
import { ok, Errors } from '@/lib/utils'
import { CreateCategorySchema } from '@/validators/product'

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

  const parsed = CreateCategorySchema.partial().safeParse(body)
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten())
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('categories')
      .update({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description ?? null,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return Errors.conflict('Já existe uma categoria com esse nome ou slug')
      }
      console.error('[PUT /api/categories/[id]]', error)
      return Errors.internal('Erro ao atualizar categoria')
    }

    return ok(data)
  } catch (err) {
    console.error('[PUT /api/categories/[id]]', err)
    return Errors.internal()
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request)
  if (isAuthError(auth)) return auth

  try {
    const supabase = createServiceClient()

    // 1. Remove dependências na tabela de associação product_categories
    const { error: relError } = await supabase
      .from('product_categories')
      .delete()
      .eq('category_id', params.id)

    if (relError) {
      console.error('[DELETE /api/categories/[id]] relError:', relError)
    }

    // 2. Remove a categoria
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('[DELETE /api/categories/[id]]', error)
      return Errors.internal('Erro ao excluir categoria')
    }

    return ok({ message: 'Categoria excluída com sucesso' })
  } catch (err) {
    console.error('[DELETE /api/categories/[id]]', err)
    return Errors.internal()
  }
}
