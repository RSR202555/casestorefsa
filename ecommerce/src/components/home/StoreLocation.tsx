import Image from 'next/image'

const MAPS_URL =
  'https://www.google.com/maps?q=-12.255766868591309,-38.96100616455078&z=17&hl=pt-BR'

const EMBED_URL =
  'https://maps.google.com/maps?q=-12.255766868591309,-38.96100616455078&z=17&hl=pt-BR&output=embed'

export default function StoreLocation() {
  return (
    <section id="como-chegar" className="bg-neutral-50 py-16 lg:py-24">
      <div className="container-custom">
        <div className="mb-10 text-center sm:mb-14">
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-[0.2em] text-primary-500">
            Visite-nos
          </span>
          <h2 className="font-display text-3xl font-semibold text-neutral-900 md:text-4xl">
            Como Chegar até a Nossa Loja
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-neutral-500">
            Estamos esperando por você. Venha nos visitar e experimente
            pessoalmente os nossos perfumes.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch">
          <div className="overflow-hidden rounded-3xl shadow-card bg-neutral-100">
            <div className="relative h-64 w-full sm:h-72 lg:h-full lg:min-h-[420px]">
              <Image
                src="/images/frenteloja.jpeg"
                alt="Frente da loja Essência Feminina"
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-3xl shadow-card flex-1 min-h-[240px] sm:min-h-[260px]">
              <iframe
                src={EMBED_URL}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '260px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localização da loja no Google Maps"
              />
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-soft sm:p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    Endereço
                  </p>
                  <p className="mt-2 font-semibold text-neutral-900">
                    Loja Essência Feminina
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Lat: -12.2558 / Lng: -38.9610
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    Horário de Funcionamento
                  </p>
                  <p className="mt-2 text-sm text-neutral-700">
                    Seg – Sex: 8h30 às 17h30
                  </p>
                  <p className="text-sm text-neutral-700">Sábado: 8h30 às 13h</p>
                </div>
              </div>

              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-6 inline-flex w-full items-center justify-center gap-2"
              >
                <svg
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Abrir no Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
