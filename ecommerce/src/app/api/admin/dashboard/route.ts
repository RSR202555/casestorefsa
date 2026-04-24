/**
 * GET /api/admin/dashboard
 * Retorna KPIs e dados de gráficos para o painel administrativo.
 *
 * Query params:
 *   period: 'day' | 'week' | 'month' | 'year' (default: 'month')
 */

import { NextRequest } from 'next/server';
import { ReportsService } from '@/services/reports.service';
import { requireAdmin, isAuthError } from '@/middleware/auth';
import { ok, Errors } from '@/lib/utils';
import { z } from 'zod';

const QuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).optional().default('month'),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = request.nextUrl;
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return Errors.badRequest('Parâmetros inválidos', parsed.error.flatten());
  }

  try {
    const [kpis, revenue, byStatus, topProducts, overview, recentOrders] = await Promise.all([
      ReportsService.getKPIs(),
      ReportsService.getRevenueOverTime(parsed.data.period),
      ReportsService.getOrdersByStatus(),
      ReportsService.getTopProducts(10, parsed.data.period),
      ReportsService.getOverview(),
      ReportsService.getRecentOrders(5),
    ]);

    return ok({
      kpis,
      overview,
      recent_orders: recentOrders,
      charts: {
        revenue_over_time: revenue,
        orders_by_status: byStatus,
        top_products: topProducts,
      },
    });
  } catch (err) {
    console.error('[GET /api/admin/dashboard]', err);
    return Errors.internal();
  }
}
