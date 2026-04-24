'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function Hero() {
  return (
    <section className="overflow-hidden bg-primary-500 pb-14 pt-8 sm:pb-20 sm:pt-10">
      <div className="container-custom">
        <div className="grid items-center gap-10 py-4 lg:min-h-[640px] lg:grid-cols-[0.95fr_1.05fr] lg:gap-20 lg:py-10">
          <div className="order-1 max-w-xl text-white">
            <div className="mb-6 inline-flex rounded-[20px] bg-white p-3 shadow-card sm:mb-8 sm:rounded-[24px] sm:p-4">
              <Image
                src="/images/logo.jpeg"
                alt="Case Store"
                width={120}
                height={120}
                className="h-12 w-auto object-contain sm:h-16"
                priority
              />
            </div>

            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white sm:mb-7 sm:text-sm">
              <span>*</span>
              Nova Colecao 2026
            </div>

            <h1 className="max-w-[520px] text-[2.8rem] font-extrabold leading-[0.92] tracking-[-0.05em] sm:text-5xl md:text-6xl">
              Perfumes que
              <span className="block">marcam presenca</span>
            </h1>

            <p className="mt-5 max-w-[430px] text-base leading-7 text-white/82 sm:mt-6 sm:text-lg sm:leading-8">
              Descubra fragrancias exclusivas que revelam sua personalidade
              unica. Perfumes importados com qualidade garantida.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:mt-10 sm:flex-row sm:items-center">
              <Link
                href="/products"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-base font-semibold text-primary-500 shadow-soft transition-transform hover:-translate-y-0.5 sm:w-auto"
              >
                Comprar Agora
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>

              <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-[250px]">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xl font-semibold">50+</p>
                  <p className="mt-1 text-white/75">marcas premium</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xl font-semibold">24h</p>
                  <p className="mt-1 text-white/75">envio agil</p>
                </div>
              </div>
            </div>
          </div>

          <div className="order-2 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[320px] overflow-hidden rounded-[26px] border border-white/20 shadow-premium sm:max-w-[390px]">
              <div className="relative aspect-[0.62]">
                <Image
                  src="/images/hero.jpeg"
                  alt="Modelo aplicando perfume"
                  fill
                  priority
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 80vw, 390px"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
