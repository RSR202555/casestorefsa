'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Product } from '@/data/products'
import { useCart } from '@/hooks/useCart'

interface ProductCardProps {
  product: Product
  priority?: boolean
}

const badgeConfig = {
  promo: { label: 'Promoção', className: 'bg-primary-500 text-white' },
  bestseller: { label: 'Mais Vendido', className: 'bg-amber-500 text-white' },
  new: { label: 'Novo', className: 'bg-neutral-900 text-white' },
  limited: { label: 'Ed. Limitada', className: 'bg-violet-600 text-white' },
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const router = useRouter()
  const { addItem } = useCart()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0

  return (
    <Link href={`/products/${product.slug}`}>
      <article className="group relative overflow-hidden rounded-[1.5rem] bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card">
        <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className={`object-contain transition-all duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`}
            onLoad={() => setImageLoaded(true)}
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* Badge */}
          {product.badge && (
            <span
              className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badgeConfig[product.badge].className}`}
            >
              {badgeConfig[product.badge].label}
            </span>
          )}

          {/* Discount */}
          {discount > 0 && (
            <span className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
              -{discount}%
            </span>
          )}

          <button
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-400 opacity-100 shadow-sm backdrop-blur-sm transition-all duration-300 hover:text-primary-500 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Favoritar"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>

          {/* Loading skeleton */}
          {!imageLoaded && <div className="absolute inset-0 bg-neutral-100" />}
        </div>

        <div className="p-3 sm:p-4">
          <p className="mb-1 truncate text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            {product.brand}
          </p>
          <h3 className="mb-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-neutral-800 transition-colors group-hover:text-primary-500">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="mb-3 flex items-center gap-1.5">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`h-3 w-3 ${i < Math.floor(product.rating) ? 'text-amber-400' : 'text-neutral-200'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-[11px] text-neutral-400">({product.reviewCount})</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-primary-500">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-neutral-400 line-through">
                R$ {product.originalPrice.toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                addItem({ product_id: product.id, name: product.name, brand: product.brand, price: product.price, image: product.image, slug: product.slug })
                router.push('/checkout')
              }}
              className="rounded-xl border border-primary-500 px-3 py-2.5 text-xs font-semibold text-primary-500 transition-colors hover:bg-primary-50"
            >
              Comprar
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                addItem({ product_id: product.id, name: product.name, brand: product.brand, price: product.price, image: product.image, slug: product.slug })
                setAddedToCart(true)
                setTimeout(() => setAddedToCart(false), 2000)
              }}
              className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${addedToCart ? 'bg-emerald-500 text-white' : 'bg-primary-500 text-white hover:bg-primary-600'}`}
            >
              {addedToCart ? 'Adicionado!' : '+ Carrinho'}
            </button>
          </div>
        </div>
      </article>
    </Link>
  )
}
