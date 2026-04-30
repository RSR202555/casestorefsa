'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(255,184,226,0.16),_transparent_28%),linear-gradient(180deg,_#f30d93_0%,_#de007f_100%)] pb-14 pt-8 sm:pb-20 sm:pt-10">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute left-[-4rem] top-20 h-44 w-44 rounded-full border border-white/20" />
        <div className="absolute left-12 top-44 h-3 w-3 rounded-full bg-white/60" />
        <div className="absolute bottom-20 right-[10%] h-56 w-56 rounded-full border border-white/10" />
      </div>

      <div className="container-custom relative">
        <div className="grid items-center gap-10 py-4 lg:min-h-[680px] lg:grid-cols-[0.95fr_1.05fr] lg:gap-20 lg:py-10">
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

            <h1 className="max-w-[560px] text-[2.8rem] font-extrabold leading-[0.9] tracking-[-0.05em] sm:text-5xl md:text-6xl">
              Perfumes que
              <span className="block">marcam presenca</span>
            </h1>

            <p className="mt-5 max-w-[470px] text-base leading-7 text-white/84 sm:mt-6 sm:text-lg sm:leading-8">
              Descubra fragrancias exclusivas que revelam sua personalidade
              unica. Perfumes importados com qualidade garantida.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/88">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                Originais e lacrados
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                Atendimento pelo WhatsApp
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                Entrega para Feira e região
              </span>
            </div>

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

              <Link
                href="/#contato"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-7 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/15 sm:w-auto"
              >
                Falar com a loja
              </Link>
            </div>

            <div className="mt-8 grid max-w-[520px] grid-cols-2 gap-3 text-sm md:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 shadow-[0_14px_35px_rgba(96,0,50,0.12)] backdrop-blur-sm">
                <p className="text-xl font-semibold">50+</p>
                <p className="mt-1 text-white/75">marcas premium</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 shadow-[0_14px_35px_rgba(96,0,50,0.12)] backdrop-blur-sm">
                <p className="text-xl font-semibold">24h</p>
                <p className="mt-1 text-white/75">envio agil</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 shadow-[0_14px_35px_rgba(96,0,50,0.12)] backdrop-blur-sm col-span-2 md:col-span-1">
                <p className="text-xl font-semibold">100%</p>
                <p className="mt-1 text-white/75">compra segura</p>
              </div>
            </div>
          </div>

          <div className="order-2 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[320px] sm:max-w-[420px]">
              <div className="relative overflow-hidden rounded-[30px] border border-white/20 bg-white/10 p-3 shadow-[0_35px_80px_rgba(83,0,47,0.28)] backdrop-blur-sm">
              <div className="relative aspect-[0.62]">
                <Image
                  src="/images/hero.jpeg"
                  alt="Modelo aplicando perfume"
                  fill
                  priority
                  className="rounded-[24px] object-cover object-center"
                  sizes="(max-width: 1024px) 80vw, 420px"
                />
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
