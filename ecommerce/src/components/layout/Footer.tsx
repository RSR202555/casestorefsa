'use client'

import Link from 'next/link'

const footerLinks = {
  navigation: [
    { label: 'Home', href: '/' },
    { label: 'Produtos', href: '/products' },
    { label: 'Sobre Nós', href: '/#sobre' },
    { label: 'Contato', href: '/#contato' },
  ],
  categories: [
    { label: 'Feminino', href: '/products?category=feminino' },
    { label: 'Importados', href: '/products?category=importado' },
    { label: 'Promoções', href: '/products?filter=promo' },
    { label: 'Lançamentos', href: '/products?filter=new' },
  ],
  support: [
    { label: 'FAQ', href: '/faq' },
    { label: 'Trocas e Devoluções', href: '/trocas' },
    { label: 'Política de Privacidade', href: '/privacidade' },
    { label: 'Termos de Uso', href: '/termos' },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-neutral-900 text-white">
      <div className="container-custom py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-6">
              <span className="font-display text-2xl font-semibold">
                Essência <span className="text-primary-400">Feminina</span>
              </span>
            </Link>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              Fragrâncias exclusivas que revelam sua essência. Perfumes importados das melhores marcas mundiais com autenticidade garantida.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-6">Navegação</h4>
            <ul className="space-y-3">
              {footerLinks.navigation.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-6">Categorias</h4>
            <ul className="space-y-3">
              {footerLinks.categories.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-6">Suporte</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-800">
        <div className="container-custom py-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <p className="text-sm text-neutral-500">
              © 2026 Essência Feminina. Todos os direitos reservados.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Pagamento Seguro
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                100% Original
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
