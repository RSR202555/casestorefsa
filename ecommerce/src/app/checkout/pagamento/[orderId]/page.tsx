'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

const POLL_INTERVAL_MS = 4000
const PIX_TOTAL_SECONDS = 30 * 60 // 30 minutos

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired'

export default function PaymentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const orderId = params.orderId as string
  const method = searchParams.get('method')
  const pixCode = searchParams.get('pix_code')
  const qrUrl = searchParams.get('qr')
  const expiresAt = searchParams.get('expires_at')

  const isPix = method !== 'card' && Boolean(pixCode)

  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<PaymentStatus>('pending')
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!expiresAt) return PIX_TOTAL_SECONDS
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
    return Math.max(0, diff)
  })

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkPaymentStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, { credentials: 'include', cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json() as { data?: { payment_status: string; status: string } }
      const ps = data.data?.payment_status

      if (ps === 'paid') {
        setStatus('paid')
        if (pollRef.current) clearInterval(pollRef.current)
        setTimeout(() => router.push(`/checkout/confirmacao/${orderId}`), 2000)
      } else if (ps === 'failed') {
        setStatus('failed')
        if (pollRef.current) clearInterval(pollRef.current)
      } else if (ps === 'expired') {
        setStatus('expired')
        if (pollRef.current) clearInterval(pollRef.current)
      }
    } catch {
      // ignora erros temporários de rede
    }
  }, [orderId, router])

  // Polling de status
  useEffect(() => {
    if (!isPix) return
    checkPaymentStatus()
    pollRef.current = setInterval(checkPaymentStatus, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [isPix, checkPaymentStatus])

  // Countdown
  useEffect(() => {
    if (!isPix || status !== 'pending') return
    if (timeLeft <= 0) {
      setStatus('expired')
      return
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setStatus('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isPix, status, timeLeft])

  function copyPixCode() {
    if (!pixCode) return
    navigator.clipboard.writeText(decodeURIComponent(pixCode))
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  // ── Pago ──────────────────────────────────────────────────────────────────
  if (status === 'paid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-10 text-center shadow-card">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-9 w-9 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">Pagamento confirmado!</h1>
          <p className="mt-2 text-neutral-500">Redirecionando para a confirmação...</p>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full animate-pulse rounded-full bg-emerald-500" />
          </div>
        </div>
      </div>
    )
  }

  // ── Falhou / Expirou ──────────────────────────────────────────────────────
  if (status === 'failed' || status === 'expired') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-10 text-center shadow-card">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-100">
            <svg className="h-9 w-9 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {status === 'expired' ? 'PIX expirado' : 'Pagamento recusado'}
          </h1>
          <p className="mt-2 text-neutral-500">
            {status === 'expired'
              ? 'O tempo para pagamento expirou. Crie um novo pedido.'
              : 'Ocorreu um problema ao processar o pagamento.'}
          </p>
          <Link href="/carrinho" className="btn-primary mt-8 inline-flex">
            Voltar ao carrinho
          </Link>
        </div>
      </div>
    )
  }

  // ── PIX pendente ──────────────────────────────────────────────────────────
  if (isPix) {
    const decodedPixCode = pixCode ? decodeURIComponent(pixCode) : ''
    const decodedQrUrl = qrUrl ? decodeURIComponent(qrUrl) : ''

    return (
      <div className="bg-neutral-50 pb-20 pt-32 lg:pt-40">
        <div className="container-custom">
          <div className="mx-auto max-w-lg">
            <div className="rounded-[2rem] bg-white p-8 shadow-card">
              <div className="text-center">
                <span className="inline-block rounded-full bg-primary-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-600">
                  Aguardando pagamento
                </span>
                <h1 className="mt-4 text-2xl font-semibold text-neutral-900">
                  Pague com PIX
                </h1>
                <p className="mt-2 text-sm text-neutral-500">
                  Escaneie o QR Code ou copie o código abaixo
                </p>
              </div>

              {/* Countdown */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <div className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold ${timeLeft < 300 ? 'bg-rose-50 text-rose-600' : 'bg-neutral-100 text-neutral-700'}`}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                  </svg>
                  Expira em {formatTime(timeLeft)}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-primary-500" />
                  Verificando pagamento...
                </div>
              </div>

              {/* QR Code */}
              {decodedQrUrl && (
                <div className="mt-6 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={decodedQrUrl}
                    alt="QR Code PIX"
                    className="h-48 w-48 rounded-2xl border border-neutral-100"
                  />
                </div>
              )}

              {/* Código copia-e-cola */}
              {decodedPixCode && (
                <div className="mt-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Código PIX Copia e Cola
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                      <p className="truncate text-xs font-mono text-neutral-600">
                        {decodedPixCode.slice(0, 50)}...
                      </p>
                    </div>
                    <button
                      onClick={copyPixCode}
                      className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${copied ? 'bg-emerald-500 text-white' : 'bg-primary-500 text-white hover:bg-primary-600'}`}
                    >
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Instruções */}
              <div className="mt-6 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
                <ol className="space-y-1.5 list-decimal list-inside">
                  <li>Abra o app do seu banco</li>
                  <li>Acesse a área PIX e escolha <strong>Pagar com QR Code</strong></li>
                  <li>Escaneie o código ou cole o código copia e cola</li>
                  <li>Confirme o pagamento</li>
                </ol>
              </div>

              <div className="mt-6 text-center text-xs text-neutral-400">
                Pedido #{orderId.slice(0, 8).toUpperCase()} · Pagamento seguro via Mercado Pago
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Cartão: redireciona para checkout Infinity Pay ────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-10 text-center shadow-card">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100">
          <svg className="h-9 w-9 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">Pagamento com cartão</h1>
        <p className="mt-3 text-neutral-500">
          Seu pedido foi criado. O processamento do cartão é feito com segurança pelo Mercado Pago.
        </p>
        <p className="mt-2 text-xs text-neutral-400">
          Pedido #{orderId.slice(0, 8).toUpperCase()}
        </p>
        <div className="mt-8 space-y-3">
          <button
            onClick={() => router.push(`/checkout/confirmacao/${orderId}`)}
            className="flex w-full items-center justify-center rounded-2xl bg-primary-500 py-3.5 text-sm font-semibold text-white hover:bg-primary-600"
          >
            Ver confirmação do pedido →
          </button>
          <Link href="/carrinho" className="flex w-full items-center justify-center rounded-2xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-600 hover:bg-neutral-50">
            Cancelar
          </Link>
        </div>
      </div>
    </div>
  )
}
