'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCart } from '@/hooks/useCart'

// Dimensões padrão de um perfume embalado (em cm) e peso estimado por item
const PKG = { weight_grams: 400, length_cm: 20, height_cm: 15, width_cm: 12 }

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function maskZip(value: string) {
  return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9)
}

type ShippingOption = {
  service_code: string
  service_name: string
  price: number
  delivery_days: number
  error: boolean
}

type PaymentMethod = 'pix' | 'credit_card'

function maskPhone(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function maskCpf(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total, clearCart } = useCart()

  const [customer, setCustomer] = useState({
    full_name: '', email: '', phone: '', cpf: '',
  })
  const [address, setAddress] = useState({
    street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '', zip_code: '',
  })
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')

  // Frete
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchingZip, setFetchingZip] = useState(false)

  const grandTotal = total + (selectedShipping?.price ?? 0)

  // Pré-preenche dados do cliente com o perfil autenticado
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((payload) => {
        const u = payload?.data
        if (!u) return
        setCustomer({
          full_name: u.full_name ?? '',
          email: u.email ?? '',
          phone: u.phone ?? '',
          cpf: u.cpf ?? '',
        })
      })
      .catch(() => null)
  }, [])

  // Recalcula frete sempre que o CEP tiver 8 dígitos
  useEffect(() => {
    const digits = address.zip_code.replace(/\D/g, '')
    if (digits.length === 8) {
      calculateShipping(digits)
    } else {
      setShippingOptions([])
      setSelectedShipping(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address.zip_code])

  if (items.length === 0) {
    return (
      <div className="bg-neutral-50 pb-20 pt-32 lg:pt-40">
        <div className="container-custom">
          <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-10 text-center shadow-card">
            <h1 className="text-2xl font-semibold text-neutral-900">Carrinho vazio</h1>
            <p className="mt-2 text-neutral-500">Adicione produtos antes de finalizar.</p>
            <Link href="/products" className="btn-primary mt-8 inline-flex">Ver produtos</Link>
          </div>
        </div>
      </div>
    )
  }

  async function fetchAddressByZip(zip: string) {
    const digits = zip.replace(/\D/g, '')
    if (digits.length !== 8) return
    setFetchingZip(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json() as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string }
      if (data.erro) return
      setAddress((p) => ({
        ...p,
        street: data.logradouro ?? p.street,
        neighborhood: data.bairro ?? p.neighborhood,
        city: data.localidade ?? p.city,
        state: data.uf ?? p.state,
      }))
    } catch {
      // ignora erro de CEP
    } finally {
      setFetchingZip(false)
    }
  }

  async function calculateShipping(zip: string) {
    const digits = zip.replace(/\D/g, '')
    if (digits.length !== 8) return
    setShippingLoading(true)
    setShippingError(null)
    setShippingOptions([])
    setSelectedShipping(null)
    try {
      const totalWeight = PKG.weight_grams * items.reduce((s, i) => s + i.quantity, 0)
      const res = await fetch('/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination_zip: digits,
          weight_grams: totalWeight,
          length_cm: PKG.length_cm,
          height_cm: PKG.height_cm,
          width_cm: PKG.width_cm,
          declared_value: total,
        }),
      })
      const result = await res.json() as { data?: { options: ShippingOption[] }; error?: { message: string } }
      if (!res.ok || !result.data) {
        setShippingError(result.error?.message ?? 'Erro ao calcular frete')
        return
      }
      const valid = result.data.options.filter((o) => !o.error && o.price > 0)
      if (valid.length === 0) {
        setShippingError('Nenhuma opção de frete disponível para este CEP')
        return
      }
      setShippingOptions(valid)
      setSelectedShipping(valid[0]) // pré-seleciona a mais barata
    } catch {
      setShippingError('Falha ao consultar o frete')
    } finally {
      setShippingLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedShipping) {
      setError('Selecione uma opção de frete antes de continuar')
      return
    }
    setError(null)
    setLoading(true)

    try {
      // 1. Cria pedido com endereço embutido
      const orderRes = await fetch('/api/cart/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
          address,
          shipping_method: selectedShipping.service_name,
          shipping_cost: selectedShipping.price,
          payment_method: paymentMethod,
        }),
      })
      const orderData = await orderRes.json() as { data?: { id: string }; error?: { message: string } }
      if (!orderRes.ok || !orderData.data?.id) {
        if (orderRes.status === 401) { router.push('/login?redirect=/checkout'); return }
        throw new Error(orderData.error?.message ?? 'Erro ao criar pedido')
      }

      const orderId = orderData.data.id

      // 3. PIX: gera cobrança e redireciona
      if (paymentMethod === 'pix') {
        const pixRes = await fetch('/api/payments/pix', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId }),
        })
        const pixData = await pixRes.json() as {
          data?: { payment_id: string; pix_code: string; qr_code_url: string; expires_at: string }
          error?: { message: string }
        }
        if (!pixRes.ok || !pixData.data) throw new Error(pixData.error?.message ?? 'Erro ao gerar PIX')
        clearCart()
        router.push(
          `/checkout/pagamento/${orderId}?pix_code=${encodeURIComponent(pixData.data.pix_code)}&expires_at=${encodeURIComponent(pixData.data.expires_at)}&qr=${encodeURIComponent(pixData.data.qr_code_url)}`
        )
        return
      }

      // 4. Cartão: cria preferência MP e redireciona para o checkout do Mercado Pago
      const prefRes = await fetch('/api/payments/preference', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      })
      const prefData = await prefRes.json() as {
        data?: { preference_id: string; init_point: string }
        error?: { message: string }
      }
      if (!prefRes.ok || !prefData.data?.init_point) {
        throw new Error(prefData.error?.message ?? 'Erro ao iniciar pagamento com cartão')
      }
      clearCart()
      // Redireciona para a página do Mercado Pago
      window.location.href = prefData.data.init_point
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-neutral-50 pb-20 pt-32 lg:pt-40">
      <div className="container-custom">
        <nav className="mb-8 flex items-center gap-2 text-sm text-neutral-400">
          <Link href="/carrinho" className="hover:text-neutral-700">Carrinho</Link>
          <span>›</span>
          <span className="font-semibold text-neutral-700">Checkout</span>
        </nav>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Formulário esquerdo */}
            <div className="space-y-6">

              {/* Dados do destinatário */}
              <div className="rounded-[28px] bg-white p-6 shadow-soft">
                <h2 className="text-lg font-semibold text-neutral-900">Dados do destinatário</h2>
                <div className="mt-5 grid gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Nome completo</label>
                    <input
                      type="text"
                      value={customer.full_name}
                      onChange={(e) => setCustomer((p) => ({ ...p, full_name: e.target.value }))}
                      className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none"
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">E-mail</label>
                      <input
                        type="email"
                        value={customer.email}
                        onChange={(e) => setCustomer((p) => ({ ...p, email: e.target.value }))}
                        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none"
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Telefone / WhatsApp</label>
                      <input
                        type="tel"
                        value={customer.phone}
                        onChange={(e) => setCustomer((p) => ({ ...p, phone: maskPhone(e.target.value) }))}
                        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">CPF</label>
                    <input
                      type="text"
                      value={customer.cpf}
                      onChange={(e) => setCustomer((p) => ({ ...p, cpf: maskCpf(e.target.value) }))}
                      className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none"
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="rounded-[28px] bg-white p-6 shadow-soft">
                <h2 className="text-lg font-semibold text-neutral-900">Endereço de entrega</h2>
                <div className="mt-5 grid gap-4">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">CEP</label>
                      <input
                        type="text"
                        value={address.zip_code}
                        onChange={(e) => setAddress((p) => ({ ...p, zip_code: maskZip(e.target.value) }))}
                        onBlur={(e) => fetchAddressByZip(e.target.value)}
                        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none"
                        placeholder="00000-000"
                        required
                      />
                    </div>
                    {(fetchingZip || shippingLoading) && (
                      <div className="pb-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-[1fr_120px] gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Rua</label>
                      <input type="text" value={address.street} onChange={(e) => setAddress((p) => ({ ...p, street: e.target.value }))} className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none" placeholder="Nome da rua" required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Número</label>
                      <input type="text" value={address.number} onChange={(e) => setAddress((p) => ({ ...p, number: e.target.value }))} className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none" placeholder="123" required />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Complemento</label>
                    <input type="text" value={address.complement} onChange={(e) => setAddress((p) => ({ ...p, complement: e.target.value }))} className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none" placeholder="Apto, bloco... (opcional)" />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Bairro</label>
                      <input type="text" value={address.neighborhood} onChange={(e) => setAddress((p) => ({ ...p, neighborhood: e.target.value }))} className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none" placeholder="Bairro" required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Cidade</label>
                      <input type="text" value={address.city} onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))} className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none" placeholder="Cidade" required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Estado</label>
                      <input type="text" value={address.state} onChange={(e) => setAddress((p) => ({ ...p, state: e.target.value.toUpperCase().slice(0, 2) }))} className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none" placeholder="SP" maxLength={2} required />
                    </div>
                  </div>
                </div>
              </div>

              {/* Frete */}
              <div className="rounded-[28px] bg-white p-6 shadow-soft">
                <h2 className="text-lg font-semibold text-neutral-900">Frete</h2>

                {!address.zip_code || address.zip_code.replace(/\D/g, '').length < 8 ? (
                  <p className="mt-4 text-sm text-neutral-400">Preencha o CEP para ver as opções de frete.</p>
                ) : shippingLoading ? (
                  <div className="mt-4 flex items-center gap-3 text-sm text-neutral-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                    Calculando frete...
                  </div>
                ) : shippingError ? (
                  <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{shippingError}</p>
                ) : shippingOptions.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {shippingOptions.map((option) => (
                      <button
                        key={option.service_code}
                        type="button"
                        onClick={() => setSelectedShipping(option)}
                        className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                          selectedShipping?.service_code === option.service_code
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${selectedShipping?.service_code === option.service_code ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                            {option.service_name === 'SEDEX' ? '⚡' : '📦'}
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-900">
                              {option.service_name === 'SEDEX' ? 'SEDEX' : 'PAC'}
                            </p>
                            <p className="text-xs text-neutral-500">
                              Entrega em até {option.delivery_days} dias úteis
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-neutral-900">{formatCurrency(option.price)}</span>
                          {selectedShipping?.service_code === option.service_code && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Pagamento */}
              <div className="rounded-[28px] bg-white p-6 shadow-soft">
                <h2 className="text-lg font-semibold text-neutral-900">Forma de pagamento</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {(['pix', 'credit_card'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${paymentMethod === method ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${paymentMethod === method ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                        {method === 'pix' ? (
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.354 2.646a.9.9 0 011.292 0l2.354 2.354 2.354-2.354a.9.9 0 011.292 0l2.708 2.708a.9.9 0 010 1.292l-2.354 2.354 2.354 2.354a.9.9 0 010 1.292l-2.708 2.708a.9.9 0 01-1.292 0L15 13.001l-2.354 2.353a.9.9 0 01-1.292 0l-2.708-2.707a.9.9 0 010-1.292L11 9l-2.354-2.354a.9.9 0 010-1.292l2.708-2.708z" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900">{method === 'pix' ? 'PIX' : 'Cartão de crédito'}</p>
                        <p className="text-xs text-neutral-500">{method === 'pix' ? 'Aprovação imediata' : 'Até 12x'}</p>
                      </div>
                      {paymentMethod === method && (
                        <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {paymentMethod === 'pix' && (
                  <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Após confirmar, você receberá o QR Code PIX. Validade: 30 minutos.
                  </p>
                )}
                {paymentMethod === 'credit_card' && (
                  <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-700">
                    Dados do cartão coletados com segurança pelo Mercado Pago.
                  </p>
                )}
              </div>
            </div>

            {/* Resumo */}
            <div className="h-fit space-y-4">
              <div className="rounded-[24px] bg-white p-6 shadow-soft">
                <h2 className="text-lg font-semibold text-neutral-900">Resumo</h2>

                <div className="mt-4 space-y-2.5 text-sm">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex justify-between text-neutral-600">
                      <span className="truncate pr-2">{item.name} × {item.quantity}</span>
                      <span className="shrink-0 font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="my-4 border-t border-neutral-100" />

                {/* Subtotal */}
                <div className="flex justify-between text-sm text-neutral-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(total)}</span>
                </div>

                {/* Frete */}
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-neutral-600">Frete</span>
                  {selectedShipping ? (
                    <span className="font-semibold text-neutral-900">
                      {formatCurrency(selectedShipping.price)}{' '}
                      <span className="text-xs font-normal text-neutral-400">({selectedShipping.service_name})</span>
                    </span>
                  ) : (
                    <span className="text-neutral-400">
                      {address.zip_code.replace(/\D/g, '').length === 8 && shippingLoading ? 'Calculando...' : 'Informe o CEP'}
                    </span>
                  )}
                </div>

                <div className="my-4 border-t border-neutral-100" />

                {/* Total */}
                <div className="flex justify-between text-base font-bold text-neutral-900">
                  <span>Total</span>
                  <span className="text-primary-500">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !selectedShipping}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 py-4 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processando...
                  </>
                ) : !selectedShipping ? (
                  'Selecione o frete para continuar'
                ) : (
                  `Confirmar pedido · ${formatCurrency(grandTotal)}`
                )}
              </button>

              <p className="text-center text-xs text-neutral-400">
                Pagamento processado com segurança pelo <span className="font-semibold">Mercado Pago</span>.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
