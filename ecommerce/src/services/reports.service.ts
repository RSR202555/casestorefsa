/**
 * Serviço de Relatórios e Dashboard.
 * Todos os métodos retornam dados prontos para renderização de gráficos.
 * Usa service client pois os dados são exclusivos de admin.
 */

import { createServiceClient } from '@/lib/supabase/server';
import type {
  DashboardKPIs,
  RevenueDataPoint,
  TopProduct,
  OrdersByStatus,
  ReportPeriod,
} from '@/types';

// Mapeamento de período para intervalo SQL
const PERIOD_INTERVALS: Record<ReportPeriod, string> = {
  day: '1 day',
  week: '7 days',
  month: '30 days',
  year: '365 days',
};

// Formato de agrupamento temporal por período
const PERIOD_TRUNC: Record<ReportPeriod, string> = {
  day: 'hour',
  week: 'day',
  month: 'day',
  year: 'month',
};

function isLegacyOrdersSchemaError(error: { message?: string; code?: string } | null): boolean {
  const message = error?.message ?? '';
  return error?.code === '42703' || message.includes('does not exist');
}

export interface DashboardOverview {
  customers_total: number;
  products_total: number;
}

export interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  total: number;
  status: string;
}

export const ReportsService = {
  /**
   * KPIs principais do dashboard.
   */
  async getKPIs(): Promise<DashboardKPIs> {
    const supabase = createServiceClient();

    const primaryQuery = await supabase
      .from('orders')
      .select('status, payment_status, total, created_at');

    let orders: Array<{
      status: string;
      payment_status: string;
      total: number;
      created_at: string;
    }> = [];

    if (!primaryQuery.error) {
      orders = (primaryQuery.data ?? []) as Array<{
        status: string;
        payment_status: string;
        total: number;
        created_at: string;
      }>;
    } else if (isLegacyOrdersSchemaError(primaryQuery.error)) {
      const legacyQuery = await supabase
        .from('orders')
        .select('status, payment_status, total_amount, created_at');

      if (legacyQuery.error) {
        throw new Error(`[ReportsService] getKPIs legacy: ${legacyQuery.error.message}`);
      }

      orders = ((legacyQuery.data ?? []) as Array<{
        status: string;
        payment_status: string;
        total_amount: number;
        created_at: string;
      }>).map((row) => ({
        status: row.status,
        payment_status: row.payment_status,
        total: Number(row.total_amount ?? 0),
        created_at: row.created_at,
      }));
    } else {
      throw new Error(`[ReportsService] getKPIs: ${primaryQuery.error.message}`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalOrders = orders.length;
    const paidOrders = orders.filter((o) => o.payment_status === 'paid');
    const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
    const pendingOrders = orders.filter(
      (o) => o.status === 'aguardando_pagamento'
    ).length;
    const refundedOrders = orders.filter(
      (o) => o.payment_status === 'refunded'
    ).length;
    const averageTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    const ordersToday = orders.filter(
      (o) => new Date(o.created_at) >= today
    ).length;
    const revenueToday = orders
      .filter(
        (o) => o.payment_status === 'paid' && new Date(o.created_at) >= today
      )
      .reduce((s, o) => s + o.total, 0);

    return {
      total_orders: totalOrders,
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      pending_orders: pendingOrders,
      paid_orders: paidOrders.length,
      refunded_orders: refundedOrders,
      average_ticket: parseFloat(averageTicket.toFixed(2)),
      orders_today: ordersToday,
      revenue_today: parseFloat(revenueToday.toFixed(2)),
    };
  },

  /**
   * Receita ao longo do tempo para um período dado.
   */
  async getRevenueOverTime(
    period: ReportPeriod,
    from?: string,
    to?: string
  ): Promise<RevenueDataPoint[]> {
    const supabase = createServiceClient();

    const interval = PERIOD_INTERVALS[period];
    const startDate =
      from ?? new Date(Date.now() - ms(interval)).toISOString();
    const endDate = to ?? new Date().toISOString();

    const primaryQuery = await supabase
      .from('orders')
      .select('total, created_at, payment_status')
      .eq('payment_status', 'paid')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    let rows: Array<{ total: number; created_at: string }> = [];

    if (!primaryQuery.error) {
      rows = (primaryQuery.data ?? []) as Array<{ total: number; created_at: string }>;
    } else if (isLegacyOrdersSchemaError(primaryQuery.error)) {
      const legacyQuery = await supabase
        .from('orders')
        .select('total_amount, created_at, payment_status')
        .eq('payment_status', 'paid')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

      if (legacyQuery.error) {
        throw new Error(
          `[ReportsService] getRevenueOverTime legacy: ${legacyQuery.error.message}`
        );
      }

      rows = ((legacyQuery.data ?? []) as Array<{
        total_amount: number;
        created_at: string;
      }>).map((row) => ({
        total: Number(row.total_amount ?? 0),
        created_at: row.created_at,
      }));
    } else {
      throw new Error(`[ReportsService] getRevenueOverTime: ${primaryQuery.error.message}`);
    }

    // Agrupamento por período no app layer
    const trunc = PERIOD_TRUNC[period];
    const grouped = new Map<string, { revenue: number; orders: number }>();

    for (const row of rows) {
      const key = truncateDate(new Date(row.created_at), trunc);
      const existing = grouped.get(key) ?? { revenue: 0, orders: 0 };
      grouped.set(key, {
        revenue: existing.revenue + row.total,
        orders: existing.orders + 1,
      });
    }

    return Array.from(grouped.entries()).map(([date, v]) => ({
      date,
      revenue: parseFloat(v.revenue.toFixed(2)),
      orders: v.orders,
    }));
  },

  /**
   * Contagem de pedidos por status.
   */
  async getOrdersByStatus(): Promise<OrdersByStatus[]> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('orders')
      .select('status');

    if (error) throw new Error(`[ReportsService] getOrdersByStatus: ${error.message}`);

    const counts = new Map<string, number>();
    for (const row of (data ?? []) as Array<{ status: string }>) {
      counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
    }

    return Array.from(counts.entries()).map(([status, count]) => ({
      status,
      count,
    }));
  },

  /**
   * Top N produtos por receita gerada.
   */
  async getTopProducts(limit = 10, period?: ReportPeriod): Promise<TopProduct[]> {
    const supabase = createServiceClient();

    let query = supabase
      .from('orders')
      .select('items, created_at')
      .eq('payment_status', 'paid');

    if (period) {
      const interval = PERIOD_INTERVALS[period];
      query = query.gte(
        'created_at',
        new Date(Date.now() - ms(interval)).toISOString()
      );
    }

    const { data, error } = await query;
    const productMap = new Map<
      string,
      { name: string; sku: string; qty: number; revenue: number }
    >();

    if (!error) {
      for (const order of (data ?? []) as Array<{
        items: Array<{
          product_id: string;
          name: string;
          sku: string;
          quantity: number;
          effective_price: number;
          subtotal: number;
        }>;
      }>) {
        for (const item of order.items) {
          const existing = productMap.get(item.product_id) ?? {
            name: item.name,
            sku: item.sku,
            qty: 0,
            revenue: 0,
          };
          productMap.set(item.product_id, {
            name: item.name,
            sku: item.sku,
            qty: existing.qty + item.quantity,
            revenue: existing.revenue + item.subtotal,
          });
        }
      }
    } else if (isLegacyOrdersSchemaError(error)) {
      let legacyQuery = supabase
        .from('order_items')
        .select(
          'product_id, product_name, product_sku, quantity, total_price, orders!inner(created_at, payment_status)'
        )
        .eq('orders.payment_status', 'paid');

      if (period) {
        const interval = PERIOD_INTERVALS[period];
        legacyQuery = legacyQuery.gte(
          'orders.created_at',
          new Date(Date.now() - ms(interval)).toISOString()
        );
      }

      const legacyResult = await legacyQuery;
      if (legacyResult.error) {
        throw new Error(`[ReportsService] getTopProducts legacy: ${legacyResult.error.message}`);
      }

      for (const item of (legacyResult.data ?? []) as Array<{
        product_id: string;
        product_name: string;
        product_sku: string;
        quantity: number;
        total_price: number;
      }>) {
        const existing = productMap.get(item.product_id) ?? {
          name: item.product_name,
          sku: item.product_sku,
          qty: 0,
          revenue: 0,
        };
        productMap.set(item.product_id, {
          name: item.product_name,
          sku: item.product_sku,
          qty: existing.qty + item.quantity,
          revenue: existing.revenue + Number(item.total_price ?? 0),
        });
      }
    } else {
      throw new Error(`[ReportsService] getTopProducts: ${error.message}`);
    }

    return Array.from(productMap.entries())
      .map(([product_id, v]) => ({
        product_id,
        product_name: v.name,
        sku: v.sku,
        total_quantity: v.qty,
        total_revenue: parseFloat(v.revenue.toFixed(2)),
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, limit);
  },

  /**
   * Relatório completo por período.
   */
  async getFullReport(period: ReportPeriod) {
    const [kpis, revenue, byStatus, topProducts] = await Promise.all([
      ReportsService.getKPIs(),
      ReportsService.getRevenueOverTime(period),
      ReportsService.getOrdersByStatus(),
      ReportsService.getTopProducts(10, period),
    ]);

    return { kpis, revenue, by_status: byStatus, top_products: topProducts };
  },

  async getOverview(): Promise<DashboardOverview> {
    const supabase = createServiceClient();

    const [customersResult, productsResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
      supabase.from('products').select('id', { count: 'exact', head: true }),
    ]);

    if (customersResult.error) {
      throw new Error(`[ReportsService] getOverview customers: ${customersResult.error.message}`);
    }

    if (productsResult.error) {
      throw new Error(`[ReportsService] getOverview products: ${productsResult.error.message}`);
    }

    return {
      customers_total: customersResult.count ?? 0,
      products_total: productsResult.count ?? 0,
    };
  },

  async getRecentOrders(limit = 5): Promise<RecentOrder[]> {
    const supabase = createServiceClient();

    const legacyOrders = await supabase
      .from('orders')
      .select('id, order_number, customer_snapshot, total_amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (legacyOrders.error) {
      throw new Error(`[ReportsService] getRecentOrders orders: ${legacyOrders.error.message}`);
    }

    const orderIds = ((legacyOrders.data ?? []) as Array<{ id: string }>).map((order) => order.id);
    if (orderIds.length === 0) return [];

    const orderItems = await supabase
      .from('order_items')
      .select('order_id, product_name')
      .in('order_id', orderIds);

    if (orderItems.error) {
      throw new Error(`[ReportsService] getRecentOrders items: ${orderItems.error.message}`);
    }

    const firstItemByOrder = new Map<string, string>();
    for (const item of (orderItems.data ?? []) as Array<{ order_id: string; product_name: string }>) {
      if (!firstItemByOrder.has(item.order_id)) {
        firstItemByOrder.set(item.order_id, item.product_name);
      }
    }

    return ((legacyOrders.data ?? []) as Array<{
      id: string;
      order_number: string | null;
      customer_snapshot: { full_name?: string } | null;
      total_amount: number;
      status: string;
    }>).map((order, index) => ({
      id: order.id,
      order_number: order.order_number ?? `#${String(2840 + index).padStart(4, '0')}`,
      customer_name: order.customer_snapshot?.full_name ?? 'Cliente sem nome',
      product_name: firstItemByOrder.get(order.id) ?? 'Pedido sem itens',
      total: Number(order.total_amount ?? 0),
      status: order.status,
    }));
  },
};

// ── Helpers internos ───────────────────────────────────────────────────────

/** Converte string de intervalo SQL para milissegundos (aproximado) */
function ms(interval: string): number {
  const match = interval.match(/(\d+)\s+(day|hour|month)/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = match[2];
  const DAY = 24 * 60 * 60 * 1000;
  if (unit === 'hour') return n * 60 * 60 * 1000;
  if (unit === 'day') return n * DAY;
  if (unit === 'month') return n * 30 * DAY;
  return n * DAY;
}

/** Trunca uma data conforme a unidade de agrupamento */
function truncateDate(
  date: Date,
  unit: 'hour' | 'day' | 'month' | string
): string {
  const d = new Date(date);
  if (unit === 'hour') {
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 13) + ':00:00Z';
  }
  if (unit === 'day') {
    return d.toISOString().slice(0, 10);
  }
  if (unit === 'month') {
    return d.toISOString().slice(0, 7);
  }
  return d.toISOString().slice(0, 10);
}
