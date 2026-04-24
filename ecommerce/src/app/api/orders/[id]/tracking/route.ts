/**
 * PATCH /api/orders/[id]/tracking — Atualiza o código de rastreio do pedido (admin only)
 */

import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin, isAuthError } from '@/middleware/auth';
import { ok, Errors } from '@/lib/utils';
import { z } from 'zod';

const Schema = z.object({
  tracking_code: z.string().trim().min(1, 'Código de rastreio obrigatório').max(100),
});

type Params = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('JSON inválido');
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Errors.badRequest('Dados inválidos', parsed.error.flatten());

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .update({ shipping_tracking_code: parsed.data.tracking_code })
    .eq('id', params.id)
    .select('id, order_number, shipping_tracking_code')
    .single();

  if (error) {
    console.error('[PATCH tracking]', error.message);
    return Errors.internal('Erro ao salvar código de rastreio');
  }

  return ok(data);
}
