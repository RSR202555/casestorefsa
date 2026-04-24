-- ============================================================
-- CaseStore — Correção completa do schema da tabela orders
-- Execute no SQL Editor do Supabase (Dashboard → SQL Editor)
-- ============================================================

-- Cria os ENUMs caso não existam
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('pix', 'credit_card', 'boleto');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'carrinho', 'checkout', 'aguardando_pagamento',
    'pago', 'enviado', 'entregue', 'cancelado', 'estornado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Adiciona todas as colunas faltantes na tabela orders
-- ============================================================

-- Snapshot dos itens do pedido
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]';

-- Snapshot do cliente
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_snapshot JSONB NOT NULL DEFAULT '{}';

-- Endereço de entrega
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address JSONB NOT NULL DEFAULT '{}';

-- Custo do frete
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Desconto
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Método de pagamento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN payment_method payment_method;
  END IF;
END $$;

-- Status do pagamento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN payment_status payment_status NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Referência do pagamento (ID do provider)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Dados brutos do provider
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_provider_data JSONB;

-- Data do pagamento
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Frete
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_method TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_tracking_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery DATE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Histórico de status
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]';

-- Notas internas
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- user_id (pode estar como customer_id em schemas antigos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'user_id'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_id'
    ) THEN
      ALTER TABLE public.orders RENAME COLUMN customer_id TO user_id;
    ELSE
      ALTER TABLE public.orders ADD COLUMN user_id UUID REFERENCES public.profiles(id);
    END IF;
  END IF;
END $$;

-- ============================================================
-- Garante índice no payment_reference (usado no webhook)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON public.orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

-- ============================================================
-- Garante policies essenciais
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'orders_insert_own'
  ) THEN
    EXECUTE 'CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- ============================================================
-- Força reload do cache do PostgREST
-- Resolve os erros "column not found in schema cache"
-- ============================================================
NOTIFY pgrst, 'reload schema';
