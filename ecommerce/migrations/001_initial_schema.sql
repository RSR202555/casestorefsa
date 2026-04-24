-- ============================================================
-- CaseStore — Schema inicial do banco de dados
-- Executar no SQL Editor do Supabase
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('admin', 'customer');

CREATE TYPE order_status AS ENUM (
  'carrinho',
  'checkout',
  'aguardando_pagamento',
  'pago',
  'enviado',
  'entregue',
  'cancelado',
  'estornado'
);

CREATE TYPE stock_movement_reason AS ENUM (
  'purchase',
  'adjustment',
  'return',
  'reservation',
  'reservation_cancel',
  'admin_adjustment'
);

CREATE TYPE payment_method AS ENUM ('pix', 'credit_card', 'boleto');

CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'refunded',
  'expired'
);

-- ============================================================
-- PERFIS (estende auth.users do Supabase)
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role        user_role NOT NULL DEFAULT 'customer',
  full_name   TEXT,
  phone       TEXT,
  cpf         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ENDEREÇOS
-- ============================================================
CREATE TABLE public.addresses (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  label         TEXT,
  street        TEXT NOT NULL,
  number        TEXT NOT NULL,
  complement    TEXT,
  neighborhood  TEXT NOT NULL,
  city          TEXT NOT NULL,
  state         CHAR(2) NOT NULL,
  zip_code      TEXT NOT NULL,
  is_default    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATEGORIAS
-- ============================================================
CREATE TABLE public.categories (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUTOS
-- ============================================================
CREATE TABLE public.products (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT,
  sku               TEXT UNIQUE NOT NULL,
  price             DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  promotional_price DECIMAL(10, 2)  CHECK (promotional_price >= 0),
  -- Ex: {"top": ["Bergamota"], "heart": ["Rosa"], "base": ["Sândalo"]}
  fragrance_notes   JSONB NOT NULL DEFAULT '{"top": [], "heart": [], "base": []}',
  images            TEXT[] DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_by        UUID REFERENCES public.profiles(id),
  updated_by        UUID REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT promotional_price_less_than_price
    CHECK (promotional_price IS NULL OR promotional_price < price)
);

-- ============================================================
-- PRODUCT ↔ CATEGORY (junction)
-- ============================================================
CREATE TABLE public.product_categories (
  product_id  UUID REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

-- ============================================================
-- ESTOQUE
-- ============================================================
CREATE TABLE public.inventory (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id          UUID REFERENCES public.products(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stock_quantity      INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_stock      INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LOG DE MOVIMENTAÇÃO DE ESTOQUE
-- ============================================================
CREATE TABLE public.inventory_movements (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
  reason          stock_movement_reason NOT NULL,
  quantity_delta  INTEGER NOT NULL,   -- positivo = entrada, negativo = saída
  stock_after     INTEGER NOT NULL,
  order_id        UUID,               -- FK opcional para orders
  triggered_by    UUID REFERENCES public.profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PEDIDOS
-- ============================================================
CREATE TABLE public.orders (
  id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id              UUID REFERENCES public.profiles(id) NOT NULL,
  status               order_status NOT NULL DEFAULT 'aguardando_pagamento',

  -- Snapshot do cliente no momento da compra
  customer_snapshot    JSONB NOT NULL,
  -- Snapshot do endereço de entrega
  shipping_address     JSONB NOT NULL,
  -- Snapshot dos itens com preços no momento da compra
  items                JSONB NOT NULL,

  subtotal             DECIMAL(10, 2) NOT NULL,
  shipping_cost        DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount             DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total                DECIMAL(10, 2) NOT NULL,

  -- Pagamento
  payment_method       payment_method,
  payment_status       payment_status NOT NULL DEFAULT 'pending',
  payment_reference    TEXT,           -- ID gerado pela Infinity Pay
  payment_provider_data JSONB,         -- dados brutos do provider
  paid_at              TIMESTAMPTZ,

  -- Frete
  shipping_method      TEXT,
  shipping_tracking_code TEXT,
  estimated_delivery   DATE,
  shipped_at           TIMESTAMPTZ,
  delivered_at         TIMESTAMPTZ,

  -- Histórico de mudanças de status [{status, changed_at, changed_by, note}]
  status_history       JSONB NOT NULL DEFAULT '[]',
  notes                TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LOG DE AUDITORIA
-- ============================================================
CREATE TABLE public.audit_logs (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id),
  action      TEXT NOT NULL,      -- Ex: 'product.created', 'order.status_changed'
  entity_type TEXT NOT NULL,      -- Ex: 'product', 'order', 'inventory'
  entity_id   TEXT,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_products_sku        ON public.products(sku);
CREATE INDEX idx_products_is_active  ON public.products(is_active);
CREATE INDEX idx_products_created_at ON public.products(created_at DESC);

CREATE INDEX idx_orders_user_id           ON public.orders(user_id);
CREATE INDEX idx_orders_status            ON public.orders(status);
CREATE INDEX idx_orders_payment_status    ON public.orders(payment_status);
CREATE INDEX idx_orders_payment_reference ON public.orders(payment_reference);
CREATE INDEX idx_orders_created_at        ON public.orders(created_at DESC);

CREATE INDEX idx_inventory_product_id ON public.inventory(product_id);

CREATE INDEX idx_inv_movements_product ON public.inventory_movements(product_id);
CREATE INDEX idx_inv_movements_order   ON public.inventory_movements(order_id);

CREATE INDEX idx_audit_entity    ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user      ON public.audit_logs(user_id);
CREATE INDEX idx_audit_created   ON public.audit_logs(created_at DESC);

-- ============================================================
-- FUNÇÃO: atualiza updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNÇÃO: cria profile automaticamente ao criar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;

-- Helper: verifica se o usuário autenticado é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- profiles ----
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_admin_all" ON public.profiles
  USING (public.is_admin());

-- ---- addresses ----
CREATE POLICY "addresses_own" ON public.addresses
  USING (auth.uid() = user_id OR public.is_admin());

-- ---- products (leitura pública dos ativos; escrita só admin) ----
CREATE POLICY "products_select_active" ON public.products
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "products_admin_write" ON public.products
  FOR ALL USING (public.is_admin());

-- ---- categories ----
CREATE POLICY "categories_select_public" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "categories_admin_write" ON public.categories
  FOR ALL USING (public.is_admin());

-- ---- product_categories ----
CREATE POLICY "pc_select_public" ON public.product_categories
  FOR SELECT USING (true);

CREATE POLICY "pc_admin_write" ON public.product_categories
  FOR ALL USING (public.is_admin());

-- ---- inventory ----
CREATE POLICY "inventory_admin" ON public.inventory
  USING (public.is_admin());

-- ---- inventory_movements ----
CREATE POLICY "inv_movements_admin" ON public.inventory_movements
  USING (public.is_admin());

-- ---- orders ----
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders_admin_update" ON public.orders
  FOR UPDATE USING (public.is_admin());

-- ---- audit_logs ----
CREATE POLICY "audit_admin_select" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

CREATE POLICY "audit_service_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (true); -- inserção via service role apenas
