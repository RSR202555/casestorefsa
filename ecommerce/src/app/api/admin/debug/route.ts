import { NextRequest } from 'next/server'
import { requireAdmin, isAuthError } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { ok } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (isAuthError(auth)) return auth

  const supabase = createServiceClient()

  const { data: pcAll, error: pcError } = await supabase
    .from('product_categories')
    .select('*')
    .limit(50)

  const { data: cats, error: catsError } = await supabase
    .from('categories')
    .select('*')

  const { data: prods, error: prodsError } = await supabase
    .from('products')
    .select('id, name, sku, is_active')
    .limit(20)

  return ok({
    product_categories: {
      error: pcError ? { code: pcError.code, message: pcError.message } : null,
      count: pcAll?.length ?? 0,
      rows: pcAll ?? [],
    },
    categories: {
      error: catsError ? { code: catsError.code, message: catsError.message } : null,
      rows: cats ?? [],
    },
    products_sample: {
      error: prodsError ? { code: prodsError.code, message: prodsError.message } : null,
      rows: prods ?? [],
    },
  })
}
