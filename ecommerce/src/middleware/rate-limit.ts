/**
 * Rate Limiting em memória.
 *
 * IMPORTANTE: Esta implementação usa um Map em memória e funciona
 * apenas para processos single-instance. Em produção com múltiplas
 * réplicas, substitua pelo @upstash/ratelimit com Redis:
 *   https://github.com/upstash/ratelimit
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Separado por "namespace" para isolar limites por tipo de rota
const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(namespace: string): Map<string, RateLimitEntry> {
  if (!stores.has(namespace)) {
    stores.set(namespace, new Map());
  }
  return stores.get(namespace)!;
}

// Limpeza periódica de entradas expiradas (evita vazamento de memória)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [, store] of Array.from(stores.entries())) {
      for (const [key, entry] of Array.from(store.entries())) {
        if (entry.resetAt < now) store.delete(key);
      }
    }
  }, 60_000);
}

export interface RateLimitConfig {
  /** Janela de tempo em milissegundos */
  window_ms: number;
  /** Máximo de requisições por janela */
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset_at: number;
  retry_after_ms: number;
}

/**
 * Verifica e incrementa o contador de rate limiting para uma chave.
 *
 * @param namespace - Agrupa limitadores (ex: 'auth', 'checkout')
 * @param key       - Identificador único (ex: IP do cliente)
 * @param config    - Janela e máximo de requisições
 */
export function checkRateLimit(
  namespace: string,
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const store = getStore(namespace);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // Janela expirada ou primeira requisição
    const resetAt = now + config.window_ms;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.max - 1,
      reset_at: resetAt,
      retry_after_ms: 0,
    };
  }

  if (entry.count >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      reset_at: entry.resetAt,
      retry_after_ms: entry.resetAt - now,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: config.max - entry.count,
    reset_at: entry.resetAt,
    retry_after_ms: 0,
  };
}
