'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default function CartPage() {
  const { items, removeItem, updateQty, total, count } = useCart()

  if (items.length === 0) {
    return (
      <div className="bg-neutral-50 pb-20 pt-32 lg:pt-40">
        <div className="container-custom">
          <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-10 text-center shadow-card">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100">
              <svg className="h-9 w-9 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-neutral-900">Seu carrinho está vazio</h1>
            <p className="mt-2 text-neutral-500">Adicione produtos para continuar</p>
            <Link href="/products" className="btn-primary mt-8 inline-flex">
              Ver produtos
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-neutral-50 pb-20 pt-32 lg:pt-40">
      <div className="container-custom">
        <h1 className="mb-8 text-3xl font-semibold text-neutral-900">
          Carrinho <span className="text-neutral-400">({count} {count === 1 ? 'item' : 'itens'})</span>
        </h1>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Itens */}
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.product_id}
                className="flex gap-4 rounded-[24px] bg-white p-5 shadow-soft"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-neutral-50">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-contain"
                    sizes="96px"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        {item.brand}
                      </p>
                      <Link
                        href={`/products/${item.slug}`}
                        className="mt-0.5 font-semibold text-neutral-900 hover:text-primary-500"
                      >
                        {item.name}
                      </Link>
                    </div>
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      aria-label="Remover"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Quantidade */}
                    <div className="flex items-center gap-2 rounded-full border border-neutral-200 px-1">
                      <button
                        onClick={() => updateQty(item.product_id, item.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
                        disabled={item.quantity <= 1}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="min-w-[20px] text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.product_id, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>

                    <span className="font-bold text-primary-500">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resumo */}
          <div className="h-fit rounded-[24px] bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-neutral-900">Resumo do pedido</h2>

            <div className="mt-4 space-y-3 text-sm">
              {items.map((item) => (
                <div key={item.product_id} className="flex justify-between text-neutral-600">
                  <span className="truncate pr-2">{item.name} × {item.quantity}</span>
                  <span className="shrink-0 font-medium">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="my-4 border-t border-neutral-100" />

            <div className="flex justify-between text-base font-bold text-neutral-900">
              <span>Total</span>
              <span className="text-primary-500">{formatCurrency(total)}</span>
            </div>

            <p className="mt-1 text-xs text-neutral-400">Frete calculado no checkout</p>

            <Link
              href="/checkout"
              className="mt-6 flex w-full items-center justify-center rounded-2xl bg-primary-500 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
            >
              Finalizar compra
            </Link>

            <Link
              href="/products"
              className="mt-3 flex w-full items-center justify-center rounded-2xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              Continuar comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
