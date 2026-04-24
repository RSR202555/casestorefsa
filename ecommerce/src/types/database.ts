/**
 * Tipos que espelham exatamente as tabelas do banco Supabase.
 * Gerado manualmente — use `supabase gen types typescript` para automatizar.
 */

export type UserRole = 'admin' | 'customer';

export type OrderStatus =
  | 'carrinho'
  | 'checkout'
  | 'aguardando_pagamento'
  | 'pago'
  | 'enviado'
  | 'entregue'
  | 'cancelado'
  | 'estornado';

export type StockMovementReason =
  | 'purchase'
  | 'adjustment'
  | 'return'
  | 'reservation'
  | 'reservation_cancel'
  | 'admin_adjustment';

export type PaymentMethod = 'pix' | 'credit_card' | 'boleto';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'expired';

// ── Tabelas ────────────────────────────────────────────────────────────────

export interface DbProfile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  cpf: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAddress {
  id: string;
  user_id: string;
  label: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  is_default: boolean;
  created_at: string;
}

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface DbProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  price: number;
  promotional_price: number | null;
  fragrance_notes: FragranceNotes;
  images: string[];
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProductCategory {
  product_id: string;
  category_id: string;
}

export interface DbInventory {
  id: string;
  product_id: string;
  stock_quantity: number;
  reserved_stock: number;
  low_stock_threshold: number;
  updated_at: string;
}

export interface DbInventoryMovement {
  id: string;
  product_id: string | null;
  reason: StockMovementReason;
  quantity_delta: number;
  stock_after: number;
  order_id: string | null;
  triggered_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface DbOrder {
  id: string;
  user_id: string;
  status: OrderStatus;
  customer_snapshot: CustomerSnapshot;
  shipping_address: AddressSnapshot;
  items: OrderItemSnapshot[];
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  payment_provider_data: Record<string, unknown> | null;
  paid_at: string | null;
  shipping_method: string | null;
  shipping_tracking_code: string | null;
  estimated_delivery: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  status_history: OrderStatusHistoryEntry[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ── JSONB embutidos ────────────────────────────────────────────────────────

export interface FragranceNotes {
  top: string[];
  heart: string[];
  base: string[];
  sizes?: { ml: number; price: number }[];
}

export interface CustomerSnapshot {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
}

export interface AddressSnapshot {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface OrderItemSnapshot {
  product_id: string;
  sku: string;
  name: string;
  unit_price: number;         // preço no momento da compra
  promotional_price: number | null;
  effective_price: number;    // preço cobrado (promo ou normal)
  quantity: number;
  subtotal: number;
  image: string | null;
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  changed_at: string;
  changed_by: string | null;
  note: string | null;
}
