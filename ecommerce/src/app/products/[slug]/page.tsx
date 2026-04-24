import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProductCard from '@/components/product/ProductCard'
import { formatCurrency } from '@/lib/utils'
import {
  getCatalogProductBySlug,
  getCatalogProducts,
  getRelatedCatalogProducts,
} from '@/lib/catalog-products'

export const dynamic = 'force-dynamic'

type ProductDetailPageProps = {
  params: Promise<{
    slug: string
  }> | {
    slug: string
  }
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await Promise.resolve(params)
  const product = await getCatalogProductBySlug(slug)

  if (!product) {
    return {
      title: 'Produto nao encontrado | Essencia Feminina',
    }
  }

  return {
    title: `${product.name} | Essencia Feminina`,
    description: product.description,
  }
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await Promise.resolve(params)
  const product = await getCatalogProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const relatedProducts = await getRelatedCatalogProducts(product)
  const relatedProductsToShow =
    relatedProducts.length > 0
      ? relatedProducts
      : (await getCatalogProducts()).filter((item) => item.id !== product.id).slice(0, 4)

  return (
    <div className="bg-white pb-16 pt-24 lg:pb-28 lg:pt-40">
      <section className="container-custom">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-neutral-500 sm:mb-8 sm:gap-3 sm:text-sm">
          <Link href="/" className="hover:text-primary-500">
            Home
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-primary-500">
            Produtos
          </Link>
          <span>/</span>
          <span className="text-neutral-900">{product.name}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-10">
          <div className="grid gap-4 lg:grid-cols-[96px_1fr]">
            <div className="order-2 flex gap-3 lg:order-1 lg:flex-col">
              {product.images.map((image, index) => (
                <div
                  key={image}
                  className={`relative overflow-hidden rounded-3xl border ${
                    index === 0
                      ? 'border-primary-500'
                      : 'border-neutral-200'
                  } aspect-[4/5] w-20 shrink-0 bg-white p-2 lg:w-24`}
                >
                  <Image
                    src={image}
                    alt={`${product.name} vista ${index + 1}`}
                    fill
                    className="object-contain"
                    sizes="96px"
                  />
                </div>
              ))}
            </div>

            <div className="order-1 relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-white p-4 shadow-card sm:p-6 lg:order-2">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                priority
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-500">
              {product.brand}
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-neutral-900 sm:mt-4 md:text-5xl">
              {product.name}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600 sm:mt-6 sm:text-lg sm:leading-8">
              {product.description}
            </p>

            <div className="mt-6 flex items-center gap-3 sm:mt-8">
              <span className="text-2xl font-bold text-primary-500 sm:text-3xl">
                {formatCurrency(product.price)}
              </span>
              {product.originalPrice ? (
                <span className="text-lg text-neutral-400 line-through">
                  {formatCurrency(product.originalPrice)}
                </span>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 rounded-[2rem] bg-neutral-50 p-5 sm:mt-8 sm:p-6 md:grid-cols-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Avaliacao
                </p>
                <p className="mt-2 text-xl font-semibold text-neutral-900">
                  {product.rating} / 5
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Estoque
                </p>
                <p className="mt-2 text-xl font-semibold text-neutral-900">
                  {product.stockCount} unidades
                </p>
              </div>
            </div>

            <div className="mt-6 sm:mt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Tamanhos
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {product.sizes.map((size, index) => (
                  <div
                    key={size.ml}
                    className={`rounded-2xl border px-4 py-3 ${
                      index === 0
                        ? 'border-primary-500 bg-primary-50 text-primary-600'
                        : 'border-neutral-200 text-neutral-700'
                    }`}
                  >
                    <p className="text-sm font-semibold">{size.ml} ml</p>
                    <p className="mt-1 text-sm">{formatCurrency(size.price)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2">
              <Link href="/carrinho" className="btn-primary justify-center">
                Adicionar ao carrinho
              </Link>
              <Link href="/products" className="btn-secondary justify-center">
                Continuar comprando
              </Link>
            </div>

            <div className="mt-8 grid gap-6 rounded-[2rem] border border-neutral-200 p-5 sm:mt-10 sm:p-6 md:grid-cols-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Notas de saida
                </p>
                <p className="mt-3 text-neutral-700">
                  {product.notes.top.join(', ')}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Corpo
                </p>
                <p className="mt-3 text-neutral-700">
                  {product.notes.heart.join(', ')}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Fundo
                </p>
                <p className="mt-3 text-neutral-700">
                  {product.notes.base.join(', ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-custom mt-16 sm:mt-20">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-500">
              Sugestoes
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-neutral-900">
              Outras fragrancias no mesmo universo
            </h2>
          </div>
          <Link href="/products" className="btn-ghost">
            Ver catalogo
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-4">
          {relatedProductsToShow.map((relatedProduct) => (
            <ProductCard key={relatedProduct.id} product={relatedProduct} />
          ))}
        </div>
      </section>
    </div>
  )
}
