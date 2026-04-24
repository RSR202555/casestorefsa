/**
 * POST /api/products/[id]/images
 * Upload de imagem para Vercel Blob.
 * Aceita multipart/form-data com campo "file".
 */

import { NextRequest } from 'next/server';
import { ProductService } from '@/services/product.service';
import { requireAdmin, isAuthError } from '@/middleware/auth';
import { ok, Errors } from '@/lib/utils';

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return auth;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Errors.badRequest('Formulário inválido — use multipart/form-data');
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return Errors.badRequest('Campo "file" ausente ou inválido');
  }

  // Verifica que o produto existe
  const product = await ProductService.getById(params.id, true).catch(() => null);
  if (!product) return Errors.notFound('Produto');

  try {
    const url = await ProductService.uploadImage(params.id, file);
    await ProductService.addImageUrl(params.id, url);
    return ok({ url }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro no upload';
    console.error('[POST /api/products/[id]/images]', err);
    return Errors.badRequest(msg);
  }
}
