export interface Product {
  id: string
  slug: string
  name: string
  brand: string
  price: number
  originalPrice?: number
  rating: number
  reviewCount: number
  image: string
  images: string[]
  category: string
  categorySlug?: string
  badge?: 'promo' | 'bestseller' | 'new' | 'limited'
  description: string
  notes: {
    top: string[]
    heart: string[]
    base: string[]
  }
  inStock: boolean
  stockCount: number
  sizes: { ml: number; price: number }[]
}

export const products: Product[] = [
  {
    id: '1',
    slug: 'coco-mademoiselle',
    name: 'Coco Mademoiselle',
    brand: 'CHANEL',
    price: 1099.90,
    rating: 4.9,
    reviewCount: 234,
    image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=500&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&h=900&fit=crop',
      'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=800&h=900&fit=crop',
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&h=900&fit=crop',
    ],
    category: 'Feminino',
    badge: 'bestseller',
    description: 'Coco Mademoiselle é uma fragrância fresca, luminosa e audaciosa. Uma composição oriental moderna com notas de laranja, rosa e patchouli.',
    notes: {
      top: ['Laranja', 'Bergamota', 'Toranja'],
      heart: ['Rosa', 'Jasmim', 'Lichia'],
      base: ['Patchouli', 'Baunilha', 'Almiscar Branco'],
    },
    inStock: true,
    stockCount: 12,
    sizes: [
      { ml: 50, price: 1099.90 },
      { ml: 100, price: 1499.90 },
      { ml: 200, price: 2199.90 },
    ],
  },
  {
    id: '2',
    slug: 'jadore-dior',
    name: "J'adore",
    brand: 'DIOR',
    price: 549.90,
    originalPrice: 699.90,
    rating: 4.8,
    reviewCount: 189,
    image: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=500&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=800&h=900&fit=crop',
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&h=900&fit=crop',
    ],
    category: 'Feminino',
    badge: 'promo',
    description: "J'adore é um perfume floral icônico que celebra a feminilidade absoluta. Um elixir moderno com notas de ylang-ylang, rosa e jasmim.",
    notes: {
      top: ['Pêra', 'Melão', 'Bergamota'],
      heart: ['Ylang-Ylang', 'Rosa Damascena', 'Jasmim'],
      base: ['Cedro', 'Almiscar', 'Baunilha'],
    },
    inStock: true,
    stockCount: 8,
    sizes: [
      { ml: 30, price: 549.90 },
      { ml: 50, price: 799.90 },
      { ml: 100, price: 1149.90 },
    ],
  },
  {
    id: '3',
    slug: 'la-vie-est-belle',
    name: 'La Vie Est Belle',
    brand: 'LANCÔME',
    price: 459.90,
    rating: 4.7,
    reviewCount: 312,
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&h=900&fit=crop',
    ],
    category: 'Feminino',
    badge: 'bestseller',
    description: 'La Vie Est Belle é uma fragrância gourmand que celebra a felicidade. Com notas de íris, patchouli e praline.',
    notes: {
      top: ['Groselha Negra', 'Pêra'],
      heart: ['Íris', 'Jasmim', 'Flor de Laranjeira'],
      base: ['Praline', 'Patchouli', 'Baunilha'],
    },
    inStock: true,
    stockCount: 5,
    sizes: [
      { ml: 30, price: 459.90 },
      { ml: 50, price: 649.90 },
      { ml: 75, price: 849.90 },
    ],
  },
  {
    id: '4',
    slug: 'good-girl',
    name: 'Good Girl',
    brand: 'CAROLINA HERRERA',
    price: 399.90,
    rating: 4.6,
    reviewCount: 156,
    image: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=500&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800&h=900&fit=crop',
    ],
    category: 'Feminino',
    badge: 'promo',
    description: 'Good Girl é a dualidade da mulher moderna. Um perfume ousado e sofisticado com notas de café, amêndoa e jasmim.',
    notes: {
      top: ['Amêndoa', 'Café', 'Bergamota'],
      heart: ['Jasmim Sambac', 'Tuberose', 'Rosa'],
      base: ['Feijão Tonka', 'Cacau', 'Baunilha'],
    },
    inStock: true,
    stockCount: 15,
    sizes: [
      { ml: 30, price: 399.90 },
      { ml: 50, price: 549.90 },
      { ml: 80, price: 749.90 },
    ],
  },
  {
    id: '5',
    slug: 'black-opium',
    name: 'Black Opium',
    brand: 'YVES SAINT LAURENT',
    price: 529.90,
    rating: 4.8,
    reviewCount: 278,
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=500&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&h=900&fit=crop',
    ],
    category: 'Feminino',
    description: 'Black Opium é o perfume viciante para a mulher ousada. Notas de café preto, baunilha e flor de laranjeira.',
    notes: {
      top: ['Flor de Laranjeira', 'Pêra', 'Pimenta Rosa'],
      heart: ['Café', 'Jasmim', 'Amêndoa Amarga'],
      base: ['Baunilha', 'Patchouli', 'Cedro'],
    },
    inStock: true,
    stockCount: 10,
    sizes: [
      { ml: 30, price: 529.90 },
      { ml: 50, price: 729.90 },
      { ml: 90, price: 979.90 },
    ],
  },
  {
    id: '6',
    slug: 'bloom-gucci',
    name: 'Bloom',
    brand: 'GUCCI',
    price: 1189.90,
    rating: 4.5,
    reviewCount: 98,
    image: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=500&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=800&h=900&fit=crop',
    ],
    category: 'Feminino',
    badge: 'new',
    description: 'Gucci Bloom é um jardim imaginário rico em jasmim, tuberosa e raiz de íris. Uma fragrância intensamente feminina.',
    notes: {
      top: ['Raiz de Íris'],
      heart: ['Jasmim Sambac', 'Tuberose'],
      base: ['Raiz de Angélica', 'Madeira de Sandalo'],
    },
    inStock: true,
    stockCount: 7,
    sizes: [
      { ml: 30, price: 689.90 },
      { ml: 50, price: 1189.90 },
      { ml: 100, price: 1589.90 },
    ],
  },
  {
    id: '7',
    slug: 'miss-dior',
    name: 'Miss Dior Blooming Bouquet',
    brand: 'DIOR',
    price: 849.90,
    rating: 4.7,
    reviewCount: 145,
    image: 'https://images.unsplash.com/photo-1594035900144-17fc5242a040?w=500&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1594035900144-17fc5242a040?w=800&h=900&fit=crop',
    ],
    category: 'Feminino',
    description: 'Miss Dior Blooming Bouquet é um bouquet primaveril delicado e luminoso. Notas de peônia siciliana e rosa damascena.',
    notes: {
      top: ['Bergamota Siciliana'],
      heart: ['Peônia', 'Rosa Damascena'],
      base: ['Almiscar Branco'],
    },
    inStock: true,
    stockCount: 11,
    sizes: [
      { ml: 50, price: 849.90 },
      { ml: 100, price: 1199.90 },
    ],
  },
  {
    id: '8',
    slug: 'bright-crystal',
    name: 'Bright Crystal',
    brand: 'VERSACE',
    price: 349.90,
    rating: 4.4,
    reviewCount: 203,
    image: 'https://images.unsplash.com/photo-1595535873420-a599195b3f4a?w=500&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1595535873420-a599195b3f4a?w=800&h=900&fit=crop',
    ],
    category: 'Feminino',
    description: 'Bright Crystal é uma fragrância fresca e luminosa como um cristal. Notas de yuzu, peônia e madeira de caixemira.',
    notes: {
      top: ['Yuzu', 'Romã', 'Gelo'],
      heart: ['Peônia', 'Magnólia', 'Lótus'],
      base: ['Madeira de Caixemira', 'Ambra', 'Almiscar'],
    },
    inStock: true,
    stockCount: 20,
    sizes: [
      { ml: 30, price: 349.90 },
      { ml: 50, price: 499.90 },
      { ml: 90, price: 699.90 },
    ],
  },
]

export const categories = ['Feminino', 'Masculino', 'Unissex', 'Importado']

export const brands = [
  'CHANEL',
  'DIOR',
  'LANCÔME',
  'CAROLINA HERRERA',
  'YVES SAINT LAURENT',
  'GUCCI',
  'VERSACE',
  'PRADA',
]

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, limit)
}