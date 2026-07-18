'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(255,184,226,0.16),_transparent_28%),linear-gradient(180deg,_#f30d93_0%,_#de007f_100%)] pt-24 sm:pt-28 pb-12 lg:pb-0 lg:pt-28 lg:h-screen flex items-center">
      <div className="absolute inset-0 opacity-20 pointer-events-none z-10">
        <div className="absolute left-[-4rem] top-20 h-44 w-44 rounded-full border border-white/20" />
        <div className="absolute left-12 top-44 h-3 w-3 rounded-full bg-white/60" />
        <div className="absolute bottom-20 right-[45%] h-56 w-56 rounded-full border border-white/10" />
      </div>

      <div className="container-custom relative w-full z-20">
        <div className="grid lg:grid-cols-[0.58fr_0.42fr] gap-8 items-center">
          
          {/* Left Text Column */}
          <div className="max-w-xl text-white py-8 lg:py-16">
            
            {/* Tagline */}
            <span className="mb-4 block text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-white/80">
              Natural • Luxuoso • Único
            </span>

            {/* Title - Playfair Display */}
            <h1 className="font-display font-medium leading-[1.1] text-white text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] tracking-tight">
              Case Store
              <span className="block mt-2 font-normal italic drop-shadow-sm">
                Por Mayana Lais
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 max-w-[480px] text-[0.95rem] leading-relaxed text-white/85 sm:mt-6 sm:text-base sm:leading-relaxed">
              Descubra fragrâncias exclusivas que revelam sua personalidade única. Perfumes importados com qualidade garantida.
            </p>

            {/* Buttons Row */}
            <div className="mt-8 flex flex-col gap-4 sm:mt-10 sm:flex-row sm:items-center sm:gap-5">
              <Link
                href="/products"
                className="inline-flex w-full items-center justify-center rounded-none bg-white px-8 py-4 text-xs font-bold uppercase tracking-widest text-[#de007f] transition-all hover:bg-neutral-50 active:scale-[0.98] sm:w-auto shadow-sm"
              >
                Comprar Agora
              </Link>

              <Link
                href="/#contato"
                className="inline-flex w-full items-center justify-center rounded-none border border-white/50 bg-transparent px-8 py-4 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10 active:scale-[0.98] sm:w-auto"
              >
                Falar com a loja
              </Link>
            </div>

            {/* Horizontal Row of Benefits */}
            <div className="mt-8 sm:mt-10 grid grid-cols-2 gap-4 border-t border-white/15 pt-8 text-xs text-white/90 sm:grid-cols-4 sm:gap-6 sm:text-sm">
              <div className="flex items-center gap-2.5">
                <span className="text-base sm:text-lg flex-shrink-0">🌟</span>
                <div>
                  <p className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">100% Originais</p>
                  <p className="text-[10px] text-white/70">Com procedência</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-base sm:text-lg flex-shrink-0">🚚</span>
                <div>
                  <p className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">Envio Ágil</p>
                  <p className="text-[10px] text-white/70">Despacho imediato</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-base sm:text-lg flex-shrink-0">🛡️</span>
                <div>
                  <p className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">Compra Segura</p>
                  <p className="text-[10px] text-white/70">Pagamento protegido</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-base sm:text-lg flex-shrink-0">💬</span>
                <div>
                  <p className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">Suporte VIP</p>
                  <p className="text-[10px] text-white/70">Chat via WhatsApp</p>
                </div>
              </div>
            </div>

          </div>

          {/* Mobile Image Container (Centered rounded card to preserve face and proportions beautifully on mobile) */}
          <div className="relative w-full max-w-[320px] sm:max-w-[380px] mx-auto lg:hidden mt-8">
            <div className="relative aspect-[0.68] w-full overflow-hidden rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
              <Image
                src="/images/MAIANE.jpeg"
                alt="Modelo aplicando perfume"
                fill
                priority
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 380px"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Desktop Full-Height Image (absolute positioned on the right half, showing face completely via object-top) */}
      <div className="absolute right-0 bottom-0 top-0 hidden lg:block lg:w-[40%] xl:w-[44%] max-w-[650px] z-0 pointer-events-none">
        <div className="relative h-full w-full">
          <Image
            src="/images/MAIANE.jpeg"
            alt="Modelo aplicando perfume"
            fill
            priority
            className="object-cover lg:object-top"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, black 18%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 18%)',
            }}
            sizes="50vw"
          />
        </div>
      </div>

    </section>
  )
}
