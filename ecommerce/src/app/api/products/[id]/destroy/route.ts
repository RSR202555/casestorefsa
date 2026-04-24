import { NextRequest } from 'next/server';
import { ProductService } from '@/services/product.service';
import { requireAdmin, isAuthError } from '@/middleware/auth';
import { ok, Errors, getClientIp } from '@/lib/utils';

type Params = { params: { id: string } };

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  try {
    await ProductService.deletePermanent(params.id, auth.userId, {
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? undefined,
    });

    return ok({ message: 'Produto excluido com sucesso' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao excluir produto';
    if (msg.includes('não encontrado') || msg.includes('nÃ£o encontrado')) {
      return Errors.notFound('Produto');
    }
    console.error('[DELETE /api/products/[id]/destroy]', err);
    return Errors.internal(msg);
  }
}
