'use client'

import Link from 'next/link'

export default function PromoBanner() {
  return (
    <section className="bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_38%),linear-gradient(180deg,_#f30d93_0%,_#de007f_100%)] pt-[76px] sm:pt-[80px]">
      <div className="container-custom">
        <div className="relative overflow-hidden rounded-b-[1.75rem] border border-white/15 bg-white/10 px-4 py-3 text-center text-sm text-white shadow-[0_18px_45px_rgba(110,0,58,0.18)] backdrop-blur-xl sm:rounded-b-[2rem] sm:px-5">
          <div className="absolute inset-y-0 right-0 w-32 bg-white/10 blur-2xl" />
          <div className="relative flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">Oferta por tempo limitado!</span>
          </div>
          <span className="hidden sm:inline">|</span>
          <p className="leading-6 sm:leading-normal">
            <strong>20% OFF</strong> na primeira compra com o cupom{' '}
            <span className="px-2 py-0.5 bg-white/20 rounded font-mono font-bold">BEMVINDA20</span>
          </p>
          <Link
            href="/products"
            className="font-medium underline underline-offset-2 transition-opacity hover:no-underline sm:ml-1"
          >
            Comprar agora →
          </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
