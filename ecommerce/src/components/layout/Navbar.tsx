'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Produtos' },
    { href: '/#sobre', label: 'Sobre' },
    { href: '/#como-chegar', label: 'Como Chegar' },
    { href: '/#contato', label: 'Contato' },
  ]

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-neutral-200/80 bg-white/95 shadow-soft backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="container-custom">
        <div className="flex h-[68px] items-center justify-between gap-3 sm:h-[72px] sm:gap-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo.jpeg"
              alt="Case Store"
              width={126}
              height={44}
              className="h-9 w-auto object-contain sm:h-11"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-10 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-neutral-500 transition-colors hover:text-primary-500"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <button
              aria-label="Buscar"
              className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-primary-500 sm:p-2.5"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <Link
              href="/conta"
              aria-label="Conta"
              className="hidden rounded-full p-2.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-primary-500 sm:flex"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>

            <Link
              href="/carrinho"
              aria-label="Bolsa"
              className="inline-flex rounded-full border border-neutral-200 p-2 text-neutral-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-500 sm:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </Link>

            <Link
              href="/carrinho"
              className="hidden items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 sm:inline-flex"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Bolsa
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              className="rounded-full p-2 text-neutral-600 transition-colors hover:bg-neutral-100 lg:hidden sm:p-2.5"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 lg:hidden ${
            isMobileMenuOpen ? 'max-h-[28rem] pb-4 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="rounded-[1.75rem] border border-neutral-200 bg-white p-3 shadow-card">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-2xl px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-primary-500"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Link
                href="/conta"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-500"
              >
                Minha conta
              </Link>
              <Link
                href="/carrinho"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center rounded-2xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white"
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
