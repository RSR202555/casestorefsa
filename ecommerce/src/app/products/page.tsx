import type { Metadata } from 'next'
import Link from 'next/link'
import ProductCard from '@/components/product/ProductCard'
import { getCatalogProducts } from '@/lib/catalog-products'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ProductsPageProps = {
  searchParams?:
    | Promise<{
        category?: string
        filter?: string
        brand?: string
      }>
    | {
        category?: string
        filter?: string
        brand?: string
      }
}

export const metadata: Metadata = {
  title: 'Produtos | Case Store',
  description: 'Catálogo com perfumes premium, ofertas e lançamentos.',
}

function normalizeParam(value?: string) {
  return value?.trim().toLowerCase()
}

async function getCategories(): Promise<Array<{ id: string; name: string; slug: string }>> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug')
      .order('name', { ascending: true })
    return data ?? []
  } catch {
    return []
  }
}

// Retorna os IDs de produto que pertencem à categoria com o slug informado.
// Faz a query diretamente nas tabelas sem depender de FK no schema cache do PostgREST.
async function getProductIdsByCategory(slug: string): Promise<Set<string> | null> {
  try {
    const supabase = createServiceClient()

    // 1. acha o ID da categoria pelo slug
    const { data: catData } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!catData) return null

    // 2. busca todos os product_ids vinculados a essa categoria
    const { data: pcData } = await supabase
      .from('product_categories')
      .select('product_id')
      .eq('category_id', catData.id)

    if (!pcData || pcData.length === 0) return new Set()

    return new Set(pcData.map((r: { product_id: string }) => r.product_id))
  } catch {
    return null
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {}
  const selectedCategory = normalizeParam(resolvedSearchParams.category)
  const selectedFilter = normalizeParam(resolvedSearchParams.filter)
  const selectedBrand = normalizeParam(resolvedSearchParams.brand)

  const [products, dbCategories, categoryProductIds] = await Promise.all([
    getCatalogProducts(),
    getCategories(),
    selectedCategory ? getProductIdsByCategory(selectedCategory) : Promise.resolve(null),
  ])

  const brands = Array.from(new Set(products.map((p) => p.brand)))

  const filteredProducts = products.filter((product) => {
    if (categoryProductIds !== null && !categoryProductIds.has(product.id)) return false
    if (selectedBrand && product.brand.toLowerCase() !== selectedBrand) return false
    if (selectedFilter === 'promo' && !product.originalPrice) return false
    if (selectedFilter === 'new' && product.badge !== 'new') return false
    return true
  })

  return (
    <div className="min-h-screen bg-[#F8F7F5] pb-16 pt-24 lg:pb-20 lg:pt-32">
      {/* Main Content */}
      <section className="container-custom mt-6 grid gap-6 lg:mt-8 lg:grid-cols-[260px_1fr] lg:gap-8">
        {/* Sidebar */}
        <aside className="h-fit space-y-6 rounded-[1.75rem] bg-white p-4 shadow-soft sm:p-6 lg:sticky lg:top-28">
          {/* Categorias */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
              Categorias
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/products"
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  !selectedCategory
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Todos
              </Link>
              {dbCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.slug}`}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    selectedCategory === cat.slug
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Filtros Rápidos */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
              Filtros Rápidos
            </p>
            <div className="mt-3 space-y-2">
              <Link
                href="/products?filter=promo"
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  selectedFilter === 'promo'
                    ? 'bg-primary-50 text-primary-600'
                    : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <svg
                  className={`h-4 w-4 flex-shrink-0 ${selectedFilter === 'promo' ? 'text-primary-500' : 'text-neutral-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                Promoções
              </Link>
              <Link
                href="/products?filter=new"
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  selectedFilter === 'new'
                    ? 'bg-primary-50 text-primary-600'
                    : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <svg
                  className={`h-4 w-4 flex-shrink-0 ${selectedFilter === 'new' ? 'text-primary-500' : 'text-neutral-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
                Lançamentos
              </Link>
            </div>
          </div>

          {/* Marcas */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
              Marcas
            </p>
            <div className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {brands.map((brand) => {
                const slug = brand.toLowerCase()
                const isSelected = selectedBrand === slug
                return (
                  <Link
                    key={brand}
                    href={isSelected ? '/products' : `/products?brand=${slug}`}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-neutral-50"
                  >
                    <span
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded ${
                        isSelected
                          ? 'bg-primary-500'
                          : 'border border-neutral-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className={isSelected ? 'font-semibold text-neutral-900' : 'text-neutral-600'}>
                      {brand}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Product Area */}
        <div>
          {/* Header */}
          <div className="mb-5 flex flex-col gap-3 rounded-[1.75rem] bg-white px-4 py-4 shadow-soft sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-base font-semibold text-neutral-900">
              <span className="text-primary-500">{filteredProducts.length}</span> produtos encontrados
            </p>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <span className="hidden sm:inline">Ordenar:</span>
              <span className="font-medium text-neutral-700">Relevância</span>
              <svg className="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 4} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.75rem] bg-white p-8 text-center shadow-soft sm:p-12">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
                <svg className="h-6 w-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">
                Nenhum produto encontrado
              </h3>
              <p className="mt-2 text-sm text-neutral-500">
                Limpe os filtros para ver o catálogo completo.
              </p>
              <Link href="/products" className="btn-primary mt-6 inline-flex w-full sm:w-auto">
                Limpar filtros
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
