/**
 * Serviço de Pedidos.
 * Gerencia o ciclo de vida completo: checkout → pagamento → envio → entrega.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { AuditService } from './audit.service';
import { InventoryService } from './inventory.service';
import { buildPaginationResult } from '@/lib/utils';
import type {
  DbOrder,
  DbProfile,
  OrderStatus,
  OrderItemSnapshot,
  CustomerSnapshot,
  AddressSnapshot,
} from '@/types';
import type { CheckoutInput, UpdateOrderStatusInput, OrderQuery } from '@/validators/order';

function isLegacyOrdersError(error: { message?: string; code?: string } | null): boolean {
  const message = error?.message ?? '';
  return error?.code === '42703' || message.includes('does not exist');
}

// Transições de status permitidas
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  carrinho: ['checkout', 'cancelado'],
  checkout: ['aguardando_pagamento', 'cancelado'],
  aguardando_pagamento: ['pago', 'cancelado', 'estornado'],
  pago: ['enviado', 'estornado'],
  enviado: ['entregue'],
  entregue: [],
  cancelado: [],
  estornado: [],
};

export const OrderService = {
  /**
   * Lista pedidos com paginação e filtros.
   * userId: se fornecido e não for admin, filtra por usuário.
   */
  async list(
    query: OrderQuery,
    userId?: string,
    isAdmin = false
  ) {
    const supabase = createServiceClient();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const from = (page - 1) * limit;

    let dbQuery = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    // Clientes só veem seus próprios pedidos
    if (!isAdmin && userId) {
      dbQuery = dbQuery.eq('user_id', userId);
    } else if (query.user_id) {
      dbQuery = dbQuery.eq('user_id', query.user_id);
    }

    if (query.status) dbQuery = dbQuery.eq('status', query.status);
    if (query.payment_status)
      dbQuery = dbQuery.eq('payment_status', query.payment_status);
    if (query.from) dbQuery = dbQuery.gte('created_at', query.from);
    if (query.to) dbQuery = dbQuery.lte('created_at', query.to);

    const { data, error, count } = await dbQuery;
    if (!error) {
      return buildPaginationResult(data as DbOrder[], count ?? 0, page, limit);
    }

    if (!isLegacyOrdersError(error)) {
      throw new Error(`[OrderService] list: ${error.message}`);
    }

    let legacyQuery = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (!isAdmin && userId) {
      legacyQuery = legacyQuery.eq('customer_id', userId);
    } else if (query.user_id) {
      legacyQuery = legacyQuery.eq('customer_id', query.user_id);
    }

    if (query.status) legacyQuery = legacyQuery.eq('status', query.status);
    if (query.payment_status) legacyQuery = legacyQuery.eq('payment_status', query.payment_status);
    if (query.from) legacyQuery = legacyQuery.gte('created_at', query.from);
    if (query.to) legacyQuery = legacyQuery.lte('created_at', query.to);

    const legacy = await legacyQuery;
    if (legacy.error) {
      throw new Error(`[OrderService] list legacy: ${legacy.error.message}`);
    }

    return buildPaginationResult(legacy.data as DbOrder[], legacy.count ?? 0, page, limit);
  },

  /**
   * Busca pedido por ID.
   * Clientes só podem ver seus próprios pedidos.
   */
  async getById(
    id: string,
    userId?: string,
    isAdmin = false
  ): Promise<DbOrder | null> {
    const supabase = createServiceClient();

    let query = supabase.from('orders').select('*').eq('id', id);
    if (!isAdmin && userId) query = query.eq('user_id', userId);

    const { data, error } = await query.single();
    if (!error) return data as DbOrder;

    if (error.code === 'PGRST116') return null;
    if (!isLegacyOrdersError(error)) {
      throw new Error(`[OrderService] getById: ${error.message}`);
    }

    let legacyQuery = supabase.from('orders').select('*').eq('id', id);
    if (!isAdmin && userId) legacyQuery = legacyQuery.eq('customer_id', userId);

    const legacy = await legacyQuery.single();
    if (legacy.error) {
      if (legacy.error.code === 'PGRST116') return null;
      throw new Error(`[OrderService] getById legacy: ${legacy.error.message}`);
    }

    return legacy.data as DbOrder;
  },

  /**
   * Busca pedido por referência de pagamento (para webhook).
   */
  async getByPaymentReference(ref: string): Promise<DbOrder | null> {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_reference', ref)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`[OrderService] getByPaymentReference: ${error.message}`);
    }
    return data as DbOrder;
  },

  /**
   * Cria um novo pedido a partir do checkout.
   * Reserva estoque e persiste snapshot completo.
   */
  async createFromCheckout(
    input: CheckoutInput,
    userId: string
  ): Promise<DbOrder> {
    const supabase = createServiceClient();

    // Busca perfil do cliente
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (profileError || !profile) {
      throw new Error('Perfil do usuário não encontrado');
    }

    // Busca email do usuário
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const email = userData?.user?.email ?? '';

    // Usa o endereço enviado diretamente no checkout
    const address = input.address;

    // Busca produtos
    const productIds = input.items.map((i) => i.product_id);
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (prodError) throw new Error(`[OrderService] fetch products: ${prodError.message}`);
    if (!products || products.length !== productIds.length) {
      throw new Error('Um ou mais produtos não foram encontrados ou estão inativos');
    }

    // Busca inventário separado (evita dependência de FK no schema cache)
    const { data: inventoryRows } = await supabase
      .from('inventory')
      .select('product_id, stock_quantity, reserved_stock')
      .in('product_id', productIds);

    const inventoryMap = new Map(
      (inventoryRows ?? []).map((r) => [
        r.product_id as string,
        { stock_quantity: r.stock_quantity as number, reserved_stock: r.reserved_stock as number },
      ])
    );

    // Monta snapshots dos itens
    const itemSnapshots: OrderItemSnapshot[] = input.items.map((item) => {
      const prod = (products as Record<string, unknown>[]).find(
        (p) => p.id === item.product_id
      );
      if (!prod) throw new Error(`Produto ${item.product_id} não encontrado`);

      const inv = inventoryMap.get(item.product_id);
      if (inv) {
        const available = inv.stock_quantity - inv.reserved_stock;
        if (available < item.quantity) {
          throw new Error(
            `Estoque insuficiente para "${prod.name}": disponível=${available}, solicitado=${item.quantity}`
          );
        }
      }

      const price = prod.price as number;
      const promo = prod.promotional_price as number | null;
      const effective = promo != null && promo < price ? promo : price;

      return {
        product_id: item.product_id,
        sku: prod.sku as string,
        name: prod.name as string,
        unit_price: price,
        promotional_price: promo,
        effective_price: effective,
        quantity: item.quantity,
        subtotal: effective * item.quantity,
        image: ((prod.images as string[]) ?? [])[0] ?? null,
      };
    });

    const subtotal = itemSnapshots.reduce((s, i) => s + i.subtotal, 0);

    const shippingCost = input.shipping_cost ?? 0;

    const customerSnapshot: CustomerSnapshot = {
      id: userId,
      full_name: (profile as DbProfile).full_name ?? '',
      email,
      phone: (profile as DbProfile).phone ?? null,
      cpf: (profile as DbProfile).cpf ?? null,
    };

    const shippingAddress: AddressSnapshot = {
      street: address.street,
      number: address.number,
      complement: address.complement ?? null,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state.toUpperCase(),
      zip_code: address.zip_code.replace('-', ''),
    };

    let discount = 0;
    let couponIdToIncrement: string | null = null;
    let validatedCouponCode: string | null = null;

    if (input.coupon_code) {
      const { data: coupon, error: couponErr } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', input.coupon_code.trim().toUpperCase())
        .maybeSingle();

      if (couponErr) {
        console.error('[OrderService] coupon fetch error:', couponErr);
      }

      if (
        coupon &&
        coupon.is_active &&
        (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) &&
        (coupon.max_uses === null || coupon.used_count < coupon.max_uses) &&
        subtotal >= coupon.min_purchase_value
      ) {
        if (coupon.discount_type === 'percentage') {
          discount = parseFloat((subtotal * (coupon.discount_value / 100)).toFixed(2));
        } else if (coupon.discount_type === 'fixed') {
          discount = coupon.discount_value;
        }
        discount = parseFloat(Math.min(discount, subtotal).toFixed(2));
        couponIdToIncrement = coupon.id;
        validatedCouponCode = coupon.code;
      }
    }

    const totalValue = parseFloat(Math.max(0, subtotal - discount + shippingCost).toFixed(2));
    const orderNumber = `CS-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        status: 'aguardando_pagamento',
        customer_snapshot: customerSnapshot,
        shipping_address: shippingAddress,
        items: itemSnapshots,
        subtotal: parseFloat(subtotal.toFixed(2)),
        shipping_cost: shippingCost,
        discount: discount,
        coupon_code: validatedCouponCode,
        total: totalValue,
        total_amount: totalValue,
        payment_method: input.payment_method,
        payment_status: 'pending',
        shipping_method: input.shipping_method,
        status_history: [
          {
            status: 'aguardando_pagamento',
            changed_at: new Date().toISOString(),
            changed_by: userId,
            note: 'Pedido criado',
          },
        ],
      })
      .select()
      .single();

    if (orderError) throw new Error(`[OrderService] create: ${orderError.message}`);
    const newOrder = order as DbOrder;

    // Incrementa contador de usos do cupom
    if (couponIdToIncrement) {
      try {
        const { data: couponToUpdate } = await supabase
          .from('coupons')
          .select('used_count')
          .eq('id', couponIdToIncrement)
          .single();
        if (couponToUpdate) {
          await supabase
            .from('coupons')
            .update({ used_count: (couponToUpdate.used_count || 0) + 1 })
            .eq('id', couponIdToIncrement);
        }
      } catch (couponErr) {
        console.error('[OrderService] Failed to increment coupon usage:', couponErr);
      }
    }

    // Reserva estoque
    try {
      await InventoryService.reserve(
        input.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        newOrder.id
      );
    } catch (err) {
      await supabase
        .from('orders')
        .update({
          status: 'cancelado',
          payment_status: 'failed',
          notes: 'Pedido cancelado automaticamente por falha na reserva de estoque.',
        })
        .eq('id', newOrder.id);
      throw err;
    }

    return newOrder;
  },

  /**
   * Atualiza status de um pedido (admin).
   * Valida transições permitidas e registra histórico.
   */
  async updateStatus(
    id: string,
    input: UpdateOrderStatusInput,
    updatedBy: string,
    meta: { ip?: string; userAgent?: string }
  ): Promise<DbOrder> {
    const supabase = createServiceClient();

    const current = await OrderService.getById(id, undefined, true);
    if (!current) throw new Error(`Pedido ${id} não encontrado`);

    const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(input.status as OrderStatus)) {
      throw new Error(
        `Transição inválida: ${current.status} → ${input.status}`
      );
    }

    const historyEntry = {
      status: input.status,
      changed_at: new Date().toISOString(),
      changed_by: updatedBy,
      note: input.note ?? null,
    };
    const currentHistory = Array.isArray((current as DbOrder & { status_history?: unknown }).status_history)
      ? (current as DbOrder & { status_history: typeof historyEntry[] }).status_history
      : [];

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: input.status,
        status_history: [...currentHistory, historyEntry],
        ...(input.status === 'entregue'
          ? { delivered_at: new Date().toISOString() }
          : {}),
        ...(input.status === 'enviado'
          ? { shipped_at: new Date().toISOString() }
          : {}),
      })
      .eq('id', id)
      .select()
      .single();

    let updatedOrder: DbOrder;

    if (!error) {
      updatedOrder = data as DbOrder;
    } else if (isLegacyOrdersError(error)) {
      const legacyUpdate: Record<string, unknown> = {
        status: input.status,
      };

      if (input.status === 'entregue') {
        legacyUpdate.delivered_at = new Date().toISOString();
      }
      if (input.status === 'enviado') {
        legacyUpdate.shipped_at = new Date().toISOString();
      }
      if (input.status === 'cancelado') {
        legacyUpdate.cancelled_at = new Date().toISOString();
        legacyUpdate.cancellation_reason = input.note ?? null;
        legacyUpdate.cancelled_by = updatedBy;
      }

      const legacy = await supabase
        .from('orders')
        .update(legacyUpdate)
        .eq('id', id)
        .select()
        .single();

      if (legacy.error) {
        throw new Error(`[OrderService] updateStatus legacy: ${legacy.error.message}`);
      }

      updatedOrder = legacy.data as DbOrder;
    } else {
      throw new Error(`[OrderService] updateStatus: ${error.message}`);
    }

    // Libera reserva se cancelado/estornado
    if (
      input.status === 'cancelado' ||
      input.status === 'estornado'
    ) {
      const items = (current as DbOrder & { items?: OrderItemSnapshot[] }).items ?? [];
      if (items.length > 0) {
        await InventoryService.releaseReservation(
          items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
          })),
          id
        );
      }
    }

    await AuditService.logUpdate(
      'order',
      id,
      { status: current.status },
      { status: input.status, note: input.note },
      { userId: updatedBy, ...meta }
    );

    return updatedOrder;
  },

  /**
   * Marca pedido como pago (chamado pelo webhook de pagamento).
   * Decrementa estoque definitivamente.
   */
  async markAsPaid(
    orderId: string,
    paymentReference: string,
    providerData: Record<string, unknown>,
    paidAt: string
  ): Promise<void> {
    const supabase = createServiceClient();

    const current = await OrderService.getById(orderId, undefined, true);
    if (!current) throw new Error(`Pedido ${orderId} não encontrado`);

    if (current.payment_status === 'paid') return; // idempotente

    const historyEntry = {
      status: 'pago',
      changed_at: paidAt,
      changed_by: null,
      note: 'Pagamento confirmado via webhook',
    };

    const { data: updatedPayment, error } = await supabase
      .from('orders')
      .update({
        status: 'pago',
        payment_status: 'paid',
        payment_reference: paymentReference,
        payment_provider_data: providerData,
        paid_at: paidAt,
        status_history: [...current.status_history, historyEntry],
      })
      .eq('id', orderId)
      .neq('payment_status', 'paid')
      .select('id')
      .maybeSingle();

    if (error) throw new Error(`[OrderService] markAsPaid: ${error.message}`);
    if (!updatedPayment) return;

    // Decrementa estoque definitivamente
    await InventoryService.decrementOnPayment(
      current.items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
      })),
      orderId,
      'webhook'
    );

    await AuditService.log({
      action: 'order.payment_confirmed',
      entity_type: 'order',
      entity_id: orderId,
      new_data: { payment_reference: paymentReference, paid_at: paidAt },
    });
  },

  /**
   * Marca pagamento como falho/expirado.
   */
  async markPaymentFailed(
    orderId: string,
    status: 'failed' | 'expired' | 'refunded'
  ): Promise<void> {
    const supabase = createServiceClient();

    const current = await OrderService.getById(orderId, undefined, true);
    if (!current) return;
    if (current.payment_status === 'paid') return;

    const newOrderStatus: OrderStatus =
      status === 'refunded' ? 'estornado' : 'cancelado';

    const historyEntry = {
      status: newOrderStatus,
      changed_at: new Date().toISOString(),
      changed_by: null,
      note: `Pagamento ${status === 'failed' ? 'falhou' : status === 'expired' ? 'expirou' : 'estornado'}`,
    };

    const { data: updatedPayment, error } = await supabase.from('orders').update({
      status: newOrderStatus,
      payment_status: status,
      status_history: [...current.status_history, historyEntry],
    })
      .eq('id', orderId)
      .neq('payment_status', 'paid')
      .select('id')
      .maybeSingle();

    if (error) throw new Error(`[OrderService] markPaymentFailed: ${error.message}`);
    if (!updatedPayment) return;

    // Libera reserva de estoque
    await InventoryService.releaseReservation(
      current.items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
      })),
      orderId
    );
  },

  /**
   * Atualiza código de rastreio (admin).
   */
  async updateTracking(
    orderId: string,
    trackingCode: string,
    shippingMethod: string,
    estimatedDelivery: string | undefined,
    updatedBy: string,
    meta: { ip?: string; userAgent?: string }
  ): Promise<DbOrder> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('orders')
      .update({
        shipping_tracking_code: trackingCode,
        shipping_method: shippingMethod,
        ...(estimatedDelivery ? { estimated_delivery: estimatedDelivery } : {}),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw new Error(`[OrderService] updateTracking: ${error.message}`);

    await AuditService.log({
      user_id: updatedBy,
      action: 'order.tracking_updated',
      entity_type: 'order',
      entity_id: orderId,
      new_data: { tracking_code: trackingCode, shipping_method: shippingMethod },
      ip_address: meta.ip,
      user_agent: meta.userAgent,
    });

    return data as DbOrder;
  },
};
