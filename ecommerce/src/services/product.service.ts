/**
 * Serviço de Produtos.
 * CRUD completo com upload de imagens, gerenciamento de categorias e estoque inicial.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { put } from '@vercel/blob';
import { AuditService } from './audit.service';
import { InventoryService } from './inventory.service';
import { stripHtml, sanitizeText, buildPaginationResult } from '@/lib/utils';
import type { DbProduct, ProductWithDetails } from '@/types';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductQuery,
} from '@/validators/product';

type FragranceNotesInput = ProductWithDetails['fragrance_notes'];
const LEGACY_SIZES_MARKER = '__sizes__:';

// ── Helpers ────────────────────────────────────────────────────────────────

function sanitizeProduct(
  input: CreateProductInput | UpdateProductInput
): typeof input {
  return {
    ...input,
    name: input.name ? sanitizeText(input.name) : input.name,
    description: input.description ? stripHtml(input.description) : input.description,
  };
}

function computeEffectivePrice(price: number, promo: number | null | undefined): number {
  return promo != null && promo < price ? promo : price;
}

function isLegacySchemaError(error: { message?: string; code?: string } | null): boolean {
  const message = error?.message ?? '';
  return (
    error?.code === 'PGRST200' ||
    error?.code === 'PGRST205' ||
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    message.includes('Could not find a relationship') ||
    message.includes('Could not find the table') ||
    message.includes('schema cache') ||
    message.includes('column')
  );
}

function splitLegacyNotes(value: unknown): string[] {
  if (typeof value !== 'string' || value.trim().length === 0) return [];

  return value
    .split(/[;,|]/)
    .map((note) => note.trim())
    .filter(Boolean);
}

function extractLegacySizes(value: unknown): FragranceNotesInput['sizes'] {
  if (typeof value !== 'string' || !value.includes(LEGACY_SIZES_MARKER)) {
    return undefined;
  }

  const markerIndex = value.indexOf(LEGACY_SIZES_MARKER);
  const raw = value.slice(markerIndex + LEGACY_SIZES_MARKER.length).trim();

  try {
    return normalizeSizes(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function stripLegacySizesMarker(value: unknown): string {
  if (typeof value !== 'string' || !value.includes(LEGACY_SIZES_MARKER)) {
    return typeof value === 'string' ? value : '';
  }

  return value.slice(0, value.indexOf(LEGACY_SIZES_MARKER)).trim();
}

function joinLegacyNotesWithSizes(
  notes: string[] = [],
  sizes: FragranceNotesInput['sizes']
): string {
  const baseNotes = notes.join(', ');

  if (!sizes || sizes.length === 0) {
    return baseNotes;
  }

  const payload = JSON.stringify(sizes);
  return baseNotes
    ? `${baseNotes}\n${LEGACY_SIZES_MARKER}${payload}`
    : `${LEGACY_SIZES_MARKER}${payload}`;
}

function normalizeNoteList(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;

  return value
    .filter((note): note is string => typeof note === 'string')
    .map((note) => note.trim())
    .filter(Boolean);
}

function normalizeSizes(value: unknown): FragranceNotesInput['sizes'] {
  if (!Array.isArray(value)) return undefined;

  const sizes = value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      ml: Number(item.ml),
      price: Number(item.price),
    }))
    .filter((item) => Number.isFinite(item.ml) && item.ml > 0 && Number.isFinite(item.price) && item.price > 0);

  return sizes.length > 0 ? sizes : undefined;
}

function normalizeFragranceNotes(
  value: unknown,
  legacyFallback?: {
    top?: string[];
    heart?: string[];
    base?: string[];
  }
): FragranceNotesInput {
  const source =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};

  const top = normalizeNoteList(source.top, legacyFallback?.top ?? []);
  const heart = normalizeNoteList(source.heart, legacyFallback?.heart ?? []);
  const base = normalizeNoteList(source.base, legacyFallback?.base ?? []);
  const sizes = normalizeSizes(source.sizes);

  return {
    top,
    heart,
    base,
    ...(sizes ? { sizes } : {}),
  };
}

function withLegacyFragranceFields(
  payload: Record<string, unknown>,
  fragranceNotes: FragranceNotesInput | undefined
): Record<string, unknown> {
  if (fragranceNotes === undefined) return payload;

  return {
    ...payload,
    fragrance_notes: fragranceNotes,
    fragrance_top: (fragranceNotes.top ?? []).join(', '),
    fragrance_heart: (fragranceNotes.heart ?? []).join(', '),
    fragrance_base: joinLegacyNotesWithSizes(
      fragranceNotes.base ?? [],
      fragranceNotes.sizes
    ),
  };
}

async function runLegacyProductWrite(
  queryFactory: (payload: Record<string, unknown>) => Promise<{
    data: Record<string, unknown> | null;
    error: { message?: string; code?: string } | null;
  }>,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const payloads = 'fragrance_notes' in payload
    ? [
        payload,
        Object.fromEntries(
          Object.entries(payload).filter(([key]) => key !== 'fragrance_notes')
        ),
      ]
    : [payload];

  let lastError: { message?: string; code?: string } | null = null;

  for (const candidate of payloads) {
    const result = await queryFactory(candidate);

    if (!result.error && result.data) {
      return result.data;
    }

    lastError = result.error;

    if (!('fragrance_notes' in candidate) || !isLegacySchemaError(result.error)) {
      break;
    }
  }

  throw new Error(lastError?.message ?? 'Falha ao salvar produto na base legada');
}

function normalizeImageList(imageUrl: string | undefined): string[] {
  if (!imageUrl) return [];
  const normalized = imageUrl.trim();
  return normalized ? [normalized] : [];
}

function slugifyProductName(value: string, sku?: string): string {
  const base = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);

  if (!sku) return base;

  const skuSuffix = sku
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);

  return `${base}-${skuSuffix}`;
}

// Busca categorias de um produto sem depender de FK no schema cache do PostgREST
async function fetchProductCategories(
  supabase: ReturnType<typeof createServiceClient>,
  productId: string
): Promise<Array<{ id: string; name: string; slug: string }>> {
  try {
    const { data: pcRows } = await supabase
      .from('product_categories')
      .select('category_id')
      .eq('product_id', productId)

    if (!pcRows || pcRows.length === 0) return []

    const ids = pcRows.map((r: { category_id: string }) => r.category_id)

    const { data: catRows } = await supabase
      .from('categories')
      .select('id, name, slug')
      .in('id', ids)

    return (catRows ?? []) as Array<{ id: string; name: string; slug: string }>
  } catch {
    return []
  }
}

// ── Serviço ────────────────────────────────────────────────────────────────

export const ProductService = {
  /**
   * Lista produtos com paginação e filtros.
   * Clientes veem apenas produtos ativos; admins veem todos.
   */
  async list(
    query: ProductQuery,
    isAdmin = false
  ): Promise<ReturnType<typeof buildPaginationResult<ProductWithDetails>>> {
    const supabase = createServiceClient();
    const from = (query.page - 1) * query.limit;

    let dbQuery = supabase
      .from('products')
      .select(
        `
        *,
        product_categories(category_id, categories(id, name, slug)),
        inventory(stock_quantity, reserved_stock, low_stock_threshold)
      `,
        { count: 'exact' }
      )
      .range(from, from + query.limit - 1)
      .order(query.sort, { ascending: query.order === 'asc' });

    // Admin pode ver inativos; clientes só veem ativos
    if (!isAdmin) {
      dbQuery = dbQuery.eq('is_active', true);
    } else if (query.is_active !== undefined) {
      dbQuery = dbQuery.eq('is_active', query.is_active);
    }

    if (query.search) {
      dbQuery = dbQuery.or(
        `name.ilike.%${query.search}%,description.ilike.%${query.search}%,sku.ilike.%${query.search}%`
      );
    }

    if (query.min_price !== undefined) {
      dbQuery = dbQuery.gte('price', query.min_price);
    }
    if (query.max_price !== undefined) {
      dbQuery = dbQuery.lte('price', query.max_price);
    }

    const { data, error, count } = await dbQuery;
    if (!error) {
      const products = (data ?? []).map((row: Record<string, unknown>) =>
        ProductService._mapToProductWithDetails(row)
      );

      // Se o JOIN do PostgREST não retornou categorias, busca via query direta
      const productsWithCategories = await Promise.all(
        products.map(async (p) => {
          if (p.categories.length === 0) {
            p.categories = await fetchProductCategories(supabase, p.id)
          }
          return p
        })
      );

      const filtered = query.category
        ? productsWithCategories.filter((p) =>
            p.categories.some((c) => c.id === query.category)
          )
        : productsWithCategories;

      return buildPaginationResult(filtered, count ?? 0, query.page, query.limit);
    }

    if (!isLegacySchemaError(error)) {
      throw new Error(`[ProductService] list: ${error.message}`);
    }

    let legacyQuery = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .range(from, from + query.limit - 1)
      .order(query.sort, { ascending: query.order === 'asc' });

    if (!isAdmin) {
      legacyQuery = legacyQuery.eq('active', true);
    } else if (query.is_active !== undefined) {
      legacyQuery = legacyQuery.eq('active', query.is_active);
    }

    if (query.search) {
      legacyQuery = legacyQuery.or(
        `name.ilike.%${query.search}%,description.ilike.%${query.search}%,sku.ilike.%${query.search}%`
      );
    }

    if (query.category) {
      legacyQuery = legacyQuery.eq('category_id', query.category);
    }

    if (query.min_price !== undefined) {
      legacyQuery = legacyQuery.gte('price', query.min_price);
    }
    if (query.max_price !== undefined) {
      legacyQuery = legacyQuery.lte('price', query.max_price);
    }

    const legacyResult = await legacyQuery;
    if (legacyResult.error) {
      throw new Error(`[ProductService] list legacy: ${legacyResult.error.message}`);
    }

    const products = (legacyResult.data ?? []).map((row: Record<string, unknown>) =>
      ProductService._mapToProductWithDetails(row)
    );

    return buildPaginationResult(products, legacyResult.count ?? 0, query.page, query.limit);
  },

  /**
   * Busca produto por ID.
   */
  async getById(
    id: string,
    isAdmin = false
  ): Promise<ProductWithDetails | null> {
    const supabase = createServiceClient();

    let query = supabase
      .from('products')
      .select(
        `*, product_categories(category_id, categories(id, name, slug)),
         inventory(stock_quantity, reserved_stock, low_stock_threshold)`
      )
      .eq('id', id);

    if (!isAdmin) query = query.eq('is_active', true);

    const { data, error } = await query.single();

    if (!error) {
      const product = ProductService._mapToProductWithDetails(data as Record<string, unknown>)
      if (product.categories.length === 0) {
        product.categories = await fetchProductCategories(supabase, id)
      }
      return product
    }

    if (error.code === 'PGRST116') return null;
    if (!isLegacySchemaError(error)) {
      throw new Error(`[ProductService] getById: ${error.message}`);
    }

    let legacyQuery = supabase
      .from('products')
      .select('*')
      .eq('id', id);

    if (!isAdmin) legacyQuery = legacyQuery.eq('active', true);

    const legacyResult = await legacyQuery.single();
    if (legacyResult.error) {
      if (legacyResult.error.code === 'PGRST116') return null;
      throw new Error(`[ProductService] getById legacy: ${legacyResult.error.message}`);
    }

    const legacyProduct = ProductService._mapToProductWithDetails(
      legacyResult.data as Record<string, unknown>
    )
    if (legacyProduct.categories.length === 0) {
      legacyProduct.categories = await fetchProductCategories(supabase, id)
    }
    return legacyProduct
  },

  /**
   * Busca produto por SKU.
   */
  async getBySku(sku: string): Promise<DbProduct | null> {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('sku', sku.toUpperCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`[ProductService] getBySku: ${error.message}`);
    }
    return data as DbProduct;
  },

  /**
   * Cria produto com estoque inicial e categorias.
   */
  async create(
    input: CreateProductInput,
    createdBy: string,
    meta: { ip?: string; userAgent?: string }
  ): Promise<ProductWithDetails> {
    const supabase = createServiceClient();
    const sanitized = sanitizeProduct(input);

    // Verifica SKU duplicado
    const existing = await ProductService.getBySku(input.sku);
    if (existing) {
      throw new Error(`SKU '${input.sku}' já está em uso`);
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name: sanitized.name,
        description: sanitized.description ?? null,
        sku: input.sku.toUpperCase(),
        price: input.price,
        promotional_price: input.promotional_price ?? null,
        fragrance_notes: input.fragrance_notes,
        images: normalizeImageList(input.image_url),
        is_active: input.is_active,
        created_by: createdBy,
        updated_by: createdBy,
      })
      .select()
      .single();

    let newProductId: string;
    let auditPayload: Record<string, unknown>;

    if (!error) {
      const newProduct = product as DbProduct;
      newProductId = newProduct.id;
      auditPayload = newProduct as unknown as Record<string, unknown>;

      await InventoryService.create(
        newProduct.id,
        input.initial_stock ?? 0,
        input.low_stock_threshold ?? 5
      );

      if (input.category_ids && input.category_ids.length > 0) {
        await ProductService._syncCategories(newProduct.id, input.category_ids);
      }
    } else if (isLegacySchemaError(error) || error.code === '42703') {
      const legacyPayload = withLegacyFragranceFields(
        {
          name: sanitized.name,
          slug: slugifyProductName(sanitized.name ?? input.name, input.sku),
          description: sanitized.description ?? null,
          sku: input.sku.toUpperCase(),
          price: input.price,
          promotional_price: input.promotional_price ?? null,
          stock_quantity: input.initial_stock ?? 0,
          reserved_stock: 0,
          low_stock_threshold: input.low_stock_threshold ?? 5,
          active: input.is_active,
          image_urls: normalizeImageList(input.image_url),
        },
        input.fragrance_notes
      );

      const legacyData = await runLegacyProductWrite(
        async (payload) =>
          await supabase
            .from('products')
            .insert(payload)
            .select()
            .single(),
        legacyPayload
      );

      newProductId = legacyData.id as string;
      auditPayload = legacyData as Record<string, unknown>;

      if (input.category_ids && input.category_ids.length > 0) {
        await ProductService._syncCategories(newProductId, input.category_ids);
      }
    } else {
      throw new Error(`[ProductService] create: ${error.message}`);
    }

    await AuditService.logCreate('product', newProductId, auditPayload, {
      userId: createdBy,
      ...meta,
    });

    return (await ProductService.getById(newProductId, true))!;
  },

  /**
   * Atualiza produto existente.
   */
  async update(
    id: string,
    input: UpdateProductInput,
    updatedBy: string,
    meta: { ip?: string; userAgent?: string }
  ): Promise<ProductWithDetails> {
    const supabase = createServiceClient();

    const current = await ProductService.getById(id, true);
    if (!current) throw new Error(`Produto ${id} não encontrado`);

    const sanitized = sanitizeProduct(input);

    const updatePayload: Partial<DbProduct> = {
      updated_by: updatedBy,
    };

    if (sanitized.name !== undefined) updatePayload.name = sanitized.name;
    if (sanitized.description !== undefined)
      updatePayload.description = sanitized.description ?? null;
    if (input.price !== undefined) updatePayload.price = input.price;
    if (input.promotional_price !== undefined)
      updatePayload.promotional_price = input.promotional_price ?? null;
    if (input.fragrance_notes !== undefined)
      updatePayload.fragrance_notes = input.fragrance_notes;
    if (input.image_url !== undefined)
      updatePayload.images = normalizeImageList(input.image_url);
    if (input.is_active !== undefined) updatePayload.is_active = input.is_active;

    const { data, error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    let updatedData: Record<string, unknown>;

    if (!error) {
      if (input.category_ids !== undefined) {
        await ProductService._syncCategories(id, input.category_ids);
      }
      updatedData = data as unknown as Record<string, unknown>;
    } else if (isLegacySchemaError(error) || error.code === '42703') {
      let legacyPayload: Record<string, unknown> = {};

      if (sanitized.name !== undefined) {
        legacyPayload.name = sanitized.name;
        legacyPayload.slug = slugifyProductName(sanitized.name, current.sku);
      }
      if (sanitized.description !== undefined) legacyPayload.description = sanitized.description ?? null;
      if (input.price !== undefined) legacyPayload.price = input.price;
      if (input.promotional_price !== undefined) legacyPayload.promotional_price = input.promotional_price ?? null;
      legacyPayload = withLegacyFragranceFields(legacyPayload, input.fragrance_notes);
      if (input.image_url !== undefined) {
        legacyPayload.image_urls = normalizeImageList(input.image_url);
      }
      if (input.is_active !== undefined) legacyPayload.active = input.is_active;
      if (input.low_stock_threshold !== undefined) legacyPayload.low_stock_threshold = input.low_stock_threshold;

      updatedData = await runLegacyProductWrite(
        async (payload) =>
          await supabase
            .from('products')
            .update(payload)
            .eq('id', id)
            .select()
            .single(),
        legacyPayload
      );

      if (input.category_ids !== undefined) {
        await ProductService._syncCategories(id, input.category_ids);
      }
    } else {
      throw new Error(`[ProductService] update: ${error.message}`);
    }

    await AuditService.logUpdate(
      'product',
      id,
      current as unknown as Record<string, unknown>,
      updatedData,
      { userId: updatedBy, ...meta }
    );

    return (await ProductService.getById(id, true))!;
  },

  /**
   * Soft delete (desativa produto).
   */
  async deactivate(
    id: string,
    deletedBy: string,
    meta: { ip?: string; userAgent?: string }
  ): Promise<void> {
    const supabase = createServiceClient();
    const current = await ProductService.getById(id, true);
    if (!current) throw new Error(`Produto ${id} não encontrado`);

    const { error } = await supabase
      .from('products')
      .update({ is_active: false, updated_by: deletedBy })
      .eq('id', id);

    if (error) {
      if (isLegacySchemaError(error) || error.code === '42703') {
        const legacy = await supabase
          .from('products')
          .update({ active: false })
          .eq('id', id);

        if (legacy.error) {
          throw new Error(`[ProductService] deactivate legacy: ${legacy.error.message}`);
        }
      } else {
        throw new Error(`[ProductService] deactivate: ${error.message}`);
      }
    }

    await AuditService.logDelete('product', id, current as unknown as Record<string, unknown>, {
      userId: deletedBy,
      ...meta,
    });
  },

  /**
   * Exclusão definitiva do produto.
   */
  async deletePermanent(
    id: string,
    deletedBy: string,
    meta: { ip?: string; userAgent?: string }
  ): Promise<void> {
    const supabase = createServiceClient();
    const current = await ProductService.getById(id, true);
    if (!current) throw new Error(`Produto ${id} não encontrado`);

    const deleteCategories = await supabase
      .from('product_categories')
      .delete()
      .eq('product_id', id);

    if (deleteCategories.error && !isLegacySchemaError(deleteCategories.error)) {
      throw new Error(`[ProductService] delete categories: ${deleteCategories.error.message}`);
    }

    const deleteInventory = await supabase
      .from('inventory')
      .delete()
      .eq('product_id', id);

    if (deleteInventory.error && !isLegacySchemaError(deleteInventory.error)) {
      throw new Error(`[ProductService] delete inventory: ${deleteInventory.error.message}`);
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`[ProductService] deletePermanent: ${error.message}`);
    }

    await AuditService.logDelete('product', id, current as unknown as Record<string, unknown>, {
      userId: deletedBy,
      ...meta,
    });
  },

  /**
   * Upload de imagem para Vercel Blob.
   * Retorna URL pública.
   */
  async uploadImage(
    productId: string,
    file: File
  ): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif'];
    if (!allowedExts.includes(ext)) {
      throw new Error(`Tipo de arquivo não permitido: ${ext}`);
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Imagem deve ter no máximo 5MB');
    }

    const blob = await put(
      `products/${productId}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`,
      file,
      {
        access: 'public',
        addRandomSuffix: true,
        contentType: file.type || `image/${ext}`,
      }
    );

    return blob.url;
  },

  /**
   * Adiciona URL de imagem ao array de imagens do produto.
   */
  async addImageUrl(productId: string, imageUrl: string): Promise<void> {
    const supabase = createServiceClient();
    const { error } = await supabase.rpc('array_append_unique', {
      table_name: 'products',
      column_name: 'images',
      row_id: productId,
      value: imageUrl,
    });

    // Fallback: fetch e update manual caso RPC não exista
    if (error) {
      const { data: prod, error: readError } = await supabase
        .from('products')
        .select('images')
        .eq('id', productId)
        .single();

      if (!readError) {
        const images = [...((prod as DbProduct)?.images ?? []), imageUrl];
        const { error: updateError } = await supabase
          .from('products')
          .update({ images })
          .eq('id', productId);

        if (!updateError) {
          return;
        }

        if (!isLegacySchemaError(updateError)) {
          throw new Error(`[ProductService] addImageUrl: ${updateError.message}`);
        }
      }

      const legacyRead = await supabase
        .from('products')
        .select('image_urls')
        .eq('id', productId)
        .single();

      if (legacyRead.error) {
        throw new Error(`[ProductService] addImageUrl legacy read: ${legacyRead.error.message}`);
      }

      const currentImageUrls = Array.isArray(legacyRead.data.image_urls)
        ? (legacyRead.data.image_urls as string[])
        : [];
      const nextImageUrls = Array.from(new Set([...currentImageUrls, imageUrl]));
      const legacyUpdate = await supabase
        .from('products')
        .update({ image_urls: nextImageUrls })
        .eq('id', productId);

      if (legacyUpdate.error) {
        throw new Error(`[ProductService] addImageUrl legacy: ${legacyUpdate.error.message}`);
      }
    }
  },

  // ── Privado ──────────────────────────────────────────────────────────────

  async _syncCategories(productId: string, categoryIds: string[]): Promise<void> {
    const supabase = createServiceClient();

    // Remove todas as categorias atuais
    await supabase
      .from('product_categories')
      .delete()
      .eq('product_id', productId);

    if (categoryIds.length === 0) return;

    const rows = categoryIds.map((cid) => ({
      product_id: productId,
      category_id: cid,
    }));

    const { error } = await supabase.from('product_categories').insert(rows);
    if (error) {
      throw new Error(`[ProductService] _syncCategories: ${error.message}`);
    }
  },

  _mapToProductWithDetails(row: Record<string, unknown>): ProductWithDetails {
    const hasModernColumns =
      'fragrance_notes' in row ||
      'is_active' in row ||
      'images' in row ||
      'created_by' in row ||
      'updated_by' in row;
    const isLegacyProduct =
      !hasModernColumns &&
      ('active' in row || 'image_urls' in row || 'stock_quantity' in row);

    if (isLegacyProduct) {
      const price = Number(row.price ?? 0);
      const promo =
        row.promotional_price == null ? null : Number(row.promotional_price);
      const stockQuantity = Number(row.stock_quantity ?? 0);
      const reservedStock = Number(row.reserved_stock ?? 0);
      const lowStockThreshold = Number(row.low_stock_threshold ?? 0);
      const legacySizes = extractLegacySizes(row.fragrance_base);
      const legacyNotes = {
        top: splitLegacyNotes(row.fragrance_top),
        heart: splitLegacyNotes(row.fragrance_heart),
        base: splitLegacyNotes(stripLegacySizesMarker(row.fragrance_base)),
      };

      return {
        id: row.id as string,
        name: (row.name as string) ?? '',
        description: (row.description as string | null) ?? null,
        sku: (row.sku as string) ?? '',
        price,
        promotional_price: promo,
        effective_price: computeEffectivePrice(price, promo),
        fragrance_notes: {
          ...normalizeFragranceNotes(row.fragrance_notes, legacyNotes),
          ...(legacySizes ? { sizes: legacySizes } : {}),
        },
        images: ((row.image_urls as string[] | null) ?? []).filter(Boolean),
        is_active: Boolean(row.active ?? true),
        categories: [],
        inventory: {
          stock_quantity: stockQuantity,
          reserved_stock: reservedStock,
          available_stock: stockQuantity - reservedStock,
          low_stock_threshold: lowStockThreshold,
          is_low_stock: stockQuantity <= lowStockThreshold,
          in_stock: stockQuantity - reservedStock > 0,
        },
        created_at: (row.created_at as string) ?? new Date(0).toISOString(),
        updated_at: (row.updated_at as string) ?? (row.created_at as string) ?? new Date(0).toISOString(),
      };
    }

    const inv = row.inventory as
      | Array<{
          stock_quantity: number;
          reserved_stock: number;
          low_stock_threshold: number;
        }>
      | null;
    const invItem = Array.isArray(inv) ? inv[0] : inv;

    const categories = (
      (row.product_categories as Array<{ categories: unknown }>) ?? []
    )
      .map((pc) => pc.categories)
      .filter(Boolean) as Array<{ id: string; name: string; slug: string }>;

    const price = row.price as number;
    const promo = row.promotional_price as number | null;
    const fallbackLegacySizes = extractLegacySizes(row.fragrance_base);
    const normalizedFragranceNotes = normalizeFragranceNotes(row.fragrance_notes);

    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      sku: row.sku as string,
      price,
      promotional_price: promo,
      effective_price: computeEffectivePrice(price, promo),
      fragrance_notes: {
        ...normalizedFragranceNotes,
        ...(!normalizedFragranceNotes.sizes && fallbackLegacySizes
          ? { sizes: fallbackLegacySizes }
          : {}),
      },
      images: (row.images as string[]) ?? [],
      is_active: row.is_active as boolean,
      categories,
      inventory: invItem
        ? {
            stock_quantity: invItem.stock_quantity,
            reserved_stock: invItem.reserved_stock,
            available_stock: invItem.stock_quantity - invItem.reserved_stock,
            low_stock_threshold: invItem.low_stock_threshold,
            is_low_stock:
              invItem.stock_quantity <= invItem.low_stock_threshold,
            in_stock: invItem.stock_quantity - invItem.reserved_stock > 0,
          }
        : null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  },
};
