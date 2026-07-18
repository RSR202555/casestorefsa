/**
 * Serviço de Estoque.
 * Todas as operações de escrita usam o service client para garantir
 * consistência — as transações críticas (decremento após pagamento)
 * precisam de permissão elevada.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { AuditService } from './audit.service';
import type { StockMovementReason, DbInventory, DbInventoryMovement } from '@/types';
import type { AdjustInventoryInput } from '@/validators/inventory';

function isLegacyInventoryError(error: { message?: string; code?: string } | null): boolean {
  const message = error?.message ?? '';
  return (
    error?.code === 'PGRST205' ||
    error?.code === 'PGRST200' ||
    error?.code === '42P01' ||
    message.includes('Could not find the table') ||
    message.includes('Could not find a relationship') ||
    message.includes('does not exist')
  );
}

function isMissingRpcError(error: { message?: string; code?: string } | null): boolean {
  const message = error?.message ?? '';
  return error?.code === 'PGRST202' || message.includes('function') || message.includes('schema cache');
}

function getUuidOrNull(value: string): string | null {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function throwInventoryRpcError(
  error: { message?: string },
  fallbackProductId: string,
  fallbackQuantity: number
): never {
  const message = error.message ?? '';
  const insufficient = message.match(/INSUFFICIENT_STOCK:([^:]+):(\d+):(\d+)/);

  if (insufficient) {
    throw new InsufficientStockError(
      insufficient[1] ?? fallbackProductId,
      Number(insufficient[2] ?? fallbackQuantity),
      Number(insufficient[3] ?? 0)
    );
  }

  const reservationMissing = message.match(/RESERVATION_NOT_FOUND:([^:]+):(\d+)/);
  if (reservationMissing) {
    throw new Error(
      `Reserva de estoque não encontrada para produto ${reservationMissing[1]}`
    );
  }

  throw new Error(message || 'Erro ao atualizar estoque');
}

export class InsufficientStockError extends Error {
  constructor(
    public productId: string,
    public requested: number,
    public available: number
  ) {
    super(
      `Estoque insuficiente para produto ${productId}: solicitado=${requested}, disponível=${available}`
    );
    this.name = 'InsufficientStockError';
  }
}

export const InventoryService = {
  /**
   * Obtém estoque de um produto.
   */
  async getByProductId(productId: string): Promise<DbInventory | null> {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', productId)
      .single();

    if (!error) {
      return data as DbInventory;
    }

    if (isLegacyInventoryError(error)) {
      const legacy = await supabase
        .from('products')
        .select('id, stock_quantity, reserved_stock, low_stock_threshold, updated_at')
        .eq('id', productId)
        .single();

      if (legacy.error) {
        if (legacy.error.code === 'PGRST116') return null;
        throw new Error(`[InventoryService] getByProductId legacy: ${legacy.error.message}`);
      }

      return {
        id: legacy.data.id as string,
        product_id: legacy.data.id as string,
        stock_quantity: Number(legacy.data.stock_quantity ?? 0),
        reserved_stock: Number(legacy.data.reserved_stock ?? 0),
        low_stock_threshold: Number(legacy.data.low_stock_threshold ?? 0),
        updated_at: (legacy.data.updated_at as string) ?? new Date(0).toISOString(),
      };
    }

    if (error) {
      if (error.code === 'PGRST116') return null; // not found
      throw new Error(`[InventoryService] getByProductId: ${error.message}`);
    }
    return data as DbInventory;
  },

  /**
   * Lista estoque com filtro opcional de estoque baixo.
   */
  async list(opts: {
    low_stock_only?: boolean;
    product_id?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: DbInventory[]; total: number }> {
    const supabase = createServiceClient();
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 50;
    const from = (page - 1) * limit;

    let query = supabase
      .from('inventory')
      .select('*, products(id, name, sku)', { count: 'exact' });

    if (opts.product_id) {
      query = query.eq('product_id', opts.product_id);
    }
    if (opts.low_stock_only) {
      // Filtra onde stock_quantity <= low_stock_threshold
      // Supabase não suporta filtro coluna vs coluna diretamente, usar RPC ou filtro manual
      query = query.lte('stock_quantity', 20); // fallback aproximado
    }

    const { data, error, count } = await query.range(from, from + limit - 1);

    if (!error) {
      const items = (data ?? []) as DbInventory[];
      const filtered = opts.low_stock_only
        ? items.filter((i) => i.stock_quantity <= i.low_stock_threshold)
        : items;

      return { data: filtered, total: count ?? 0 };
    }

    if (!isLegacyInventoryError(error)) {
      throw new Error(`[InventoryService] list: ${error.message}`);
    }

    let legacyQuery = supabase
      .from('products')
      .select('id, stock_quantity, reserved_stock, low_stock_threshold, updated_at', { count: 'exact' })
      .range(from, from + limit - 1)
      .order('updated_at', { ascending: false });

    if (opts.product_id) {
      legacyQuery = legacyQuery.eq('id', opts.product_id);
    }

    const legacyResult = await legacyQuery;
    if (legacyResult.error) {
      throw new Error(`[InventoryService] list legacy: ${legacyResult.error.message}`);
    }

    const items = ((legacyResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: row.id as string,
      product_id: row.id as string,
      stock_quantity: Number(row.stock_quantity ?? 0),
      reserved_stock: Number(row.reserved_stock ?? 0),
      low_stock_threshold: Number(row.low_stock_threshold ?? 0),
      updated_at: (row.updated_at as string) ?? new Date(0).toISOString(),
    }));

    const filtered = opts.low_stock_only
      ? items.filter((i) => i.stock_quantity <= i.low_stock_threshold)
      : items;

    return { data: filtered, total: legacyResult.count ?? filtered.length };
  },

  /**
   * Cria registro de estoque para um produto recém-criado.
   */
  async create(
    productId: string,
    initialQuantity: number,
    lowStockThreshold: number
  ): Promise<DbInventory> {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('inventory')
      .insert({
        product_id: productId,
        stock_quantity: initialQuantity,
        reserved_stock: 0,
        low_stock_threshold: lowStockThreshold,
      })
      .select()
      .single();

    if (!error) return data as DbInventory;

    if (!isLegacyInventoryError(error)) {
      throw new Error(`[InventoryService] create: ${error.message}`);
    }

    const legacy = await supabase
      .from('products')
      .update({
        stock_quantity: initialQuantity,
        reserved_stock: 0,
        low_stock_threshold: lowStockThreshold,
      })
      .eq('id', productId)
      .select('id, stock_quantity, reserved_stock, low_stock_threshold, updated_at')
      .single();

    if (legacy.error) {
      throw new Error(`[InventoryService] create legacy: ${legacy.error.message}`);
    }

    return {
      id: legacy.data.id as string,
      product_id: legacy.data.id as string,
      stock_quantity: Number(legacy.data.stock_quantity ?? 0),
      reserved_stock: Number(legacy.data.reserved_stock ?? 0),
      low_stock_threshold: Number(legacy.data.low_stock_threshold ?? 0),
      updated_at: (legacy.data.updated_at as string) ?? new Date().toISOString(),
    };
  },

  /**
   * Ajuste manual de estoque (admin).
   * Registra movimentação e log de auditoria.
   */
  async adjust(
    input: AdjustInventoryInput,
    triggeredBy: string,
    meta: { ip?: string; userAgent?: string }
  ): Promise<DbInventory> {
    const supabase = createServiceClient();

    // Lê estoque atual
    const current = await InventoryService.getByProductId(input.product_id);
    if (!current) {
      throw new Error(`Estoque não encontrado para produto ${input.product_id}`);
    }

    const newQuantity = current.stock_quantity + input.quantity_delta;
    if (newQuantity < 0) {
      throw new InsufficientStockError(
        input.product_id,
        Math.abs(input.quantity_delta),
        current.stock_quantity
      );
    }

    const updateData: Partial<DbInventory> = {
      stock_quantity: newQuantity,
    };
    if (input.low_stock_threshold !== undefined) {
      updateData.low_stock_threshold = input.low_stock_threshold;
    }

    const { data, error } = await supabase
      .from('inventory')
      .update(updateData)
      .eq('product_id', input.product_id)
      .select()
      .single();

    let resultInventory: DbInventory;

    if (!error) {
      resultInventory = data as DbInventory;
    } else if (isLegacyInventoryError(error)) {
      const legacy = await supabase
        .from('products')
        .update(updateData)
        .eq('id', input.product_id)
        .select('id, stock_quantity, reserved_stock, low_stock_threshold, updated_at')
        .single();

      if (legacy.error) {
        throw new Error(`[InventoryService] adjust legacy: ${legacy.error.message}`);
      }

      resultInventory = {
        id: legacy.data.id as string,
        product_id: legacy.data.id as string,
        stock_quantity: Number(legacy.data.stock_quantity ?? 0),
        reserved_stock: Number(legacy.data.reserved_stock ?? 0),
        low_stock_threshold: Number(legacy.data.low_stock_threshold ?? 0),
        updated_at: (legacy.data.updated_at as string) ?? new Date().toISOString(),
      };
    } else {
      throw new Error(`[InventoryService] adjust: ${error.message}`);
    }

    // Registra movimentação
    await InventoryService._logMovement({
      product_id: input.product_id,
      reason: input.reason as StockMovementReason,
      quantity_delta: input.quantity_delta,
      stock_after: newQuantity,
      triggered_by: triggeredBy,
      notes: input.notes,
    });

    // Auditoria
    await AuditService.logUpdate(
      'inventory',
      current.id,
      { stock_quantity: current.stock_quantity },
      { stock_quantity: newQuantity, reason: input.reason },
      { userId: triggeredBy, ...meta }
    );

    return resultInventory;
  },

  /**
   * Decrementa estoque após confirmação de pagamento.
   * Lança InsufficientStockError se não houver quantidade suficiente.
   */
  async decrementOnPayment(
    items: Array<{ product_id: string; quantity: number }>,
    orderId: string,
    triggeredBy: string
  ): Promise<void> {
    const supabase = createServiceClient();

    const { error: rpcError } = await supabase.rpc('consume_reserved_inventory_items', {
      p_items: items,
      p_order_id: orderId,
      p_triggered_by: getUuidOrNull(triggeredBy),
    });

    if (!rpcError) return;
    if (!isMissingRpcError(rpcError)) {
      throwInventoryRpcError(rpcError, items[0]?.product_id ?? '', items[0]?.quantity ?? 0);
    }

    for (const item of items) {
      const current = await InventoryService.getByProductId(item.product_id);
      if (!current) continue;

      if (current.stock_quantity < item.quantity || current.reserved_stock < item.quantity) {
        throw new InsufficientStockError(
          item.product_id,
          item.quantity,
          Math.min(current.stock_quantity, current.reserved_stock)
        );
      }

      const newQuantity = current.stock_quantity - item.quantity;
      const newReserved = Math.max(0, current.reserved_stock - item.quantity);

      const { error } = await supabase
        .from('inventory')
        .update({
          stock_quantity: newQuantity,
          reserved_stock: newReserved,
        })
        .eq('product_id', item.product_id);

      if (error) {
        if (!isLegacyInventoryError(error)) {
          throw new Error(
            `[InventoryService] decrementOnPayment: ${error.message}`
          );
        }
        const legacyUpdate = await supabase
          .from('products')
          .update({
            stock_quantity: newQuantity,
            reserved_stock: newReserved,
          })
          .eq('id', item.product_id);
        if (legacyUpdate.error) {
          throw new Error(`[InventoryService] decrementOnPayment legacy: ${legacyUpdate.error.message}`);
        }
      }

      await InventoryService._logMovement({
        product_id: item.product_id,
        reason: 'purchase',
        quantity_delta: -item.quantity,
        stock_after: newQuantity,
        order_id: orderId,
        triggered_by: getUuidOrNull(triggeredBy) ?? undefined,
      });
    }
  },

  /**
   * Reserva estoque temporariamente no checkout (antes do pagamento).
   */
  async reserve(
    items: Array<{ product_id: string; quantity: number }>,
    orderId: string
  ): Promise<void> {
    const supabase = createServiceClient();

    const { error: rpcError } = await supabase.rpc('reserve_inventory_items', {
      p_items: items,
      p_order_id: orderId,
    });

    if (!rpcError) return;
    if (!isMissingRpcError(rpcError)) {
      throwInventoryRpcError(rpcError, items[0]?.product_id ?? '', items[0]?.quantity ?? 0);
    }

    for (const item of items) {
      const current = await InventoryService.getByProductId(item.product_id);
      if (!current) continue; // sem registro de estoque — pula reserva

      const available = current.stock_quantity - current.reserved_stock;
      if (available < item.quantity) {
        throw new InsufficientStockError(
          item.product_id,
          item.quantity,
          available
        );
      }

      const { error } = await supabase
        .from('inventory')
        .update({
          reserved_stock: current.reserved_stock + item.quantity,
        })
        .eq('product_id', item.product_id);

      if (error) {
        if (!isLegacyInventoryError(error)) {
          throw new Error(`[InventoryService] reserve: ${error.message}`);
        }
        const legacyUpdate = await supabase
          .from('products')
          .update({
            reserved_stock: current.reserved_stock + item.quantity,
          })
          .eq('id', item.product_id);
        if (legacyUpdate.error) {
          throw new Error(`[InventoryService] reserve legacy: ${legacyUpdate.error.message}`);
        }
      }

      await InventoryService._logMovement({
        product_id: item.product_id,
        reason: 'reservation',
        quantity_delta: -item.quantity,
        stock_after: current.stock_quantity - item.quantity,
        order_id: orderId,
      });
    }
  },

  /**
   * Cancela reserva de estoque (pedido cancelado ou pagamento expirado).
   */
  async releaseReservation(
    items: Array<{ product_id: string; quantity: number }>,
    orderId: string
  ): Promise<void> {
    const supabase = createServiceClient();

    const { error: rpcError } = await supabase.rpc('release_reserved_inventory_items', {
      p_items: items,
      p_order_id: orderId,
    });

    if (!rpcError) return;
    if (!isMissingRpcError(rpcError)) {
      console.error('[InventoryService] releaseReservation rpc:', rpcError.message);
    }

    for (const item of items) {
      const current = await InventoryService.getByProductId(item.product_id);
      if (!current) continue;

      const newReserved = Math.max(0, current.reserved_stock - item.quantity);

      const { error } = await supabase
        .from('inventory')
        .update({ reserved_stock: newReserved })
        .eq('product_id', item.product_id);

      if (error) {
        if (!isLegacyInventoryError(error)) continue;
        await supabase
          .from('products')
          .update({ reserved_stock: newReserved })
          .eq('id', item.product_id);
      }

      await InventoryService._logMovement({
        product_id: item.product_id,
        reason: 'reservation_cancel',
        quantity_delta: item.quantity,
        stock_after: current.stock_quantity,
        order_id: orderId,
      });
    }
  },

  // ── Privado ────────────────────────────────────────────────────────────

  async _logMovement(entry: Partial<DbInventoryMovement>): Promise<void> {
    const supabase = createServiceClient();
    const { error } = await supabase.from('inventory_movements').insert({
      product_id: entry.product_id ?? null,
      reason: entry.reason!,
      quantity_delta: entry.quantity_delta!,
      stock_after: entry.stock_after!,
      order_id: entry.order_id ?? null,
      triggered_by: entry.triggered_by ?? null,
      notes: entry.notes ?? null,
    });

    if (!error) return;

    if (isLegacyInventoryError(error)) {
      const legacy = await supabase.from('inventory_logs').insert({
        product_id: entry.product_id ?? null,
        quantity_change: entry.quantity_delta ?? 0,
        reason: entry.reason!,
        reference_id: entry.order_id ?? null,
        triggered_by: entry.triggered_by ?? null,
        notes: entry.notes ?? null,
      });

      if (legacy.error) {
        console.error('[InventoryService] _logMovement legacy:', legacy.error.message);
      }
      return;
    }

    console.error('[InventoryService] _logMovement:', error.message);
  },
};
