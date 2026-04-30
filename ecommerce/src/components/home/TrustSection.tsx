'use client'

const trustItems = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: '100% Original',
    description: 'Todos os produtos são importados direto das marcas, com nota fiscal e garantia de autenticidade.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Entrega Expressa',
    description: 'Enviamos para todo Brasil com rastreamento. Entrega em até 5 dias úteis nas capitais.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Pagamento Seguro',
    description: 'Aceitamos cartões, PIX e boleto. Seus dados protegidos com criptografia SSL.',
  },
]

export default function TrustSection() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="container-custom">
        <div className="mb-12 text-center sm:mb-16">
          <span className="inline-block text-primary-500 text-sm font-semibold tracking-[0.2em] uppercase mb-4">
            Por que nos escolher
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-neutral-900">
            Sua Confiança é Nossa Prioridade
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {trustItems.map((item, index) => (
            <div
              key={index}
              className="group rounded-[1.75rem] bg-neutral-50 p-6 text-center transition-all duration-500 hover:bg-white hover:shadow-card sm:p-7"
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-500 transition-all duration-500 group-hover:bg-primary-500 group-hover:text-white sm:h-16 sm:w-16">
                {item.icon}
              </div>
              <h3 className="font-semibold text-lg text-neutral-900 mb-3">
                {item.title}
              </h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
