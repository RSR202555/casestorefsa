/**
 * GET /api/cron/supabase-keepalive
 * Mantem o projeto Supabase ativo com uma consulta leve agendada.
 */

import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { Errors, ok, timingSafeEqual } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return true;
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;

  return token ? timingSafeEqual(token, cronSecret) : false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Errors.unauthorized();
  }

  try {
    const startedAt = Date.now();
    const supabase = createServiceClient();
    const { error } = await supabase
      .from('products')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[GET /api/cron/supabase-keepalive]', error);
      return Errors.internal('Falha ao consultar o Supabase');
    }

    return ok({
      status: 'ok',
      checked_at: new Date().toISOString(),
      latency_ms: Date.now() - startedAt,
    });
  } catch (err) {
    console.error('[GET /api/cron/supabase-keepalive]', err);
    return Errors.internal('Falha ao executar keepalive do Supabase');
  }
}
