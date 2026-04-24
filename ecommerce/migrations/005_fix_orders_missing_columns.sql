-- ============================================================
-- CaseStore — Adiciona colunas subtotal e total na orders
-- Execute no SQL Editor do Supabase
-- ============================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total    DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Força reload do cache
NOTIFY pgrst, 'reload schema';
