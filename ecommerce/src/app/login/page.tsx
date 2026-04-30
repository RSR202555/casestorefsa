'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

type LoginResponse = {
  data: {
    user: { id: string; email: string }
    message: string
  } | null
  error: { code: string; message: string } | null
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [redirect, setRedirect] = useState('/conta')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const redirectParam = params.get('redirect')
    if (redirectParam) setRedirect(redirectParam)

    // Mostra mensagem se veio da página de confirmação com erro
    if (params.get('error') === 'confirmation_failed') {
      setError('O link de confirmação expirou ou é inválido. Solicite um novo abaixo.')
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setEmailNotConfirmed(false)
    setResendMessage(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const payload = (await response.json()) as LoginResponse

      if (!response.ok || payload.error) {
        const msg = payload.error?.message ?? 'Não foi possível entrar'
        setError(msg)
        // Detecta erro de e-mail não confirmado
        if (msg.toLowerCase().includes('não confirmado') || msg.toLowerCase().includes('confirmado')) {
          setEmailNotConfirmed(true)
        }
        return
      }

      router.push(redirect)
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendConfirmation() {
    if (!email) {
      setError('Preencha o e-mail acima para reenviar a confirmação')
      return
    }
    setResendLoading(true)
    setResendMessage(null)
    try {
      await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setResendMessage('Novo link enviado! Verifique sua caixa de entrada.')
      setEmailNotConfirmed(false)
      setError(null)
    } catch {
      setResendMessage('Erro ao reenviar. Tente novamente.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="bg-neutral-50 pb-20 pt-32 lg:pt-40">
      <div className="container-custom">
        <div className="mx-auto max-w-md rounded-[2rem] bg-white p-8 shadow-card">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-500">
            Login
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-neutral-900">
            Entre para acessar sua conta ou o painel admin
          </h1>
          <p className="mt-4 text-neutral-600">
            Use o e-mail e a senha cadastrados no Supabase. O admin criado agora
            tambem entra por aqui.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-neutral-700">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                placeholder="voce@exemplo.com"
                required
              />
            </label>

            <label className="block">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700">Senha</span>
                <a href="/forgot-password" className="text-xs text-primary-500 hover:underline">
                  Esqueceu a senha?
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                placeholder="Sua senha"
                required
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            {resendMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {resendMessage}
              </div>
            ) : null}

            {emailNotConfirmed ? (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                className="w-full rounded-2xl border border-primary-300 bg-primary-50 py-3 text-sm font-semibold text-primary-600 hover:bg-primary-100 disabled:opacity-50"
              >
                {resendLoading ? 'Enviando...' : 'Reenviar e-mail de confirmação'}
              </button>
            ) : null}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/registro" className="btn-secondary">
              Criar conta
            </Link>
            <Link href="/admin" className="btn-ghost">
              Ir para admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
