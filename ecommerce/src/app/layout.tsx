import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'Essência Feminina | Perfumes Premium Importados',
  description: 'Descubra fragrâncias exclusivas que revelam sua essência. Perfumes importados das melhores marcas com qualidade e autenticidade garantida.',
  keywords: 'perfumes, fragrâncias, importados, feminino, luxo, Chanel, Dior, Lancôme',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <body className="antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
