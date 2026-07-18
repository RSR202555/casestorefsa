'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const router = useRouter()
  const pathname = usePathname()

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Produtos' },
    { href: '/#sobre', label: 'Sobre' },
    { href: '/#como-chegar', label: 'Como Chegar' },
    { href: '/#contato', label: 'Contato' },
  ]
  
  const whatsappHref = 'https://wa.me/5575982863219'
  const instagramHref = 'https://www.instagram.com/casestore_fsa'

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchQuery.trim()

    router.push(query ? `/products?q=${encodeURIComponent(query)}` : '/products')
    setIsSearchOpen(false)
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-neutral-100 bg-white/95 shadow-sm backdrop-blur">
      
      {/* Top Announcement Bar */}
      <div className="bg-[#e4048c] text-white py-1.5 text-center text-[9px] sm:text-[10px] font-bold tracking-[0.18em] uppercase">
        <div className="container-custom flex justify-center gap-6 sm:gap-12">
          <span>✨ FRETE GRÁTIS ACIMA DE R$ 300</span>
          <span className="hidden md:inline">🔥 20% OFF COM CUPOM: CASE20</span>
          <span className="hidden sm:inline">💬 ATENDIMENTO WHATSAPP</span>
        </div>
      </div>

      <div className="container-custom">
        <div className="flex h-16 items-center justify-between gap-2 sm:h-[72px] sm:gap-6">
          
          {/* Logo */}
          <Link href="/" className="flex min-w-0 shrink items-center">
            <Image
              src="/images/logo.jpeg"
              alt="Case Store"
              width={126}
              height={44}
              className="h-8 w-auto max-w-[92px] object-contain sm:h-10 sm:max-w-none rounded-sm"
              priority
            />
          </Link>

          {/* Centered navigation links */}
          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-bold uppercase tracking-widest transition-colors ${
                    isActive ? 'text-[#e4048c]' : 'text-neutral-500 hover:text-[#e4048c]'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Right Action Icons & Buttons */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            
            {/* WhatsApp */}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-[#e4048c] sm:h-10 sm:w-10"
            >
              <svg className="block h-[18px] w-[18px] flex-none sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.52 3.48A11.86 11.86 0 0012.07 0C5.52 0 .2 5.32.2 11.87c0 2.09.55 4.13 1.58 5.92L0 24l6.39-1.67a11.82 11.82 0 005.68 1.45h.01c6.54 0 11.86-5.32 11.86-11.87 0-3.17-1.23-6.14-3.42-8.43zM12.08 21.76h-.01a9.84 9.84 0 01-5.01-1.37l-.36-.21-3.79.99 1.01-3.69-.23-.38a9.86 9.86 0 01-1.51-5.23c0-5.44 4.43-9.87 9.88-9.87 2.64 0 5.12 1.03 6.99 2.9a9.8 9.8 0 012.89 6.98c0 5.45-4.43 9.88-9.87 9.88zm5.42-7.4c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15s-.77.97-.95 1.17c-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.08-.79.38s-1.04 1.02-1.04 2.49 1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.71.23 1.35.2 1.86.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" />
              </svg>
            </a>

            {/* Instagram */}
            <a
              href={instagramHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-[#e4048c] min-[380px]:inline-flex sm:h-10 sm:w-10"
            >
              <svg className="block h-[18px] w-[18px] flex-none sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.75 2h8.5A5.76 5.76 0 0122 7.75v8.5A5.76 5.76 0 0116.25 22h-8.5A5.76 5.76 0 012 16.25v-8.5A5.76 5.76 0 017.75 2zm0 1.8A3.96 3.96 0 003.8 7.75v8.5a3.96 3.96 0 003.95 3.95h8.5a3.96 3.96 0 003.95-3.95v-8.5a3.96 3.96 0 00-3.95-3.95h-8.5zm8.95 1.35a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zM12 6.86A5.14 5.14 0 1112 17.14 5.14 5.14 0 0112 6.86zm0 1.8A3.34 3.34 0 1012 15.34 3.34 3.34 0 0012 8.66z" />
              </svg>
            </a>

            {/* Search Input Box */}
            <form
              onSubmit={handleSearchSubmit}
              className={`hidden items-center overflow-hidden rounded-full border border-neutral-200 bg-white transition-all sm:flex ${
                isSearchOpen ? 'w-64 px-3 py-1.5' : 'w-0 border-transparent px-0 py-0'
              }`}
            >
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar produtos..."
                className={`w-full bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400 ${
                  isSearchOpen ? 'block' : 'hidden'
                }`}
              />
            </form>

            {/* Search Button */}
            <button
              aria-label="Buscar"
              onClick={() => {
                if (isSearchOpen && searchQuery.trim()) {
                  router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`)
                  setIsSearchOpen(false)
                  return
                }
                setIsSearchOpen((prev) => !prev)
              }}
              className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-[#e4048c] sm:p-2.5"
            >
              <svg className="h-[18px] w-[18px] sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Account */}
            <Link
              href="/conta"
              aria-label="Conta"
              className="hidden rounded-full p-2.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-[#e4048c] sm:flex"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>

            {/* Mobile Cart */}
            <Link
              href="/carrinho"
              aria-label="Bolsa"
              className="inline-flex rounded-full border border-neutral-200 p-2 text-neutral-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-[#e4048c] sm:hidden"
            >
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </Link>

            {/* Desktop Bolsa Button - Rectangular and Editorial */}
            <Link
              href="/carrinho"
              className="hidden items-center gap-2 rounded-none bg-[#e4048c] px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#db2777] sm:inline-flex"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Bolsa
            </Link>

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              className="rounded-full p-2 text-neutral-600 transition-colors hover:bg-neutral-100 lg:hidden sm:p-2.5"
            >
              <svg className="h-[18px] w-[18px] sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div
          className={`overflow-hidden transition-all duration-300 lg:hidden ${
            isMobileMenuOpen ? 'max-h-[28rem] pb-4 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="rounded-[1.75rem] border border-neutral-200 bg-white p-3 shadow-card">
            <form onSubmit={handleSearchSubmit} className="mb-3 flex items-center gap-2 rounded-2xl border border-neutral-200 px-4 py-3">
              <svg className="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar produtos..."
                className="w-full bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
              />
            </form>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-[#e4048c]"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Link
                href="/conta"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center rounded-2xl border border-neutral-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-neutral-700 transition-colors hover:border-[#e4048c] hover:bg-neutral-50 hover:text-[#e4048c]"
              >
                Minha conta
              </Link>
              <Link
                href="/carrinho"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center rounded-none bg-[#e4048c] px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#db2777]"
              >
                Bolsa
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
