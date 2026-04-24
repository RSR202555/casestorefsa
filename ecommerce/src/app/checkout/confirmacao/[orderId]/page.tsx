'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type Order = {
  id: string
  total: number
  payment_method: string
  items: Array<{ name: string; quantity: number; effective_price: number }>
  shipping_address: {
    street: string
    number: string
    city: string
    state: string
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default function ConfirmacaoPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    fetch(`/api/orders/${orderId}`, { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((result: { data?: Order }) => {
        if (result.data) setOrder(result.data)
      })
      .catch(() => {})
  }, [orderId])

  return (
    <div className="bg-neutral-50 pb-20 pt-32 lg:pt-40">
      <div className="container-custom">
        <div className="mx-auto max-w-lg">
          <div className="rounded-[2rem] bg-white p-8 shadow-card">
            {/* Ícone de sucesso */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-9 w-9 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="mt-5 text-2xl font-semibold text-neutral-900">Pedido confirmado!</h1>
              <p className="mt-2 text-neutral-500">
                Obrigada pela sua compra. Você receberá atualizações por e-mail.
              </p>

              <div className="mt-4 rounded-2xl bg-neutral-100 px-5 py-2.5 font-mono text-sm font-semibold text-neutral-700">
                #{orderId.slice(0, 8).toUpperCase()}
              </div>
            </div>

            {/* Detalhes do pedido */}
            {order && (
              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-neutral-100 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Itens
                  </p>
                  <div className="space-y-2">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-neutral-600">{item.name} × {item.quantity}</span>
                        <span className="font-semibold text-neutral-900">
                          {formatCurrency(item.effective_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-neutral-100 pt-3 flex justify-between text-sm font-bold">
                    <span>Total</span>
                    <span className="text-primary-500">{formatCurrency(order.total)}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-100 p-4 text-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Entrega
                  </p>
                  <p className="text-neutral-700">
                    {order.shipping_address.street}, {order.shipping_address.number} — {order.shipping_address.city}/{order.shipping_address.state}
                  </p>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href="/conta"
                className="flex items-center justify-center rounded-2xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Meus pedidos
              </Link>
              <Link
                href="/products"
                className="flex items-center justify-center rounded-2xl bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600"
              >
                Continuar comprando
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
