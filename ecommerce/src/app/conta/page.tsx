'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

type ProfilePayload = {
  data: {
    id: string
    role: string
    full_name: string | null
    email: string
    phone: string | null
    cpf: string | null
    created_at: string
    updated_at: string
  } | null
  error: {
    code: string
    message: string
  } | null
}

type OrdersPayload = {
  data: {
    data: Array<{
      id: string
      order_number?: string
      status: string
      payment_status: string
      total?: number
      total_amount?: number
      created_at: string
      shipping_tracking_code?: string | null
      items?: Array<{ name?: string; quantity?: number }>
    }>
  } | null
  error: {
    code: string
    message: string
  } | null
}

type AddressesPayload = {
  data: Array<{
    id: string
    label: string | null
    street: string
    number: string
    complement: string | null
    neighborhood: string
    city: string
    state: string
    zip_code: string
    is_default: boolean
    created_at: string
  }> | null
  error: {
    code: string
    message: string
  } | null
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function normalizeStatus(status: string) {
  switch (status) {
    case 'entregue':
      return { label: 'Entregue', className: 'bg-emerald-100 text-emerald-700' }
    case 'enviado':
      return { label: 'Enviado', className: 'bg-sky-100 text-sky-700' }
    case 'pago':
      return { label: 'Pago', className: 'bg-violet-100 text-violet-700' }
    case 'aguardando_pagamento':
      return { label: 'Aguardando pagamento', className: 'bg-amber-100 text-amber-700' }
    case 'cancelado':
      return { label: 'Cancelado', className: 'bg-rose-100 text-rose-700' }
    default:
      return { label: status, className: 'bg-neutral-100 text-neutral-600' }
  }
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function formatZipCode(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export default function AccountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfilePayload['data']>(null)
  const [orders, setOrders] = useState<NonNullable<OrdersPayload['data']>['data']>([])
  const [addresses, setAddresses] = useState<NonNullable<AddressesPayload['data']>>([])
  const [profileSaving, setProfileSaving] = useState(false)
  const [addressSaving, setAddressSaving] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    cpf: '',
  })
  const [addressForm, setAddressForm] = useState({
    label: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
  })

  useEffect(() => {
    let active = true

    async function loadAccount() {
      try {
        const [profileResponse, ordersResponse, addressesResponse] = await Promise.all([
          fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/orders?limit=10', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/addresses', { credentials: 'include', cache: 'no-store' }),
        ])

        const [profilePayload, ordersPayload, addressesPayload] = (await Promise.all([
          profileResponse.json(),
          ordersResponse.json(),
          addressesResponse.json(),
        ])) as [ProfilePayload, OrdersPayload, AddressesPayload]

        if (!active) return

        if (!profileResponse.ok || profilePayload.error || !profilePayload.data) {
          if (profileResponse.status === 401) {
            router.replace('/login?redirect=/conta')
            return
          }
          setError(profilePayload.error?.message ?? 'Nao foi possivel carregar sua conta')
          return
        }

        setProfile(profilePayload.data)
        setProfileForm({
          full_name: profilePayload.data.full_name ?? '',
          phone: profilePayload.data.phone ?? '',
          cpf: profilePayload.data.cpf ?? '',
        })

        if (ordersResponse.ok && ordersPayload.data) {
          setOrders(ordersPayload.data.data)
        }

        if (addressesResponse.ok && addressesPayload.data) {
          setAddresses(addressesPayload.data)
        }
      } catch {
        if (active) setError('Nao foi possivel carregar sua conta')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadAccount()
    return () => {
      active = false
    }
  }, [router])

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileSaving(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm),
      })

      const payload = (await response.json()) as ProfilePayload
      if (!response.ok || payload.error || !payload.data) {
        setFeedback({
          type: 'error',
          message: payload.error?.message ?? 'Nao foi possivel atualizar seu perfil',
        })
        return
      }

      setProfile(payload.data)
      setFeedback({
        type: 'success',
        message: 'Perfil atualizado com sucesso.',
      })
    } catch {
      setFeedback({
        type: 'error',
        message: 'Nao foi possivel salvar o perfil.',
      })
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleAddressSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAddressSaving(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/addresses', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addressForm),
      })

      const payload = (await response.json()) as {
        data: AddressesPayload['data'] extends Array<infer T> ? T : never
        error: { code: string; message: string } | null
      }

      if (!response.ok || payload.error) {
        setFeedback({
          type: 'error',
          message: payload.error?.message ?? 'Nao foi possivel salvar o endereco',
        })
        return
      }

      setAddresses((prev) => [payload.data, ...prev])
      setAddressForm({
        label: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zip_code: '',
      })
      setFeedback({
        type: 'success',
        message: 'Endereco salvo com sucesso.',
      })
    } catch {
      setFeedback({
        type: 'error',
        message: 'Nao foi possivel salvar o endereco.',
      })
    } finally {
      setAddressSaving(false)
    }
  }

  async function handleLogout() {
    setLogoutLoading(true)

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      router.push('/login')
      router.refresh()
      setLogoutLoading(false)
    }
  }

  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total ?? order.total_amount ?? 0), 0)

  return (
    <div className="bg-neutral-50 pb-20 pt-32 lg:pt-40">
      <div className="container-custom">
        {loading ? (
          <div className="rounded-[2rem] bg-white p-8 shadow-soft">Carregando sua area...</div>
        ) : error ? (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-soft">
            <h1 className="text-2xl font-semibold">Nao foi possivel abrir sua conta</h1>
            <p className="mt-3">{error}</p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link href="/login" className="btn-primary">
                Voltar ao login
              </Link>
              <Link href="/products" className="btn-secondary">
                Ver produtos
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
              <article className="rounded-[2rem] bg-neutral-900 p-8 text-white shadow-premium">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-300">
                  Minha conta
                </span>
                <h1 className="mt-4 font-display text-4xl font-semibold">
                  Olá, {profile?.full_name || 'cliente'}
                </h1>
                <p className="mt-4 text-neutral-300">
                  Aqui voce acompanha seus pedidos, salva enderecos e mantem seus dados atualizados.
                </p>

                <div className="mt-8 grid gap-3">
                  {[
                    `${orders.length} pedido${orders.length !== 1 ? 's' : ''} recente${orders.length !== 1 ? 's' : ''}`,
                    `${addresses.length} endereco${addresses.length !== 1 ? 's' : ''} salvo${addresses.length !== 1 ? 's' : ''}`,
                    `Total em compras: ${formatCurrency(totalSpent)}`,
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link href="/products" className="btn-primary">
                    Continuar comprando
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn-ghost text-white hover:bg-white/10 hover:text-white"
                    disabled={logoutLoading}
                  >
                    {logoutLoading ? 'Saindo...' : 'Sair'}
                  </button>
                </div>
              </article>

              <section className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-[2rem] bg-white p-6 shadow-soft">
                  <p className="text-sm uppercase tracking-[0.18em] text-neutral-400">Perfil</p>
                  <p className="mt-4 text-3xl font-semibold text-neutral-900">{profile?.full_name || 'Cliente'}</p>
                  <p className="mt-2 text-sm text-neutral-500">{profile?.email}</p>
                </article>
                <article className="rounded-[2rem] bg-white p-6 shadow-soft">
                  <p className="text-sm uppercase tracking-[0.18em] text-neutral-400">Pedidos</p>
                  <p className="mt-4 text-3xl font-semibold text-neutral-900">{orders.length}</p>
                  <p className="mt-2 text-sm text-neutral-500">Ultimos pedidos da sua conta</p>
                </article>
                <article className="rounded-[2rem] bg-white p-6 shadow-soft">
                  <p className="text-sm uppercase tracking-[0.18em] text-neutral-400">Enderecos</p>
                  <p className="mt-4 text-3xl font-semibold text-neutral-900">{addresses.length}</p>
                  <p className="mt-2 text-sm text-neutral-500">Locais salvos para checkout</p>
                </article>
              </section>
            </section>

            {feedback ? (
              <div
                className={`rounded-[1.5rem] px-5 py-4 text-sm shadow-soft ${
                  feedback.type === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {feedback.message}
              </div>
            ) : null}

            <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <article className="rounded-[2rem] bg-white p-8 shadow-soft">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-neutral-900">Seus dados</h2>
                    <p className="mt-2 text-neutral-500">
                      Atualize nome, telefone e CPF usados na sua conta.
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Cliente
                  </span>
                </div>

                <form className="mt-8 space-y-4" onSubmit={handleProfileSubmit}>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-neutral-700">Nome completo</span>
                    <input
                      value={profileForm.full_name}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, full_name: event.target.value }))}
                      className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-neutral-700">E-mail</span>
                    <input
                      value={profile?.email ?? ''}
                      readOnly
                      className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-400 outline-none"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-neutral-700">Telefone</span>
                      <input
                        value={profileForm.phone}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, phone: formatPhone(event.target.value) }))
                        }
                        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                        placeholder="(11) 99999-9999"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-neutral-700">CPF</span>
                      <input
                        value={profileForm.cpf}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, cpf: formatCpf(event.target.value) }))
                        }
                        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                        placeholder="000.000.000-00"
                      />
                    </label>
                  </div>

                  <button type="submit" className="btn-primary" disabled={profileSaving}>
                    {profileSaving ? 'Salvando...' : 'Salvar dados'}
                  </button>
                </form>
              </article>

              <article className="rounded-[2rem] bg-white p-8 shadow-soft">
                <h2 className="text-2xl font-semibold text-neutral-900">Adicionar endereco</h2>
                <p className="mt-2 text-neutral-500">
                  Salve seus dados de entrega para agilizar o checkout.
                </p>

                <form className="mt-8 space-y-4" onSubmit={handleAddressSubmit}>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-neutral-700">Apelido do endereco</span>
                    <input
                      value={addressForm.label}
                      onChange={(event) => setAddressForm((prev) => ({ ...prev, label: event.target.value }))}
                      className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                      placeholder="Casa, Trabalho, Presente..."
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-neutral-700">Rua</span>
                      <input
                        value={addressForm.street}
                        onChange={(event) => setAddressForm((prev) => ({ ...prev, street: event.target.value }))}
                        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-neutral-700">Numero</span>
                      <input
                        value={addressForm.number}
                        onChange={(event) => setAddressForm((prev) => ({ ...prev, number: event.target.value }))}
                        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                        required
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-neutral-700">Complemento</span>
                    <input
                      value={addressForm.complement}
                      onChange={(event) => setAddressForm((prev) => ({ ...prev, complement: event.target.value }))}
                      className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                      placeholder="Apto, bloco, referencia..."
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-neutral-700">Bairro</span>
                      <input
                        value={addressForm.neighborhood}
                        onChange={(event) => setAddressForm((prev) => ({ ...prev, neighborhood: event.target.value }))}
                        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-neutral-700">Cidade</span>
                      <input
                        value={addressForm.city}
                        onChange={(event) => setAddressForm((prev) => ({ ...prev, city: event.target.value }))}
                        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                        required
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-neutral-700">UF</span>
                      <input
                        value={addressForm.state}
                        onChange={(event) =>
                          setAddressForm((prev) => ({ ...prev, state: event.target.value.toUpperCase().slice(0, 2) }))
                        }
                        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 uppercase outline-none transition focus:border-primary-500"
                        placeholder="SP"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-neutral-700">CEP</span>
                      <input
                        value={addressForm.zip_code}
                        onChange={(event) =>
                          setAddressForm((prev) => ({ ...prev, zip_code: formatZipCode(event.target.value) }))
                        }
                        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                        placeholder="00000-000"
                        required
                      />
                    </label>
                  </div>

                  <button type="submit" className="btn-primary" disabled={addressSaving}>
                    {addressSaving ? 'Salvando endereco...' : 'Salvar endereco'}
                  </button>
                </form>
              </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-[2rem] bg-white p-8 shadow-soft">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-neutral-900">Historico de pedidos</h2>
                    <p className="mt-2 text-neutral-500">
                      Seus pedidos mais recentes ficam centralizados aqui.
                    </p>
                  </div>
                  <Link href="/products" className="btn-ghost">
                    Comprar mais
                  </Link>
                </div>

                <div className="mt-8 space-y-4">
                  {orders.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-neutral-200 px-6 py-10 text-center text-neutral-500">
                      Voce ainda nao tem pedidos. Assim que uma compra for feita, ela aparece aqui.
                    </div>
                  ) : (
                    orders.map((order) => {
                      const status = normalizeStatus(order.status)
                      return (
                        <div key={order.id} className="rounded-[1.5rem] border border-neutral-100 p-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-neutral-900">
                                Pedido {order.order_number ?? order.id.slice(0, 8)}
                              </p>
                              <p className="mt-1 text-sm text-neutral-500">
                                {formatDateTime(order.created_at)}
                              </p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                              {status.label}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 text-sm text-neutral-600 sm:grid-cols-3">
                            <div>
                              <p className="font-medium text-neutral-900">Pagamento</p>
                              <p>{order.payment_status}</p>
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900">Total</p>
                              <p>{formatCurrency(Number(order.total ?? order.total_amount ?? 0))}</p>
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900">Rastreio</p>
                              <p>{order.shipping_tracking_code || 'Aguardando envio'}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </article>

              <article className="rounded-[2rem] bg-white p-8 shadow-soft">
                <h2 className="text-2xl font-semibold text-neutral-900">Enderecos salvos</h2>
                <p className="mt-2 text-neutral-500">
                  Seus enderecos cadastrados para usar nos proximos pedidos.
                </p>

                <div className="mt-8 space-y-4">
                  {addresses.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-neutral-200 px-6 py-10 text-center text-neutral-500">
                      Nenhum endereco salvo ainda.
                    </div>
                  ) : (
                    addresses.map((address) => (
                      <div key={address.id} className="rounded-[1.5rem] border border-neutral-100 p-5">
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-semibold text-neutral-900">{address.label || 'Endereco cadastrado'}</p>
                          {address.is_default ? (
                            <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-600">
                              Padrao
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-neutral-600">
                          <p>
                            {address.street}, {address.number}
                          </p>
                          {address.complement ? <p>{address.complement}</p> : null}
                          <p>
                            {address.neighborhood} - {address.city}/{address.state}
                          </p>
                          <p>CEP {address.zip_code}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
