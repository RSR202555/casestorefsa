import { products as fallbackProducts, type Product } from '@/data/products'
import type { ProductWithDetails } from '@/types'
import { ProductService } from '@/services/product.service'
import { unstable_noStore as noStore } from 'next/cache'

const FALLBACK_IMAGE = '/images/hero.jpeg'

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function resolveSlug(product: ProductWithDetails) {
  const maybeSlug = (product as ProductWithDetails & { slug?: unknown }).slug
  if (typeof maybeSlug === 'string' && maybeSlug.trim().length > 0) {
    return maybeSlug
  }
  const base = slugify(product.name)
  const skuSuffix = product.sku
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)
  return `${base}-${skuSuffix}`
}

function resolveBrand(product: ProductWithDetails) {
  const skuPrefix = product.sku.split(/[-_]/)[0]?.trim()
  return skuPrefix || 'CASE STORE'
}

function mapProduct(product: ProductWithDetails): Product {
  const hasPromotion =
    typeof product.promotional_price === 'number' &&
    product.promotional_price > 0 &&
    product.promotional_price < product.price
  const displayPrice = hasPromotion
    ? product.promotional_price!
    : product.price
  const images = product.images.filter(Boolean)
  const primaryImage = images[0] ?? FALLBACK_IMAGE
  const firstCategory = product.categories[0]
  const categoryName = firstCategory?.name ?? 'Catalogo'
  const categorySlug = firstCategory?.slug

  return {
    id: product.id,
    slug: resolveSlug(product),
    name: product.name,
    brand: resolveBrand(product),
    price: displayPrice,
    originalPrice: hasPromotion ? product.price : undefined,
    rating: 5,
    reviewCount: 0,
    image: primaryImage,
    images: images.length > 0 ? images : [primaryImage],
    category: categoryName,
    categorySlug,
    badge: hasPromotion ? 'promo' : 'new',
    description: product.description ?? 'Fragrancia disponivel no catalogo Case Store.',
    notes: {
      top: product.fragrance_notes.top ?? [],
      heart: product.fragrance_notes.heart ?? [],
      base: product.fragrance_notes.base ?? [],
    },
    inStock: product.inventory?.in_stock ?? true,
    stockCount: product.inventory?.available_stock ?? 0,
    sizes:
      product.fragrance_notes.sizes && product.fragrance_notes.sizes.length > 0
        ? product.fragrance_notes.sizes
        : [{ ml: 100, price: displayPrice }],
  }
}

export async function getCatalogProducts(): Promise<Product[]> {
  noStore()

  try {
    const response = await ProductService.list(
      {
        page: 1,
        limit: 100,
        is_active: undefined,
        sort: 'created_at',
        order: 'desc',
      },
      false
    )

    if (response.data.length > 0) {
      return response.data.map(mapProduct)
    }
  } catch (error) {
    console.error('[catalog-products] live catalog failed', error)
  }

  return fallbackProducts
}

export async function getCatalogProductBySlug(slug: string) {
  const products = await getCatalogProducts()
  return products.find((product) => product.slug === slug) ?? null
}

export async function getRelatedCatalogProducts(
  currentProduct: Product,
  limit = 4
) {
  const products = await getCatalogProducts()
  return products
    .filter(
      (product) =>
        product.id !== currentProduct.id &&
        product.category === currentProduct.category
    )
    .slice(0, limit)
}
