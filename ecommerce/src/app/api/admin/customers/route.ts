import { NextRequest } from 'next/server'
import { z } from 'zod'
import { CustomerService } from '@/services/customer.service'
import { requireAdmin, isAuthError } from '@/middleware/auth'
import { Errors, ok } from '@/lib/utils'

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (isAuthError(auth)) return auth

  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) {
    return Errors.badRequest('Parametros invalidos', parsed.error.flatten())
  }

  try {
    const customers = await CustomerService.listCustomers(parsed.data.limit)
    return ok({ customers })
  } catch (error) {
    console.error('[GET /api/admin/customers]', error)
    return Errors.internal('Erro ao carregar clientes')
  }
}
