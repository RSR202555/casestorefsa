/**
 * POST /api/shipping/calculate
 * Calcula opções de frete (PAC e SEDEX) via API dos Correios.
 */

import { NextRequest } from 'next/server';
import { ShippingService } from '@/services/shipping.service';
import { ok, Errors, getClientIp } from '@/lib/utils';
import { checkRateLimit } from '@/middleware/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';
import { CalculateShippingSchema } from '@/validators/shipping';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit('public_api', ip, RATE_LIMITS.PUBLIC_API);
  if (!rl.allowed) return Errors.tooManyRequests();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('JSON inválido');
  }

  const parsed = CalculateShippingSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Dados inválidos', parsed.error.flatten());
  }

  try {
    const result = await ShippingService.calculate(parsed.data);
    return ok(result);
  } catch (err) {
    console.error('[POST /api/shipping/calculate]', err);
    return Errors.internal('Erro ao calcular frete');
  }
}
