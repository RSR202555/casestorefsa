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

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

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

function normalizeRateLimitKey(namespace: string, key: string): string {
  const normalizedKey = key.trim() || 'unknown';
  return `rl:${namespace}:${normalizedKey}`;
}

function hasDistributedRateLimitConfig(): boolean {
  return Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
}

async function runUpstashCommand(
  ...command: string[]
): Promise<unknown> {
  const endpoint = `${UPSTASH_REDIS_REST_URL}/${command
    .map((part) => encodeURIComponent(part))
    .join('/')}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`[rate-limit] Upstash error ${response.status}`);
  }

  const payload = (await response.json()) as { result?: unknown };
  return payload.result;
}

async function checkDistributedRateLimit(
  namespace: string,
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redisKey = normalizeRateLimitKey(namespace, key);
  const count = Number(await runUpstashCommand('INCR', redisKey));

  if (!Number.isFinite(count)) {
    throw new Error('[rate-limit] Invalid INCR response');
  }

  if (count === 1) {
    await runUpstashCommand('PEXPIRE', redisKey, String(config.window_ms));
  }

  let ttl = Number(await runUpstashCommand('PTTL', redisKey));
  if (!Number.isFinite(ttl) || ttl < 0) {
    await runUpstashCommand('PEXPIRE', redisKey, String(config.window_ms));
    ttl = config.window_ms;
  }

  if (count > config.max) {
    return {
      allowed: false,
      remaining: 0,
      reset_at: Date.now() + ttl,
      retry_after_ms: ttl,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(config.max - count, 0),
    reset_at: Date.now() + ttl,
    retry_after_ms: 0,
  };
}

function checkInMemoryRateLimit(
  namespace: string,
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const store = getStore(namespace);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
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

/**
 * Verifica e incrementa o contador de rate limiting para uma chave.
 *
 * @param namespace - Agrupa limitadores (ex: 'auth', 'checkout')
 * @param key       - Identificador único (ex: IP do cliente)
 * @param config    - Janela e máximo de requisições
 */
export async function checkRateLimit(
  namespace: string,
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (hasDistributedRateLimitConfig()) {
    try {
      return await checkDistributedRateLimit(namespace, key, config);
    } catch (error) {
      console.error('[rate-limit] Falling back to in-memory store:', error);
    }
  }

  return checkInMemoryRateLimit(namespace, key, config);
}
