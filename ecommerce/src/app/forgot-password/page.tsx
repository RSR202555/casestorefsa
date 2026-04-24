'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch {
      setError('Erro ao enviar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-neutral-50 pb-20 pt-32 lg:pt-40">
      <div className="container-custom">
        <div className="mx-auto max-w-md rounded-[2rem] bg-white p-8 shadow-card">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-500">
            Recuperar senha
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-neutral-900">Esqueceu sua senha?</h1>
          <p className="mt-4 text-neutral-600">
            Digite seu e-mail e enviaremos um link para redefinir sua senha.
          </p>

          {sent ? (
            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-sm text-emerald-700">
              <p className="font-semibold">E-mail enviado!</p>
              <p className="mt-1">Verifique sua caixa de entrada e clique no link para redefinir sua senha.</p>
            </div>
          ) : (
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

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          )}

          <div className="mt-6">
            <Link href="/login" className="text-sm text-primary-500 hover:underline">
              ← Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
