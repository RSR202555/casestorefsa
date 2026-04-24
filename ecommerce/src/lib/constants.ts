/**
 * Constantes globais da aplicação.
 * NUNCA coloque segredos aqui — use variáveis de ambiente.
 */

// Loja
export const STORE_NAME = 'CaseStore';
export const STORE_EMAIL = 'contato@casestore.com.br';

// CEP de origem para cálculo de frete (altere para o seu CEP)
export const ORIGIN_ZIP_CODE = '01310100';

// Frete
export const CORREIOS_BASE_URL = 'https://api.correios.com.br';
export const CORREIOS_SERVICES = {
  PAC: '04510',
  SEDEX: '04014',
} as const;

// Peso padrão de embalagem em gramas (caixa vazia)
export const DEFAULT_PACKAGE_WEIGHT_GRAMS = 200;

// Supabase Storage
export const PRODUCT_IMAGES_BUCKET = 'product-images';

// Paginação
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Limites de rate limiting (requisições por janela)
export const RATE_LIMITS = {
  AUTH: { window_ms: 15 * 60 * 1000, max: 30 },        // 30 req/15min
  PUBLIC_API: { window_ms: 60 * 1000, max: 60 },        // 60 req/min
  WEBHOOK: { window_ms: 60 * 1000, max: 100 },          // 100 req/min
  CHECKOUT: { window_ms: 60 * 1000, max: 10 },          // 10 req/min
} as const;

// Mercado Pago — gateway de pagamentos
// Docs: https://www.mercadopago.com.br/developers
export const MP_API_BASE_URL = 'https://api.mercadopago.com';
export const PIX_EXPIRATION_SECONDS = 30 * 60; // 30 minutos

// Alertas de estoque baixo: notificar quando quantidade ≤ threshold
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
