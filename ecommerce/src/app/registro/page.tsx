'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

type RegisterResponse = {
  data: {
    user_id?: string
    message: string
  } | null
  error: {
    code: string
    message: string
  } | null
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

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    if (form.password !== form.confirmPassword) {
      setLoading(false)
      setError('A confirmacao da senha nao confere.')
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || undefined,
          cpf: form.cpf || undefined,
          password: form.password,
        }),
      })

      const payload = (await response.json()) as RegisterResponse
      if (!response.ok || payload.error) {
        setError(payload.error?.message ?? 'Nao foi possivel criar a conta')
        return
      }

      setSuccessMessage(payload.data?.message ?? 'Conta criada com sucesso')
      setForm({
        full_name: '',
        email: '',
        phone: '',
        cpf: '',
        password: '',
        confirmPassword: '',
      })

      window.setTimeout(() => {
        router.push('/login')
      }, 1200)
    } catch {
      setError('Nao foi possivel conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-neutral-50 pb-20 pt-32 lg:pt-40">
      <div className="container-custom">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] bg-neutral-900 p-8 text-white shadow-premium">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-300">
              Area do cliente
            </span>
            <h1 className="mt-4 font-display text-4xl font-semibold">
              Crie sua conta para acompanhar pedidos e salvar seus enderecos
            </h1>
            <p className="mt-4 text-neutral-300">
              Depois do cadastro, o cliente passa a ter uma area propria com perfil,
              historico de compras e dados de entrega.
            </p>

            <div className="mt-8 grid gap-3">
              {[
                'Historico de pedidos dentro da conta',
                'Enderecos salvos para checkout mais rapido',
                'Atualizacao de nome, telefone e CPF',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/login" className="btn-primary">
                Ja tenho conta
              </Link>
              <Link href="/products" className="btn-ghost text-white hover:bg-white/10 hover:text-white">
                Ver produtos
              </Link>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-8 shadow-soft">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-500">
              Cadastro
            </span>
            <h2 className="mt-4 text-3xl font-semibold text-neutral-900">
              Abrir conta
            </h2>
            <p className="mt-3 text-neutral-600">
              Use seus dados reais para facilitar checkout, suporte e comunicacao de pedidos.
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-neutral-700">Nome completo</span>
                <input
                  value={form.full_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
                  className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                  placeholder="Seu nome"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-neutral-700">E-mail</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                  placeholder="voce@exemplo.com"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-700">Telefone</span>
                  <input
                    value={form.phone}
                    onChange={(event) => setForm((prev) => ({ ...prev, phone: formatPhone(event.target.value) }))}
                    className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                    placeholder="(11) 99999-9999"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-700">CPF</span>
                  <input
                    value={form.cpf}
                    onChange={(event) => setForm((prev) => ({ ...prev, cpf: formatCpf(event.target.value) }))}
                    className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                    placeholder="000.000.000-00"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-700">Senha</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                    placeholder="Minimo 8 caracteres"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-700">Confirmar senha</span>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                    className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                    placeholder="Repita a senha"
                    required
                  />
                </label>
              </div>

              <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
                A senha precisa ter pelo menos 8 caracteres, 1 letra maiuscula e 1 numero.
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              ) : null}

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
