import type { Metadata } from 'next'
import Link from 'next/link'
import PromoBanner from '@/components/home/PromoBanner'
import Hero from '@/components/home/Hero'
import TrustSection from '@/components/home/TrustSection'
import BestSellers from '@/components/home/BestSellers'
import Promotions from '@/components/home/Promotions'
import Testimonials from '@/components/home/Testimonials'
import StoreLocation from '@/components/home/StoreLocation'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Essencia Feminina | Perfumes Premium',
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
      <PromoBanner />
      <Hero />
      <TrustSection />
      <BestSellers />
      {promoEnabled && <Promotions />}
      <Testimonials />

      <section
        id="sobre"
        className="bg-neutral-900 py-16 text-white lg:py-24"
      >
        <div className="container-custom grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10">
          <div>
            <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-[0.2em] text-primary-300">
              Sobre a marca
            </span>
            <h2 className="font-display text-3xl font-semibold md:text-4xl">
              Curadoria focada em fragrancias que realmente marcam presenca
            </h2>
            <p className="mt-5 max-w-2xl text-neutral-300">
              A Essencia Feminina nasceu para unir selecao premium, atendimento
              proximo e uma experiencia de compra elegante. O projeto ja tinha
              a frente visual pronta e hoje ganhou a primeira base solida de
              backend, autenticacao e APIs.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {[
              { label: 'Marcas premium', value: '50+' },
              { label: 'Clientes atendidas', value: '10 mil' },
              { label: 'Estados com envio', value: '27' },
              { label: 'Checkout seguro', value: 'PIX + cartao' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6"
              >
                <p className="text-3xl font-bold text-primary-300">
                  {item.value}
                </p>
                <p className="mt-2 text-sm text-neutral-300">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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

            <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="rounded-3xl bg-white p-6 shadow-soft">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  WhatsApp
                </p>
                <p className="mt-3 text-lg font-semibold text-neutral-900">
                  (11) 99999-0000
                </p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-soft">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  E-mail
                </p>
                <p className="mt-3 text-lg font-semibold text-neutral-900">
                  contato@essenciafeminina.com
                </p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-soft">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Horario
                </p>
                <p className="mt-3 text-lg font-semibold text-neutral-900">
                  Seg a Sex, 9h as 18h
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
