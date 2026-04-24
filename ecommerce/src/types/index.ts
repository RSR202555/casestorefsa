/**
 * Tipos de domínio da aplicação (camada de serviço / API).
 * Distintos dos tipos de banco — podem ter campos computados, relações carregadas etc.
 */

export type {
  UserRole,
  OrderStatus,
  StockMovementReason,
  PaymentMethod,
  PaymentStatus,
  DbProfile,
  DbAddress,
  DbCategory,
  DbProduct,
  DbInventory,
  DbInventoryMovement,
  DbOrder,
  DbAuditLog,
  FragranceNotes,
  CustomerSnapshot,
  AddressSnapshot,
  OrderItemSnapshot,
  OrderStatusHistoryEntry,
} from './database';

// ── Respostas padronizadas de API ──────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Produto enriquecido (com categorias e estoque) ─────────────────────────

export interface ProductWithDetails {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  price: number;
  promotional_price: number | null;
  effective_price: number;
  fragrance_notes: import('./database').FragranceNotes;
  images: string[];
  is_active: boolean;
  categories: Array<{ id: string; name: string; slug: string }>;
  inventory: {
    stock_quantity: number;
    reserved_stock: number;
    available_stock: number;
    low_stock_threshold: number;
    is_low_stock: boolean;
    in_stock: boolean;
  } | null;
  created_at: string;
  updated_at: string;
}

// ── Pedido enriquecido ─────────────────────────────────────────────────────

export type OrderWithDetails = import('./database').DbOrder & {
  profile?: import('./database').DbProfile;
};

// ── Frete ──────────────────────────────────────────────────────────────────

export interface ShippingOption {
  service_code: string;
  service_name: string;
  price: number;
  delivery_days: number;
  error: boolean;
  error_code?: string;
  error_message?: string;
}

export interface ShippingCalculateResponse {
  options: ShippingOption[];
  origin_zip: string;
  destination_zip: string;
}

// ── Pagamento ──────────────────────────────────────────────────────────────

export interface PixPaymentResponse {
  payment_id: string;
  pix_code: string;       // código copia-e-cola
  qr_code_url: string;    // URL da imagem QR
  expires_at: string;
  amount: number;
}

export interface WebhookPaymentEvent {
  event: 'payment.confirmed' | 'payment.failed' | 'payment.refunded' | 'payment.expired';
  payment_id: string;
  order_reference: string;
  amount: number;
  paid_at?: string;
  metadata?: Record<string, unknown>;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export interface DashboardKPIs {
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  paid_orders: number;
  refunded_orders: number;
  average_ticket: number;
  orders_today: number;
  revenue_today: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  sku: string;
  total_quantity: number;
  total_revenue: number;
}

export interface OrdersByStatus {
  status: string;
  count: number;
}

export type ReportPeriod = 'day' | 'week' | 'month' | 'year';

// ── Carrinho (representação interna) ──────────────────────────────────────

export interface CartItem {
  product_id: string;
  quantity: number;
}

export interface CheckoutInput {
  items: CartItem[];
  address_id: string;
  shipping_method: string;
  payment_method: import('./database').PaymentMethod;
}

// ── Autenticação ───────────────────────────────────────────────────────────

export interface AuthenticatedRequest {
  userId: string;
  role: import('./database').UserRole;
  email: string;
}
