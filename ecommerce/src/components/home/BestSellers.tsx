import Link from 'next/link'
import { getCatalogProducts } from '@/lib/catalog-products'
import ProductCard from '@/components/product/ProductCard'

export default async function BestSellers() {
  const allProducts = await getCatalogProducts()

  // Prioridade: badge bestseller → promo → new → sem badge
  const bestSellers = [
    ...allProducts.filter((p) => p.badge === 'bestseller'),
    ...allProducts.filter((p) => p.badge === 'promo'),
    ...allProducts.filter((p) => p.badge === 'new'),
    ...allProducts.filter((p) => !p.badge),
  ].slice(0, 4)

  if (bestSellers.length === 0) return null

  return (
    <section className="bg-neutral-50 py-16 lg:py-24">
      <div className="container-custom">
        <div className="mb-10 text-center sm:mb-14">
          <span className="inline-block text-primary-500 text-sm font-semibold tracking-[0.2em] uppercase mb-4">
            Mais Vendidos
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 mb-4">
            Os Favoritos das Nossas Clientes
          </h2>
          <p className="text-neutral-500 max-w-2xl mx-auto">
            Descubra os perfumes mais desejados, escolhidos por milhares de mulheres que encontraram sua fragrância assinatura.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {bestSellers.map((product, index) => (
            <div key={product.id}>
              <ProductCard product={product} priority={index < 4} />
            </div>
          ))}
        </div>

        <div className="mt-10 text-center sm:mt-14">
          <Link href="/products" className="btn-secondary w-full sm:w-auto">
            Ver Todos os Produtos
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
