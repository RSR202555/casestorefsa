'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Detecta se há uma sessão de recovery ativa (vinda do link do e-mail)
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
      }
    })

    // Checa sessão já existente
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true)
    })
  }, [supabase])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      setError('Erro ao redefinir senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-neutral-50 pb-20 pt-32 lg:pt-40">
        <div className="container-custom">
          <div className="mx-auto max-w-md rounded-[2rem] bg-white p-10 text-center shadow-card">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-7 w-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-neutral-900">Senha redefinida!</h1>
            <p className="mt-2 text-neutral-500">Redirecionando para o login...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <div className="bg-neutral-50 pb-20 pt-32 lg:pt-40">
        <div className="container-custom">
          <div className="mx-auto max-w-md rounded-[2rem] bg-white p-10 text-center shadow-card">
            <p className="text-neutral-500">Verificando link de recuperação...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-neutral-50 pb-20 pt-32 lg:pt-40">
      <div className="container-custom">
        <div className="mx-auto max-w-md rounded-[2rem] bg-white p-8 shadow-card">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-500">
            Nova senha
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-neutral-900">Redefina sua senha</h1>
          <p className="mt-4 text-neutral-600">Escolha uma nova senha para sua conta.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-neutral-700">Nova senha</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                placeholder="Mínimo 8 caracteres"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-neutral-700">Confirmar senha</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                placeholder="Repita a nova senha"
                required
              />
            </label>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
