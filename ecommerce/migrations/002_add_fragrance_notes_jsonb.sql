-- Suporte a tamanhos (ml) no JSON de fragrancia para bases antigas/mistas

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS fragrance_notes JSONB NOT NULL DEFAULT '{"top": [], "heart": [], "base": []}'::jsonb;

UPDATE public.products
SET fragrance_notes = jsonb_build_object(
  'top',
  CASE
    WHEN COALESCE(BTRIM(fragrance_top), '') = '' THEN '[]'::jsonb
    ELSE to_jsonb(regexp_split_to_array(BTRIM(fragrance_top), '\s*[,;|]\s*'))
  END,
  'heart',
  CASE
    WHEN COALESCE(BTRIM(fragrance_heart), '') = '' THEN '[]'::jsonb
    ELSE to_jsonb(regexp_split_to_array(BTRIM(fragrance_heart), '\s*[,;|]\s*'))
  END,
  'base',
  CASE
    WHEN COALESCE(BTRIM(fragrance_base), '') = '' THEN '[]'::jsonb
    ELSE to_jsonb(regexp_split_to_array(BTRIM(fragrance_base), '\s*[,;|]\s*'))
  END
)
WHERE
  (fragrance_notes IS NULL OR fragrance_notes = '{"top": [], "heart": [], "base": []}'::jsonb)
  AND (
    COALESCE(BTRIM(fragrance_top), '') <> ''
    OR COALESCE(BTRIM(fragrance_heart), '') <> ''
    OR COALESCE(BTRIM(fragrance_base), '') <> ''
  );
