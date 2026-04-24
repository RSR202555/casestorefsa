-- Configurações do site (tabela de chave-valor)
-- Executar no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.site_config (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'null'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Somente admins podem ler/escrever
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all" ON public.site_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Valor padrão: promoção desativada
INSERT INTO public.site_config (key, value)
VALUES ('promo_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
