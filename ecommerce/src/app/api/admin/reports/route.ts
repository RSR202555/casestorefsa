/**
 * GET /api/admin/reports
 * Relatório financeiro completo por período com filtro de datas.
 *
 * Query params:
 *   period: 'day' | 'week' | 'month' | 'year'
 *   from:   ISO date (opcional)
 *   to:     ISO date (opcional)
 *   top_n:  número de produtos no ranking (default: 10, max: 50)
 */

import { NextRequest } from 'next/server';
import { ReportsService } from '@/services/reports.service';
import { requireAdmin, isAuthError } from '@/middleware/auth';
import { ok, Errors } from '@/lib/utils';
import { z } from 'zod';

const QuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).optional().default('month'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  top_n: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = request.nextUrl;
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return Errors.badRequest('Parâmetros inválidos', parsed.error.flatten());
  }

  const { period, from, to, top_n } = parsed.data;

  try {
    const [kpis, revenue, byStatus, topProducts] = await Promise.all([
      ReportsService.getKPIs(),
      ReportsService.getRevenueOverTime(period, from, to),
      ReportsService.getOrdersByStatus(),
      ReportsService.getTopProducts(top_n, period),
    ]);

    return ok({
      period,
      from: from ?? null,
      to: to ?? null,
      kpis,
      revenue_over_time: revenue,
      orders_by_status: byStatus,
      top_products: topProducts,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[GET /api/admin/reports]', err);
    return Errors.internal();
  }
}
