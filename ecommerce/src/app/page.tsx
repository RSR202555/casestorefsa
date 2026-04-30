import type { Metadata } from 'next'
import Link from 'next/link'
import Hero from '@/components/home/Hero'
import TrustSection from '@/components/home/TrustSection'
import BestSellers from '@/components/home/BestSellers'
import Promotions from '@/components/home/Promotions'
import Testimonials from '@/components/home/Testimonials'
import StoreLocation from '@/components/home/StoreLocation'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    absolute: 'Case Store',
  },
  description:
    'Perfumes importados, selecao premium e entrega para todo o Brasil.',
}

async function isPromoEnabled(): Promise<boolean> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('site_config')
      .select('value')
      .eq('key', 'promo_enabled')
      .maybeSingle()
    return data?.value === true
  } catch {
    return false
  }
}

export default async function HomePage() {
  const promoEnabled = await isPromoEnabled()

  return (
    <>
      <Hero />
      <TrustSection />
      <BestSellers />
      {promoEnabled && <Promotions />}
      <Testimonials />

      <StoreLocation />

      <section
        id="contato"
        className="bg-white py-16 lg:py-24"
      >
        <div className="container-custom">
          <div className="mx-auto max-w-4xl rounded-[2rem] bg-gradient-to-br from-primary-50 via-white to-neutral-50 p-6 shadow-card sm:p-8 md:p-12">
            <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-[0.2em] text-primary-500">
              Contato
            </span>
            <h2 className="font-display text-3xl font-semibold text-neutral-900 md:text-4xl">
              Atendimento rapido para duvidas, pedidos e pos-venda
            </h2>
            <p className="mt-4 text-neutral-600">
              Enquanto o backend administrativo termina de ser integrado, o
              canal de atendimento continua sendo o melhor ponto para suporte e
              acompanhamento de compra.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-white p-6 shadow-soft">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  WhatsApp
                </p>
                <p className="mt-3 text-lg font-semibold text-neutral-900">
                  (75) 98286-3219
                </p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-soft">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Horario
                </p>
                <p className="mt-3 text-lg font-semibold text-neutral-900">
                  Seg - Sex: 8h30 as 17h30
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Sabado: 8h30 as 13h
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Link href="/products" className="btn-primary w-full sm:w-auto">
                Explorar produtos
              </Link>
              <Link href="/conta" className="btn-secondary w-full sm:w-auto">
                Minha conta
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
