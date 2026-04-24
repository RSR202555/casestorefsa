'use client'

import Link from 'next/link'
import { products } from '@/data/products'
import ProductCard from '@/components/product/ProductCard'

export default function Promotions() {
  const promoProducts = products.filter(p => p.originalPrice).slice(0, 4)

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-pink-600 py-16 lg:py-24">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      <div className="container-custom relative z-10">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Content */}
          <div className="text-white">
            <span className="mb-5 inline-block rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm sm:mb-6">
              ✨ Oferta Especial
            </span>
            <h2 className="mb-5 font-display text-3xl font-semibold leading-tight md:text-4xl lg:text-5xl">
              Fragrâncias Premium
              <span className="block">com até 30% OFF</span>
            </h2>
            <p className="mb-7 max-w-lg text-base text-white/80 sm:text-lg">
              Aproveite descontos exclusivos em perfumes importados das melhores marcas. 
              Qualidade garantida com os melhores preços do mercado.
            </p>

            {/* Countdown Timer */}
            <div className="mb-8 grid max-w-sm grid-cols-4 gap-2 sm:mb-10 sm:gap-4">
              {[
                { value: '02', label: 'Dias' },
                { value: '18', label: 'Horas' },
                { value: '45', label: 'Min' },
                { value: '30', label: 'Seg' },
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="mb-2 flex h-14 w-full items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm sm:h-16">
                    <span className="font-mono text-xl font-bold sm:text-2xl">{item.value}</span>
                  </div>
                  <span className="text-xs text-white/70">{item.label}</span>
                </div>
              ))}
            </div>

            <Link href="/products?filter=promo" className="btn-primary w-full !bg-white !text-primary-500 hover:!bg-neutral-100 sm:w-auto">
              Ver Ofertas
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* Products */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {promoProducts.slice(0, 2).map((product, index) => (
              <div
                key={product.id}
                className="transform hover:scale-105 transition-transform duration-500"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
