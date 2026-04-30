'use client'

const testimonials = [
  {
    id: 1,
    name: 'Maria Silva',
    location: 'Feira de Santana, BA',
    rating: 5,
    text: 'Perfume maravilhoso! Chegou super rápido e bem embalado. A fragrância é idêntica à da loja física. Super recomendo!',
    avatar: 'MS',
  },
  {
    id: 2,
    name: 'Ana Beatriz',
    location: 'Feira de Santana, BA',
    rating: 5,
    text: 'Melhor loja de perfumes online! Atendimento excelente e os preços são muito competitivos. Já sou cliente fiel há 2 anos.',
    avatar: 'AB',
  },
  {
    id: 3,
    name: 'Juliana Costa',
    location: 'Feira de Santana, BA',
    rating: 5,
    text: 'Comprei o J\'adore e veio lacrado, com nota fiscal. Fiquei muito satisfeita com a experiência de compra.',
    avatar: 'JC',
  },
  {
    id: 4,
    name: 'Camila Santos',
    location: 'Feira de Santana, BA',
    rating: 5,
    text: 'Esse é o meu perfume favorito! Já é a terceira vez que compro aqui. Sempre chega rápido e com ótimo preço.',
    avatar: 'CS',
  },
  {
    id: 5,
    name: 'Fernanda Lima',
    location: 'Feira de Santana, BA',
    rating: 4,
    text: 'Primeira compra e já amei! O perfume veio perfeito e a embalagem é linda. Vou comprar novamente com certeza.',
    avatar: 'FL',
  },
  {
    id: 6,
    name: 'Patricia Mendes',
    location: 'Feira de Santana, BA',
    rating: 5,
    text: 'Atendimento impecável! Tive uma dúvida e o suporte respondeu super rápido. O perfume é maravilhoso.',
    avatar: 'PM',
  },
]

export default function Testimonials() {
  return (
    <section className="overflow-hidden bg-white py-16 lg:py-24">
      <div className="container-custom">
        <div className="mb-10 text-center sm:mb-14">
          <span className="inline-block text-primary-500 text-sm font-semibold tracking-[0.2em] uppercase mb-4">
            Depoimentos
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 mb-4">
            O que Nossas Clientes Dizem
          </h2>
          <p className="text-neutral-500 max-w-2xl mx-auto">
            Mais de 10.000 mulheres já encontraram sua fragrância conosco.
          </p>
        </div>

        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className={`min-w-[86%] snap-center rounded-3xl bg-neutral-50 p-6 transition-all duration-500 animate-slide-up hover:bg-white hover:shadow-card sm:min-w-[380px] md:min-w-0 md:p-8 ${
                index >= 3 ? 'hidden lg:block' : ''
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${
                      i < testimonial.rating ? 'text-amber-400' : 'text-neutral-200'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className="text-neutral-600 leading-relaxed mb-6">
                &ldquo;{testimonial.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-500 flex items-center justify-center font-semibold text-sm">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">{testimonial.name}</p>
                  <p className="text-sm text-neutral-500">{testimonial.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
