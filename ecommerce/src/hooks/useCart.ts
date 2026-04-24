'use client'

import { useCallback, useEffect, useState } from 'react'

export interface CartItem {
  product_id: string
  name: string
  brand: string
  price: number      // preço efetivo (com desconto, se houver)
  image: string
  slug: string
  quantity: number
}

const CART_KEY = 'casestore_cart'

function readStorage(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

function writeStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    setItems(readStorage())

    function onStorage(e: StorageEvent) {
      if (e.key === CART_KEY) setItems(readStorage())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const sync = useCallback((next: CartItem[]) => {
    writeStorage(next)
    setItems(next)
  }, [])

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantity'>, qty = 1) => {
      setItems((prev) => {
        const exists = prev.find((i) => i.product_id === item.product_id)
        const next = exists
          ? prev.map((i) =>
              i.product_id === item.product_id
                ? { ...i, quantity: i.quantity + qty }
                : i
            )
          : [...prev, { ...item, quantity: qty }]
        writeStorage(next)
        return next
      })
    },
    []
  )

  const removeItem = useCallback((product_id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.product_id !== product_id)
      writeStorage(next)
      return next
    })
  }, [])

  const updateQty = useCallback((product_id: string, quantity: number) => {
    if (quantity < 1) return
    setItems((prev) => {
      const next = prev.map((i) =>
        i.product_id === product_id ? { ...i, quantity } : i
      )
      writeStorage(next)
      return next
    })
  }, [])

  const clearCart = useCallback(() => sync([]), [sync])

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const count = items.reduce((s, i) => s + i.quantity, 0)

  return { items, addItem, removeItem, updateQty, clearCart, total, count }
}
