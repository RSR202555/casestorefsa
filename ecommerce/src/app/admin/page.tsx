'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { products as catalogProducts } from '@/data/products'
import { createClient } from '@/lib/supabase/client'

type DashboardPayload = {
  data: {
    kpis: {
      total_orders: number
      total_revenue: number
      pending_orders: number
      paid_orders: number
      refunded_orders: number
      average_ticket: number
      orders_today: number
      revenue_today: number
    }
    overview: {
      customers_total: number
      products_total: number
    }
    recent_orders: Array<{
      id: string
      order_number: string
      customer_name: string
      product_name: string
      total: number
      status: string
    }>
    charts: {
      revenue_over_time: Array<{ date: string; revenue: number; orders: number }>
      orders_by_status: Array<{ status: string; count: number }>
      top_products: Array<{
        product_id: string
        product_name: string
        sku: string
        total_quantity: number
        total_revenue: number
      }>
    }
  } | null
  error: {
    code: string
    message: string
  } | null
}

type ProductsPayload = {
  data: {
    data: Array<{
      id: string
      name: string
      sku: string
      price: number
      promotional_price: number | null
      is_active: boolean
      categories: Array<{ id: string; name: string; slug: string }>
      inventory: {
        available_stock: number
      } | null
    }>
  } | null
  error: {
    code: string
    message: string
  } | null
}

type ProductCreatePayload = {
  data: {
    id: string
  } | null
  error: {
    code: string
    message: string
  } | null
}

type InventoryAdjustPayload = {
  data: {
    product_id: string
    stock_quantity: number
    reserved_stock: number
    low_stock_threshold: number
  } | null
  error: {
    code: string
    message: string
  } | null
}

type OrdersPayload = {
  data: {
    data: Array<{
      id: string
      order_number?: string
      status: string
      payment_status: string
      total?: number
      total_amount?: number
      shipping_tracking_code?: string | null
      customer_snapshot?: { full_name?: string; phone?: string | null; email?: string | null } | null
    }>
  } | null
  error: {
    code: string
    message: string
  } | null
}

type CustomersPayload = {
  data: {
    customers: Array<{
      id: string
      full_name: string
      email: string
      phone: string | null
      cpf: string | null
      created_at: string
      total_orders: number
      paid_orders: number
      canceled_orders: number
      total_spent: number
      last_order_at: string | null
      default_address: {
        label: string | null
        street: string
        number: string
        complement: string | null
        neighborhood: string
        city: string
        state: string
        zip_code: string
        is_default: boolean
      } | null
      recent_orders: Array<{
        id: string
        status: string
        payment_status: string
        total: number
        created_at: string
      }>
    }>
  } | null
  error: {
    code: string
    message: string
  } | null
}

type ReportsPayload = {
  data: {
    period: string
    kpis: {
      total_orders: number
      paid_orders: number
      pending_orders: number
      total_revenue: number
      average_ticket: number
      refunded_orders: number
    }
    revenue_over_time: Array<{ date: string; revenue: number; orders: number }>
    orders_by_status: Array<{ status: string; count: number }>
    top_products: Array<{
      product_id: string
      product_name: string
      sku: string
      total_quantity: number
      total_revenue: number
    }>
  } | null
  error: { code: string; message: string } | null
}

type ProductRow = NonNullable<ProductsPayload['data']>['data'][number]
type OrderRow = NonNullable<OrdersPayload['data']>['data'][number]
type CustomerRow = NonNullable<CustomersPayload['data']>['customers'][number]

type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  created_at: string
}

type AdminSection = 'dashboard' | 'products' | 'orders' | 'customers' | 'categories' | 'reports' | 'settings'

type KpiCard = {
  key: string
  label: string
  value: string
  iconClass: string
  icon: React.ReactNode
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function normalizeStatus(status: string) {
  switch (status) {
    case 'entregue':
      return { label: 'Entregue', className: 'bg-emerald-100 text-emerald-700' }
    case 'enviado':
      return { label: 'Em transito', className: 'bg-sky-100 text-sky-700' }
    case 'pago':
      return { label: 'Pago', className: 'bg-violet-100 text-violet-700' }
    case 'aguardando_pagamento':
      return { label: 'Processando', className: 'bg-amber-100 text-amber-700' }
    case 'cancelado':
      return { label: 'Cancelado', className: 'bg-rose-100 text-rose-700' }
    default:
      return { label: status, className: 'bg-neutral-100 text-neutral-600' }
  }
}

const menuItems: Array<{ key: AdminSection; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'products', label: 'Produtos' },
  { key: 'orders', label: 'Pedidos' },
  { key: 'customers', label: 'Clientes' },
  { key: 'categories', label: 'Categorias' },
  { key: 'reports', label: 'Relatorios' },
  { key: 'settings', label: 'Configuracoes' },
]

const sectionTitles: Record<AdminSection, string> = {
  dashboard: 'Painel administrativo',
  products: 'Gestao de produtos',
  orders: 'Gestao de pedidos',
  customers: 'Gestao de clientes',
  categories: 'Gestao de categorias',
  reports: 'Relatorios administrativos',
  settings: 'Configuracoes da conta',
}


export default function AdminPage() {
  const supabase = useMemo(() => createClient(), [])
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusCode, setStatusCode] = useState<number | null>(null)
  const [payload, setPayload] = useState<DashboardPayload['data']>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({})
  const [trackingSaving, setTrackingSaving] = useState<Record<string, boolean>>({})
  const [customersLoading, setCustomersLoading] = useState(false)
  const [panelNotice, setPanelNotice] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    description: '',
    image_url: '',
    price: '',
    promotional_price: '',
    initial_stock: '',
  })
  const [productImageFile, setProductImageFile] = useState<File | null>(null)
  const [productImagePreview, setProductImagePreview] = useState<string>('')
  const [selectedStockProductId, setSelectedStockProductId] = useState<string | null>(null)
  const [stockForm, setStockForm] = useState({
    quantity_delta: '',
    low_stock_threshold: '',
    notes: '',
  })
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [productSizes, setProductSizes] = useState<{ ml: string; price: string }[]>([])
  const [editFragranceNotes, setEditFragranceNotes] = useState<{ top: string[]; heart: string[]; base: string[] }>({ top: [], heart: [], base: [] })
  const [productCreating, setProductCreating] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productSaving, setProductSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '' })
  const [categoryCreating, setCategoryCreating] = useState(false)
  const [editProductActive, setEditProductActive] = useState(true)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [promoEnabled, setPromoEnabled] = useState(false)
  const [promoLoading, setPromoLoading] = useState(false)
  const [reportsPeriod, setReportsPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month')
  const [reportsData, setReportsData] = useState<ReportsPayload['data']>(null)
  const [reportsLoading, setReportsLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      try {
        const response = await fetch('/api/admin/dashboard', {
          credentials: 'include',
          cache: 'no-store',
        })
        const result = (await response.json()) as DashboardPayload

        if (!active) return

        setStatusCode(response.status)

        if (!response.ok || result.error) {
          setError(result.error?.message ?? 'Nao foi possivel carregar o painel')
          return
        }

        setPayload(result.data)
      } catch {
        if (!active) return
        setError('Falha ao conectar com o painel administrativo')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (activeSection !== 'products') return
    let active = true
    setProductsLoading(true)

    fetch('/api/products?limit=100', { credentials: 'include', cache: 'no-store' })
      .then((response) => response.json())
      .then((result: ProductsPayload) => {
        if (!active) return
        if (result.error || !result.data) {
          setPanelNotice(result.error?.message ?? 'Nao foi possivel carregar produtos')
          return
        }
        setProducts(result.data.data)
      })
      .catch(() => {
        if (active) setPanelNotice('Falha ao carregar produtos')
      })
      .finally(() => {
        if (active) setProductsLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeSection])

  useEffect(() => {
    if (activeSection !== 'orders') return
    let active = true
    setOrdersLoading(true)

    fetch('/api/orders?limit=50', { credentials: 'include', cache: 'no-store' })
      .then((response) => response.json())
      .then((result: OrdersPayload) => {
        if (!active) return
        if (result.error || !result.data) {
          setPanelNotice(result.error?.message ?? 'Nao foi possivel carregar pedidos')
          return
        }
        setOrders(result.data.data)
      })
      .catch(() => {
        if (active) setPanelNotice('Falha ao carregar pedidos')
      })
      .finally(() => {
        if (active) setOrdersLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeSection])

  useEffect(() => {
    if (activeSection !== 'customers') return
    let active = true
    setCustomersLoading(true)

    fetch('/api/admin/customers?limit=100', { credentials: 'include', cache: 'no-store' })
      .then((response) => response.json())
      .then((result: CustomersPayload) => {
        if (!active) return
        if (result.error || !result.data) {
          setPanelNotice(result.error?.message ?? 'Nao foi possivel carregar clientes')
          return
        }

        setCustomers(result.data.customers)
        setSelectedCustomerId((current) =>
          result.data?.customers.some((customer) => customer.id === current)
            ? current
            : result.data?.customers[0]?.id ?? null
        )
      })
      .catch(() => {
        if (active) setPanelNotice('Falha ao carregar clientes')
      })
      .finally(() => {
        if (active) setCustomersLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeSection])

  useEffect(() => {
    if (activeSection !== 'reports') return
    let active = true
    setReportsLoading(true)

    fetch(`/api/admin/reports?period=${reportsPeriod}`, { credentials: 'include', cache: 'no-store' })
      .then((response) => response.json())
      .then((result: ReportsPayload) => {
        if (!active) return
        if (result.error || !result.data) {
          setPanelNotice(result.error?.message ?? 'Nao foi possivel carregar relatorios')
          return
        }
        setReportsData(result.data)
      })
      .catch(() => {
        if (active) setPanelNotice('Falha ao carregar relatorios')
      })
      .finally(() => {
        if (active) setReportsLoading(false)
      })

    return () => { active = false }
  }, [activeSection, reportsPeriod])

  useEffect(() => {
    if (!productImageFile) {
      setProductImagePreview(productForm.image_url)
      return
    }

    const objectUrl = URL.createObjectURL(productImageFile)
    setProductImagePreview(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [productImageFile, productForm.image_url])

  useEffect(() => {
    if (!selectedStockProductId) return

    setStockForm((prev) => ({
      ...prev,
      low_stock_threshold: '',
    }))
  }, [selectedStockProductId])

  useEffect(() => {
    if (activeSection !== 'settings') return

    let active = true

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setPasswordFeedback({
            type: 'error',
            message: 'Nao foi possivel carregar os dados da conta.',
          })
          return
        }

        setAdminEmail(data.user?.email ?? null)
      })
      .catch(() => {
        if (!active) return
        setPasswordFeedback({
          type: 'error',
          message: 'Nao foi possivel carregar os dados da conta.',
        })
      })

    // Busca estado atual da promoção
    fetch('/api/site-config?key=promo_enabled', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((result: { data?: { value: boolean } }) => {
        if (!active) return
        setPromoEnabled(result.data?.value === true)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [activeSection, supabase])

  async function handleTogglePromo() {
    setPromoLoading(true)
    try {
      const next = !promoEnabled
      const res = await fetch('/api/site-config', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'promo_enabled', value: next }),
      })
      if (res.ok) setPromoEnabled(next)
      else setPanelNotice('Erro ao salvar configuracao de promocao')
    } catch {
      setPanelNotice('Erro ao salvar configuracao de promocao')
    } finally {
      setPromoLoading(false)
    }
  }

  useEffect(() => {
    fetch('/api/categories', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((result: { data: Category[] | null; error: unknown }) => {
        if (result.data) setCategories(result.data)
      })
      .catch(() => {})
  }, [])

  function toggleCategoryId(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function slugifyCategory(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  async function handleCreateCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (categoryCreating) return
    setCategoryCreating(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryForm.name,
          slug: categoryForm.slug || slugifyCategory(categoryForm.name),
          description: categoryForm.description || undefined,
        }),
      })
      const result = await response.json()
      if (!response.ok || result.error) {
        setPanelNotice(result.error?.message ?? 'Erro ao criar categoria')
        return
      }
      setCategories((prev) => [...prev, result.data as Category].sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryForm({ name: '', slug: '', description: '' })
      setPanelNotice('Categoria criada com sucesso')
    } catch {
      setPanelNotice('Erro ao criar categoria')
    } finally {
      setCategoryCreating(false)
    }
  }

  const cards = useMemo<KpiCard[]>(() => {
    const revenueValue = payload?.kpis.total_revenue ?? 0
    const ordersValue = payload?.kpis.total_orders ?? 0
    const customersValue = payload?.overview.customers_total ?? 0
    const productsValue = payload?.overview.products_total ?? catalogProducts.length

    return [
      {
        key: 'revenue',
        label: 'Faturamento mensal',
        value: formatCurrency(revenueValue),
        iconClass: 'bg-primary-100 text-primary-500',
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 15l5-5 4 4 7-7" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M14 7h6v6" />
          </svg>
        ),
      },
      {
        key: 'orders',
        label: 'Pedidos no mes',
        value: formatCompact(ordersValue),
        iconClass: 'bg-emerald-100 text-emerald-600',
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="4" y="5" width="16" height="15" rx="2" strokeWidth="1.8" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 3v4M16 3v4M8 11h8M8 15h5" />
          </svg>
        ),
      },
      {
        key: 'customers',
        label: 'Clientes ativos',
        value: formatCompact(customersValue),
        iconClass: 'bg-amber-100 text-amber-600',
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 11c1.657 0 3-1.79 3-4s-1.343-4-3-4-3 1.79-3 4 1.343 4 3 4zM8 11c1.657 0 3-1.79 3-4S9.657 3 8 3 5 4.79 5 7s1.343 4 3 4z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 20c0-2.761 2.239-5 5-5h1c2.761 0 5 2.239 5 5M14 15h2c2.761 0 5 2.239 5 5" />
          </svg>
        ),
      },
      {
        key: 'products',
        label: 'Produtos cadastrados',
        value: formatCompact(productsValue),
        iconClass: 'bg-violet-100 text-violet-600',
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 3l8 4.5-8 4.5-8-4.5L12 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 12l8 4.5 8-4.5M4 16.5L12 21l8-4.5" />
          </svg>
        ),
      },
    ]
  }, [payload])

  async function refreshProducts() {
    const response = await fetch('/api/products?limit=100', { credentials: 'include', cache: 'no-store' })
    const result = (await response.json()) as ProductsPayload
    if (!response.ok || result.error || !result.data) {
      throw new Error(result.error?.message ?? 'Nao foi possivel atualizar produtos')
    }
    setProducts(result.data.data)
  }

  async function refreshOrders() {
    const response = await fetch('/api/orders?limit=50', { credentials: 'include', cache: 'no-store' })
    const result = (await response.json()) as OrdersPayload
    if (!response.ok || result.error || !result.data) {
      throw new Error(result.error?.message ?? 'Nao foi possivel atualizar pedidos')
    }
    setOrders(result.data.data)
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordFeedback(null)

    const { currentPassword, newPassword, confirmPassword } = passwordForm

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'Preencha a senha atual, a nova senha e a confirmacao.',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'A confirmacao da nova senha nao confere.',
      })
      return
    }

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordFeedback({
        type: 'error',
        message: 'A nova senha deve ter pelo menos 8 caracteres, uma letra maiuscula e um numero.',
      })
      return
    }

    setPasswordLoading(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user?.email) {
        setPasswordFeedback({
          type: 'error',
          message: 'Sessao invalida. Entre novamente para alterar sua senha.',
        })
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (signInError) {
        setPasswordFeedback({
          type: 'error',
          message: 'A senha atual esta incorreta.',
        })
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        setPasswordFeedback({
          type: 'error',
          message: updateError.message || 'Nao foi possivel atualizar a senha.',
        })
        return
      }

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setPasswordFeedback({
        type: 'success',
        message: 'Senha atualizada com sucesso.',
      })
    } catch {
      setPasswordFeedback({
        type: 'error',
        message: 'Falha ao atualizar a senha.',
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  async function handleCreateProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (productCreating) return
    setPanelNotice(null)

    const priceValue = Number(productForm.price)
    if (!productForm.price || priceValue <= 0 || isNaN(priceValue)) {
      setPanelNotice('Informe um preco valido (maior que zero)')
      return
    }

    setProductCreating(true)
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productForm.name,
          sku: productForm.sku,
          description: productForm.description || undefined,
          image_url: productImageFile ? undefined : productForm.image_url || undefined,
          price: Number(productForm.price),
          promotional_price: productForm.promotional_price ? Number(productForm.promotional_price) : null,
          fragrance_notes: {
            top: [],
            heart: [],
            base: [],
            sizes: productSizes
              .filter((s) => s.ml && s.price)
              .map((s) => ({ ml: Number(s.ml), price: Number(s.price) })),
          },
          category_ids: selectedCategoryIds,
          is_active: true,
          initial_stock: Number(productForm.initial_stock || 0),
          low_stock_threshold: 5,
        }),
      })

      const result = (await response.json()) as ProductCreatePayload
      if (!response.ok || result.error) {
        throw new Error(result.error?.message ?? 'Nao foi possivel cadastrar produto')
      }

      let imageUploadError: string | null = null

      if (productImageFile && result.data?.id) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', productImageFile)

        const uploadResponse = await fetch(`/api/products/${result.data.id}/images`, {
          method: 'POST',
          credentials: 'include',
          body: uploadFormData,
        })
        const uploadResult = await uploadResponse.json()

        if (!uploadResponse.ok || uploadResult.error) {
          imageUploadError = uploadResult.error?.message ?? 'Upload da imagem falhou'
        }
      }

      setProductForm({
        name: '',
        sku: '',
        description: '',
        image_url: '',
        price: '',
        promotional_price: '',
        initial_stock: '',
      })
      setProductSizes([])
      setProductImageFile(null)
      setProductImagePreview('')
      setSelectedCategoryIds([])
      await refreshProducts()
      if (imageUploadError) {
        setPanelNotice(`Produto cadastrado, mas o upload da imagem falhou: ${imageUploadError}`)
      } else {
        setPanelNotice(productImageFile ? 'Produto e imagem cadastrados com sucesso' : 'Produto cadastrado com sucesso')
      }
    } catch (err) {
      setPanelNotice(err instanceof Error ? err.message : 'Erro ao cadastrar produto')
    } finally {
      setProductCreating(false)
    }
  }

  async function handleDeleteProduct(id: string) {
    setPanelNotice(null)
    try {
      const response = await fetch(`/api/products/${id}/destroy`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.error?.message ?? 'Nao foi possivel excluir produto')
      }
      if (selectedStockProductId === id) {
        setSelectedStockProductId(null)
      }
      await refreshProducts()
      setPanelNotice('Produto excluido com sucesso')
    } catch (err) {
      setPanelNotice(err instanceof Error ? err.message : 'Erro ao excluir produto')
    }
  }

  async function handleStartEdit(id: string) {
    setPanelNotice(null)
    try {
      const response = await fetch(`/api/products/${id}`, { credentials: 'include', cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || result.error) throw new Error(result.error?.message ?? 'Erro ao carregar produto')
      const p = result.data
      const primaryImage: string = (Array.isArray(p.images) ? p.images[0] : null) ?? ''
      setProductForm({
        name: p.name ?? '',
        sku: p.sku ?? '',
        description: p.description ?? '',
        image_url: primaryImage,
        price: p.price?.toString() ?? '',
        promotional_price: p.promotional_price?.toString() ?? '',
        initial_stock: '',
      })
      setEditProductActive(p.is_active ?? true)
      const existingSizes: { ml: number; price: number }[] = p.fragrance_notes?.sizes ?? []
      // Se produto não tem tamanhos configurados, pré-preenche com o preço atual como 100ml
      const initialSizes =
        existingSizes.length > 0
          ? existingSizes.map((s: { ml: number; price: number }) => ({ ml: String(s.ml), price: String(s.price) }))
          : [{ ml: '100', price: (p.promotional_price ?? p.price ?? '').toString() }]
      setProductSizes(initialSizes)
      setEditFragranceNotes({
        top: p.fragrance_notes?.top ?? [],
        heart: p.fragrance_notes?.heart ?? [],
        base: p.fragrance_notes?.base ?? [],
      })
      setSelectedCategoryIds(
        Array.isArray(p.categories) ? p.categories.map((c: { id: string }) => c.id) : []
      )
      setProductImageFile(null)
      setProductImagePreview(primaryImage)
      setEditingProductId(id)
    } catch (err) {
      setPanelNotice(err instanceof Error ? err.message : 'Erro ao carregar produto')
    }
  }

  function handleCancelEdit() {
    setEditingProductId(null)
    setProductForm({ name: '', sku: '', description: '', image_url: '', price: '', promotional_price: '', initial_stock: '' })
    setProductSizes([])
    setEditFragranceNotes({ top: [], heart: [], base: [] })
    setSelectedCategoryIds([])
    setProductImageFile(null)
    setProductImagePreview('')
  }

  async function handleUpdateProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingProductId || productSaving) return
    setPanelNotice(null)

    const priceValue = Number(productForm.price)
    if (!productForm.price || priceValue <= 0 || isNaN(priceValue)) {
      setPanelNotice('Informe um preco valido (maior que zero)')
      return
    }

    setProductSaving(true)
    try {
      const response = await fetch(`/api/products/${editingProductId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productForm.name,
          description: productForm.description || undefined,
          image_url: productImageFile ? undefined : productForm.image_url || undefined,
          price: Number(productForm.price),
          promotional_price: productForm.promotional_price ? Number(productForm.promotional_price) : null,
          is_active: editProductActive,
          category_ids: selectedCategoryIds,
          fragrance_notes: {
            top: editFragranceNotes.top,
            heart: editFragranceNotes.heart,
            base: editFragranceNotes.base,
            sizes: productSizes
              .filter((s) => s.ml && s.price)
              .map((s) => ({ ml: Number(s.ml), price: Number(s.price) })),
          },
        }),
      })

      const result = await response.json()
      if (!response.ok || result.error) throw new Error(result.error?.message ?? 'Erro ao atualizar produto')

      let imageUploadError: string | null = null
      if (productImageFile) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', productImageFile)
        const uploadResponse = await fetch(`/api/products/${editingProductId}/images`, {
          method: 'POST',
          credentials: 'include',
          body: uploadFormData,
        })
        const uploadResult = await uploadResponse.json()
        if (!uploadResponse.ok || uploadResult.error) {
          imageUploadError = uploadResult.error?.message ?? 'Upload da imagem falhou'
        }
      }

      handleCancelEdit()
      await refreshProducts()
      setPanelNotice(imageUploadError ? `Produto atualizado, mas o upload da imagem falhou: ${imageUploadError}` : 'Produto atualizado com sucesso')
    } catch (err) {
      setPanelNotice(err instanceof Error ? err.message : 'Erro ao atualizar produto')
    } finally {
      setProductSaving(false)
    }
  }

  async function handleAdjustInventory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedStockProduct) return

    setPanelNotice(null)

    try {
      const response = await fetch('/api/inventory', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedStockProduct.id,
          quantity_delta: Number(stockForm.quantity_delta),
          reason: 'admin_adjustment',
          notes: stockForm.notes || undefined,
          low_stock_threshold: stockForm.low_stock_threshold
            ? Number(stockForm.low_stock_threshold)
            : undefined,
        }),
      })

      const result = (await response.json()) as InventoryAdjustPayload
      if (!response.ok || result.error) {
        throw new Error(result.error?.message ?? 'Nao foi possivel ajustar estoque')
      }

      await refreshProducts()
      setStockForm({
        quantity_delta: '',
        low_stock_threshold: result.data?.low_stock_threshold?.toString() ?? '',
        notes: '',
      })
      setPanelNotice('Estoque atualizado com sucesso')
    } catch (err) {
      setPanelNotice(err instanceof Error ? err.message : 'Erro ao atualizar estoque')
    }
  }

  async function handleUpdateOrderStatus(id: string, status: string) {
    setPanelNotice(null)
    try {
      const response = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.error?.message ?? 'Nao foi possivel atualizar pedido')
      }
      await refreshOrders()
      setPanelNotice('Status do pedido atualizado')
    } catch (err) {
      setPanelNotice(err instanceof Error ? err.message : 'Erro ao atualizar pedido')
    }
  }

  async function handleSaveTracking(order: OrderRow) {
    const code = (trackingInputs[order.id] ?? order.shipping_tracking_code ?? '').trim()
    if (!code) return
    setTrackingSaving((p) => ({ ...p, [order.id]: true }))
    try {
      const res = await fetch(`/api/orders/${order.id}/tracking`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracking_code: code }),
      })
      const result = await res.json()
      if (!res.ok || result.error) throw new Error(result.error?.message ?? 'Erro ao salvar')
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, shipping_tracking_code: code } : o))
      )
      setPanelNotice(`Rastreio do pedido ${order.order_number ?? order.id.slice(0, 8)} salvo!`)
    } catch (err) {
      setPanelNotice(err instanceof Error ? err.message : 'Erro ao salvar rastreio')
    } finally {
      setTrackingSaving((p) => ({ ...p, [order.id]: false }))
    }
  }

  function openWhatsApp(order: OrderRow) {
    const phone = (order.customer_snapshot?.phone ?? '').replace(/\D/g, '')
    if (!phone) { setPanelNotice('Este cliente não tem telefone cadastrado.'); return }
    const code = trackingInputs[order.id] ?? order.shipping_tracking_code ?? ''
    const name = order.customer_snapshot?.full_name ?? 'cliente'
    const num = order.order_number ?? order.id.slice(0, 8)
    let msg: string
    if (code) {
      msg = `Olá ${name}! 🎉 Seu pedido *${num}* foi enviado!\n\n📦 *Código de rastreio:* ${code}\n\nAcompanhe seu pedido em: https://case-storefsa.vercel.app/conta`
    } else {
      msg = `Olá ${name}! Tudo bem? Estou entrando em contato sobre seu pedido *${num}*.`
    }
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const recentOrders = payload?.recent_orders ?? []
  const chartData = payload?.charts.revenue_over_time ?? []
  const topProducts = payload?.charts.top_products?.slice(0, 5) ?? []
  const maxRevenue = Math.max(...chartData.map((item) => item.revenue), 1)
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredProducts = products.filter((product) => {
    if (!normalizedSearch) return true

    return [
      product.name,
      product.sku,
      ...(product.categories?.map((category) => category.name) ?? []),
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch)
  })
  const filteredOrders = orders.filter((order) => {
    if (!normalizedSearch) return true

    return [
      order.order_number ?? '',
      order.id,
      order.customer_snapshot?.full_name ?? '',
      order.payment_status,
      order.status,
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch)
  })
  const filteredCustomers = customers.filter((customer) => {
    if (!normalizedSearch) return true

    return [
      customer.full_name,
      customer.email,
      customer.phone ?? '',
      customer.cpf ?? '',
      customer.default_address?.city ?? '',
      customer.default_address?.state ?? '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch)
  })
  const selectedCustomer =
    filteredCustomers.find((customer) => customer.id === selectedCustomerId) ??
    filteredCustomers[0] ??
    null
  const customerMetrics = {
    total: filteredCustomers.length,
    withOrders: filteredCustomers.filter((customer) => customer.total_orders > 0).length,
    withAddress: filteredCustomers.filter((customer) => customer.default_address).length,
    revenue: filteredCustomers.reduce((sum, customer) => sum + customer.total_spent, 0),
  }
  const selectedStockProduct = products.find((product) => product.id === selectedStockProductId) ?? null
  const searchPlaceholder =
    activeSection === 'customers'
      ? 'Buscar cliente, email ou cidade...'
      : activeSection === 'products'
        ? 'Buscar produto, SKU ou categoria...'
      : activeSection === 'orders'
          ? 'Buscar pedido, cliente ou status...'
          : 'Buscar...'

  async function prepareProductImage(file: File | null) {
    if (!file) {
      setProductImageFile(null)
      return
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    const isHeicFamily =
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      extension === 'heic' ||
      extension === 'heif'

    if (!isHeicFamily) {
      setProductImageFile(file)
      return
    }

    try {
      const heic2anyModule = await import('heic2any')
      const heic2any = heic2anyModule.default
      const output = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.92,
      })

      const convertedBlob = Array.isArray(output) ? output[0] : output
      const baseName = file.name.replace(/\.(heic|heif)$/i, '')
      const convertedFile = new File(
        [convertedBlob as BlobPart],
        `${baseName}.jpg`,
        { type: 'image/jpeg' }
      )

      setProductImageFile(convertedFile)
      setPanelNotice('Imagem HEIC convertida para JPG automaticamente')
    } catch (error) {
      console.error('[admin] heic preview conversion failed', error)
      setPanelNotice('Nao foi possivel converter a imagem HEIC para preview. Tente outra imagem.')
      setProductImageFile(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8] pb-16 pt-20 text-neutral-900">
      <div className="flex min-h-[calc(100vh-5rem)]">
        <aside className="hidden w-[270px] border-r border-[#ececf3] bg-[#1f2038] text-white xl:flex xl:flex-col">
          <div className="border-b border-white/10 px-5 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500 font-semibold">
                EF
              </div>
              <div>
                <p className="font-semibold">Case Store</p>
                <p className="text-xs text-white/60">Painel de controle</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-6">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
              Menu
            </p>
            <nav className="mt-4 space-y-1.5">
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveSection(item.key)
                    setPanelNotice(null)
                    setSearchQuery('')
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                    item.key === activeSection
                      ? 'bg-primary-500 font-semibold text-white shadow-glow'
                      : 'text-white/75 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.key === 'orders' && payload?.kpis.pending_orders ? (
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px]">
                      {payload.kpis.pending_orders}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex-1">
          <div className="border-b border-[#ececf3] bg-white/80 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Dashboard
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
                  {sectionTitles[activeSection]}
                </h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-11 items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-4 text-neutral-400">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                  </svg>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400 sm:min-w-[210px]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button className="relative rounded-full border border-neutral-200 bg-white p-2.5 text-neutral-500">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.4-1.4A1.98 1.98 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
                    </svg>
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary-500" />
                  </button>

                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white">
                    A
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-6 sm:px-6 lg:px-8">
            {loading ? (
              <div className="rounded-[28px] border border-neutral-200 bg-white p-8 shadow-soft">
                Carregando painel...
              </div>
            ) : null}

            {!loading && error ? (
              <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-8 shadow-soft">
                <h2 className="text-2xl font-semibold text-neutral-900">Painel indisponivel</h2>
                <p className="mt-2 text-neutral-600">{error}</p>
                {statusCode === 401 ? (
                  <div className="mt-6">
                    <Link href="/login?redirect=/admin" className="btn-primary">
                      Entrar como admin
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}

            {!loading && !error ? (
              <div className="space-y-6">
                {panelNotice ? (
                  <div className="rounded-[22px] border border-primary-100 bg-primary-50 px-5 py-4 text-sm text-primary-700">
                    {panelNotice}
                  </div>
                ) : null}

                {activeSection === 'dashboard' ? (
                <section className="grid gap-4 xl:grid-cols-4">
                  {cards.map((card) => (
                    <article
                      key={card.key}
                      className="rounded-[24px] border border-neutral-100 bg-white px-5 py-4 shadow-soft"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconClass}`}>
                          {card.icon}
                        </div>
                        <div>
                          <p className="text-3xl font-semibold text-neutral-900">{card.value}</p>
                          <p className="text-sm text-neutral-400">{card.label}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </section>
                ) : null}

                {activeSection === 'dashboard' ? (
                <section className="rounded-[28px] border border-neutral-100 bg-white shadow-soft">
                  <div className="flex flex-col gap-4 border-b border-neutral-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-neutral-900">Pedidos recentes</h2>
                      <p className="mt-1 text-sm text-neutral-400">
                        Acompanhamento rapido dos ultimos pedidos registrados.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveSection('orders')}
                      className="inline-flex items-center justify-center rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white"
                    >
                      + Novo pedido
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    {recentOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
                        <svg className="h-10 w-10 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <rect x="4" y="5" width="16" height="15" rx="2" strokeWidth="1.5" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 3v4M16 3v4M8 11h8M8 15h5" />
                        </svg>
                        <p className="text-sm font-medium">Nenhum pedido registrado ainda.</p>
                      </div>
                    ) : (
                      <table className="min-w-full text-left">
                        <thead>
                          <tr className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                            <th className="px-6 py-4 font-semibold"># Cliente</th>
                            <th className="px-6 py-4 font-semibold">Produto</th>
                            <th className="px-6 py-4 font-semibold">Total</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 text-right font-semibold">Acoes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentOrders.map((order) => {
                            const status = normalizeStatus(order.status)
                            return (
                              <tr key={order.id} className="border-t border-neutral-100">
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-neutral-900">{order.order_number}</div>
                                  <div className="text-sm text-neutral-400">{order.customer_name}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-neutral-600">{order.product_name}</td>
                                <td className="px-6 py-4 font-semibold text-neutral-900">
                                  {formatCurrency(order.total)}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                                    {status.label}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex justify-end gap-2 text-neutral-400">
                                    <button
                                      title="Ver pedido"
                                      onClick={() => { setActiveSection('orders'); setSearchQuery(order.order_number) }}
                                      className="rounded-full p-2 hover:bg-neutral-100 hover:text-neutral-700"
                                    >
                                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                                        <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
                                      </svg>
                                    </button>
                                    <button
                                      title="Gerenciar pedido"
                                      onClick={() => { setActiveSection('orders'); setSearchQuery(order.order_number) }}
                                      className="rounded-full p-2 hover:bg-neutral-100 hover:text-neutral-700"
                                    >
                                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 20h4l10.5-10.5a2.121 2.121 0 10-3-3L5.5 17v3z" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </section>
                ) : null}

                {activeSection === 'dashboard' ? (
                <section className="grid gap-6 xl:grid-cols-[1.7fr_0.8fr]">
                  <article className="rounded-[28px] border border-neutral-100 bg-white p-6 shadow-soft">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-neutral-900">Vendas dos ultimos 7 dias</h2>
                        <p className="mt-1 text-sm text-neutral-400">
                          Leitura visual do desempenho recente da operacao.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveSection('reports')}
                        className="text-sm font-semibold text-primary-500 hover:underline"
                      >
                        Ver relatorio →
                      </button>
                    </div>

                    {chartData.length === 0 ? (
                      <div className="mt-8 flex h-[220px] flex-col items-center justify-center text-neutral-400">
                        <svg className="h-10 w-10 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 15l5-5 4 4 7-7" />
                        </svg>
                        <p className="text-sm font-medium">Nenhuma venda nos ultimos 7 dias.</p>
                      </div>
                    ) : (
                      <div className="mt-8 grid h-[220px] grid-cols-7 items-end gap-3">
                        {chartData.map((item, index) => {
                          const height = Math.max(26, Math.round((item.revenue / maxRevenue) * 160))
                          const isHighlight = index === 3 || index === 5
                          return (
                            <div key={`${item.date}-${index}`} className="flex flex-col items-center gap-3">
                              <span className="text-[11px] font-medium text-neutral-400">
                                {item.revenue > 0 ? formatCurrency(item.revenue) : ''}
                              </span>
                              <div
                                className={`w-full rounded-t-[18px] transition-all ${
                                  isHighlight ? 'bg-primary-500' : 'bg-primary-100'
                                }`}
                                style={{ height }}
                              />
                              <span className="text-sm text-neutral-400">
                                {typeof item.date === 'string' && item.date.length <= 3
                                  ? item.date
                                  : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'][index] ?? item.date}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </article>

                  <article className="rounded-[28px] border border-neutral-100 bg-white p-6 shadow-soft">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-neutral-900">Top produtos</h2>
                        <p className="mt-1 text-sm text-neutral-400">Este mes</p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-300">
                        Ranking
                      </span>
                    </div>

                    <div className="mt-6 space-y-4">
                      {topProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-neutral-400">
                          <svg className="h-8 w-8 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3l8 4.5-8 4.5-8-4.5L12 3z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 12l8 4.5 8-4.5M4 16.5L12 21l8-4.5" />
                          </svg>
                          <p className="text-xs font-medium text-center">Sem vendas registradas este mes.</p>
                        </div>
                      ) : (
                        topProducts.map((item, index) => (
                          <div key={item.product_id} className="flex items-start gap-4">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-500">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-neutral-900">{item.product_name}</p>
                              <p className="text-sm text-neutral-400">{item.sku}</p>
                            </div>
                            <div className="text-right text-sm font-semibold text-neutral-900">
                              {formatCurrency(item.total_revenue)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </article>
                </section>
                ) : null}

                {activeSection === 'products' ? (
                  <section className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
                    <article className="rounded-[28px] border border-neutral-100 bg-white p-6 shadow-soft">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-semibold text-neutral-900">
                            {editingProductId ? 'Editar produto' : 'Novo produto'}
                          </h2>
                          <p className="mt-1 text-sm text-neutral-400">
                            {editingProductId ? 'Altere os campos e salve as mudancas.' : 'Cadastro basico para alimentar a vitrine e o painel.'}
                          </p>
                        </div>
                        {editingProductId ? (
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
                          >
                            Cancelar
                          </button>
                        ) : null}
                      </div>

                      <form className="mt-6 space-y-4" onSubmit={editingProductId ? handleUpdateProduct : handleCreateProduct}>
                        <input
                          value={productForm.name}
                          onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                          className="w-full rounded-2xl border border-neutral-200 px-4 py-3"
                          placeholder="Nome do produto"
                          required
                        />
                        <input
                          value={productForm.sku}
                          onChange={(event) => setProductForm((prev) => ({ ...prev, sku: event.target.value }))}
                          className={`w-full rounded-2xl border border-neutral-200 px-4 py-3 ${editingProductId ? 'bg-neutral-50 text-neutral-400' : ''}`}
                          placeholder="SKU"
                          required={!editingProductId}
                          readOnly={!!editingProductId}
                        />
                        <textarea
                          value={productForm.description}
                          onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
                          className="min-h-[110px] w-full rounded-2xl border border-neutral-200 px-4 py-3"
                          placeholder="Descricao"
                        />
                        <input
                          value={productForm.image_url}
                          onChange={(event) => setProductForm((prev) => ({ ...prev, image_url: event.target.value }))}
                          className="w-full rounded-2xl border border-neutral-200 px-4 py-3"
                          placeholder="URL da imagem ou /images/produto.jpg"
                        />
                        <div className="rounded-[24px] border border-dashed border-neutral-300 bg-neutral-50 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-neutral-800">
                                Upload da imagem
                              </p>
                              <p className="mt-1 text-xs text-neutral-500">
                                Escolha um arquivo do computador. Se enviar arquivo, ele tem prioridade sobre a URL.
                              </p>
                            </div>
                            <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
                              Selecionar imagem
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp,image/avif,image/heic,image/heif,.heic,.heif"
                                className="hidden"
                                onChange={async (event) => {
                                  const nextFile = event.target.files?.[0] ?? null
                                  await prepareProductImage(nextFile)
                                }}
                              />
                            </label>
                          </div>
                          {productImageFile ? (
                            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-neutral-600">
                              <span className="truncate">{productImageFile.name}</span>
                              <button
                                type="button"
                                onClick={() => setProductImageFile(null)}
                                className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700"
                              >
                                Remover
                              </button>
                            </div>
                          ) : null}
                        </div>
                        {productImagePreview ? (
                          <div className="overflow-hidden rounded-[24px] border border-neutral-200 bg-neutral-50 p-3">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                              Preview da imagem
                            </p>
                            <div className="overflow-hidden rounded-[20px] bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={productImagePreview}
                                alt="Preview do produto"
                                className="h-56 w-full object-cover"
                              />
                            </div>
                          </div>
                        ) : null}
                        <div className={`grid gap-4 ${editingProductId ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={productForm.price}
                            onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))}
                            className="rounded-2xl border border-neutral-200 px-4 py-3"
                            placeholder="Preco"
                            required
                            disabled={productCreating || productSaving}
                          />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={productForm.promotional_price}
                            onChange={(event) => setProductForm((prev) => ({ ...prev, promotional_price: event.target.value }))}
                            className="rounded-2xl border border-neutral-200 px-4 py-3"
                            placeholder="Promo"
                          />
                          {!editingProductId ? (
                            <input
                              type="number"
                              min="0"
                              value={productForm.initial_stock}
                              onChange={(event) => setProductForm((prev) => ({ ...prev, initial_stock: event.target.value }))}
                              className="rounded-2xl border border-neutral-200 px-4 py-3"
                              placeholder="Estoque"
                            />
                          ) : null}
                        </div>
                        <div className="rounded-[24px] border border-neutral-200 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-semibold text-neutral-800">Tamanhos disponíveis</p>
                            <button
                              type="button"
                              onClick={() => setProductSizes((prev) => [...prev, { ml: '', price: '' }])}
                              className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              + Adicionar
                            </button>
                          </div>
                          {productSizes.length === 0 ? (
                            <p className="text-xs text-neutral-400">Nenhum tamanho adicionado. O produto usará o preço principal como tamanho padrão (100 ml).</p>
                          ) : null}
                          <div className="space-y-2">
                            {productSizes.map((size, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={size.ml}
                                  onChange={(event) =>
                                    setProductSizes((prev) =>
                                      prev.map((item, i) => (i === index ? { ...item, ml: event.target.value } : item))
                                    )
                                  }
                                  className="w-28 rounded-2xl border border-neutral-200 px-3 py-2.5 text-sm"
                                  placeholder="ml (ex: 25)"
                                />
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={size.price}
                                  onChange={(event) =>
                                    setProductSizes((prev) =>
                                      prev.map((item, i) => (i === index ? { ...item, price: event.target.value } : item))
                                    )
                                  }
                                  className="flex-1 rounded-2xl border border-neutral-200 px-3 py-2.5 text-sm"
                                  placeholder="Preço (ex: 80.00)"
                                />
                                <button
                                  type="button"
                                  onClick={() => setProductSizes((prev) => prev.filter((_, i) => i !== index))}
                                  className="rounded-full border border-neutral-200 px-3 py-2.5 text-xs font-semibold text-neutral-500 hover:border-rose-200 hover:text-rose-500"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        {categories.length > 0 ? (
                          <div className="rounded-[24px] border border-neutral-200 p-4">
                            <p className="mb-3 text-sm font-semibold text-neutral-800">Categoria</p>
                            <div className="flex flex-wrap gap-2">
                              {categories.map((cat) => {
                                const selected = selectedCategoryIds.includes(cat.id)
                                return (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => toggleCategoryId(cat.id)}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                      selected
                                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                                    }`}
                                  >
                                    {cat.name}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ) : null}

                        {editingProductId ? (
                          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-200 px-4 py-3">
                            <input
                              type="checkbox"
                              checked={editProductActive}
                              onChange={(event) => setEditProductActive(event.target.checked)}
                              className="h-4 w-4 accent-primary-500"
                            />
                            <span className="text-sm font-medium text-neutral-700">Produto ativo (visivel na vitrine)</span>
                          </label>
                        ) : null}
                        <button
                          type="submit"
                          className="btn-primary w-full disabled:opacity-60"
                          disabled={productCreating || productSaving}
                        >
                          {editingProductId
                            ? (productSaving ? 'Salvando...' : 'Salvar alteracoes')
                            : (productCreating ? 'Cadastrando...' : 'Cadastrar produto')}
                        </button>
                      </form>
                    </article>

                    <article className="rounded-[28px] border border-neutral-100 bg-white p-6 shadow-soft">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-semibold text-neutral-900">Produtos</h2>
                          <p className="mt-1 text-sm text-neutral-400">Lista administravel do catalogo.</p>
                        </div>
                        {productsLoading ? <span className="text-sm text-neutral-400">Atualizando...</span> : null}
                      </div>

                      <div className="mt-6 rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">Estoque operacional</p>
                            <p className="mt-1 text-xs text-neutral-500">
                              Selecione um produto na lista para ajustar entrada ou saida manual.
                            </p>
                          </div>
                          {selectedStockProduct ? (
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700">
                              {selectedStockProduct.name} · {selectedStockProduct.inventory?.available_stock ?? 0} un.
                            </span>
                          ) : null}
                        </div>

                        {selectedStockProduct ? (
                          <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr_auto]" onSubmit={handleAdjustInventory}>
                            <input
                              type="number"
                              value={stockForm.quantity_delta}
                              onChange={(event) => setStockForm((prev) => ({ ...prev, quantity_delta: event.target.value }))}
                              className="rounded-2xl border border-neutral-200 bg-white px-4 py-3"
                              placeholder="Delta de estoque (+10 ou -2)"
                              required
                            />
                            <input
                              type="number"
                              min="0"
                              value={stockForm.low_stock_threshold}
                              onChange={(event) => setStockForm((prev) => ({ ...prev, low_stock_threshold: event.target.value }))}
                              className="rounded-2xl border border-neutral-200 bg-white px-4 py-3"
                              placeholder="Alerta minimo"
                            />
                            <input
                              value={stockForm.notes}
                              onChange={(event) => setStockForm((prev) => ({ ...prev, notes: event.target.value }))}
                              className="rounded-2xl border border-neutral-200 bg-white px-4 py-3"
                              placeholder="Observacao do ajuste"
                            />
                            <button type="submit" className="rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white">
                              Salvar estoque
                            </button>
                          </form>
                        ) : null}
                      </div>

                      <div className="mt-6 overflow-x-auto">
                        <table className="min-w-full text-left">
                          <thead>
                            <tr className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                              <th className="px-4 py-3">Produto</th>
                              <th className="px-4 py-3">SKU</th>
                              <th className="px-4 py-3">Preco</th>
                              <th className="px-4 py-3">Estoque</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Acoes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredProducts.map((product: ProductRow) => (
                              <tr key={product.id} className="border-t border-neutral-100">
                                <td className="px-4 py-4">
                                  <span className="font-medium text-neutral-900">{product.name}</span>
                                  {Array.isArray(product.categories) && product.categories.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {(product.categories as { id: string; name: string }[]).map((cat) => (
                                        <span key={cat.id} className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                                          {cat.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-sm text-neutral-500">{product.sku}</td>
                                <td className="px-4 py-4 font-semibold text-neutral-900">{formatCurrency(product.price)}</td>
                                <td className="px-4 py-4 text-sm text-neutral-500">{product.inventory?.available_stock ?? 0}</td>
                                <td className="px-4 py-4">
                                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                                    {product.is_active ? 'Ativo' : 'Inativo'}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(product.id)}
                                      className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedStockProductId(product.id)
                                        setStockForm({
                                          quantity_delta: '',
                                          low_stock_threshold: '',
                                          notes: '',
                                        })
                                      }}
                                      className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700"
                                    >
                                      Estoque
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteProduct(product.id)}
                                      className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {!productsLoading && filteredProducts.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-400">
                                  Nenhum produto cadastrado ainda.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  </section>
                ) : null}

                {activeSection === 'orders' ? (
                  <section className="rounded-[28px] border border-neutral-100 bg-white p-6 shadow-soft">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-neutral-900">Pedidos</h2>
                        <p className="mt-1 text-sm text-neutral-400">Atualize o status, código de rastreio e converse pelo WhatsApp.</p>
                      </div>
                      {ordersLoading ? <span className="text-sm text-neutral-400">Atualizando...</span> : null}
                    </div>

                    <div className="mt-6 space-y-4">
                      {!ordersLoading && filteredOrders.length === 0 ? (
                        <p className="py-8 text-center text-sm text-neutral-400">Nenhum pedido encontrado.</p>
                      ) : null}

                      {filteredOrders.map((order: OrderRow) => {
                        const phone = (order.customer_snapshot?.phone ?? '').replace(/\D/g, '')
                        const currentTracking = trackingInputs[order.id] ?? order.shipping_tracking_code ?? ''
                        const isSaving = trackingSaving[order.id] ?? false
                        return (
                          <div key={order.id} className="rounded-2xl border border-neutral-100 p-5">
                            {/* Linha principal */}
                            <div className="flex flex-wrap items-start gap-4">
                              <div className="min-w-[130px]">
                                <p className="font-semibold text-neutral-900">{order.order_number ?? order.id.slice(0, 8)}</p>
                                <p className="mt-0.5 text-xs text-neutral-400">{order.payment_status}</p>
                              </div>
                              <div className="min-w-[120px]">
                                <p className="text-sm font-medium text-neutral-700">{order.customer_snapshot?.full_name ?? 'Cliente'}</p>
                                {phone ? (
                                  <p className="mt-0.5 text-xs text-neutral-400">{order.customer_snapshot?.phone}</p>
                                ) : (
                                  <p className="mt-0.5 text-xs text-rose-400">Sem telefone</p>
                                )}
                              </div>
                              <div className="min-w-[80px]">
                                <p className="font-bold text-neutral-900">{formatCurrency(Number(order.total ?? order.total_amount ?? 0))}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${normalizeStatus(order.status).className}`}>
                                  {normalizeStatus(order.status).label}
                                </span>
                              </div>
                              {/* Botões de status */}
                              <div className="ml-auto flex flex-wrap gap-2">
                                {(['pago', 'enviado', 'entregue'] as const).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => handleUpdateOrderStatus(order.id, s)}
                                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${order.status === s ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-neutral-200 text-neutral-700 hover:border-primary-300 hover:text-primary-600'}`}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Linha de rastreio + WhatsApp */}
                            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-4">
                              <div className="flex flex-1 items-center gap-2 min-w-[220px]">
                                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-400">Rastreio</span>
                                <input
                                  type="text"
                                  value={currentTracking}
                                  onChange={(e) => setTrackingInputs((p) => ({ ...p, [order.id]: e.target.value }))}
                                  placeholder="Ex: BR123456789BR"
                                  className="flex-1 rounded-xl border border-neutral-200 px-3 py-1.5 text-sm focus:border-primary-400 focus:outline-none"
                                />
                                <button
                                  onClick={() => handleSaveTracking(order)}
                                  disabled={isSaving || !currentTracking}
                                  className="rounded-xl bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-40"
                                >
                                  {isSaving ? 'Salvando...' : 'Salvar'}
                                </button>
                              </div>

                              {/* Botão WhatsApp */}
                              <button
                                onClick={() => openWhatsApp(order)}
                                className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1ebe5c]"
                                title={phone ? `Enviar WhatsApp para ${order.customer_snapshot?.phone}` : 'Cliente sem telefone cadastrado'}
                              >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                WhatsApp
                                {!phone && <span className="ml-1 opacity-60">(sem tel.)</span>}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ) : null}

                {activeSection === 'customers' ? (
                  <section className="space-y-6">
                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        {
                          key: 'customers-total',
                          label: 'Clientes exibidos',
                          value: formatCompact(customerMetrics.total),
                          tone: 'bg-primary-100 text-primary-600',
                        },
                        {
                          key: 'customers-orders',
                          label: 'Com pedidos',
                          value: formatCompact(customerMetrics.withOrders),
                          tone: 'bg-emerald-100 text-emerald-600',
                        },
                        {
                          key: 'customers-address',
                          label: 'Com endereco salvo',
                          value: formatCompact(customerMetrics.withAddress),
                          tone: 'bg-amber-100 text-amber-600',
                        },
                        {
                          key: 'customers-revenue',
                          label: 'Receita confirmada',
                          value: formatCurrency(customerMetrics.revenue),
                          tone: 'bg-violet-100 text-violet-600',
                        },
                      ].map((card) => (
                        <article
                          key={card.key}
                          className="rounded-[24px] border border-neutral-100 bg-white px-5 py-4 shadow-soft"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.tone}`}>
                              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.8"
                                  d="M12 5v14M5 12h14"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="text-3xl font-semibold text-neutral-900">{card.value}</p>
                              <p className="text-sm text-neutral-400">{card.label}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </section>

                    <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
                      <article className="rounded-[28px] border border-neutral-100 bg-white p-6 shadow-soft">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h2 className="text-xl font-semibold text-neutral-900">Clientes</h2>
                            <p className="mt-1 text-sm text-neutral-400">
                              Base de clientes com resumo de compras e endereco principal.
                            </p>
                          </div>
                          {customersLoading ? <span className="text-sm text-neutral-400">Atualizando...</span> : null}
                        </div>

                        <div className="mt-6 overflow-hidden rounded-[24px] border border-neutral-100">
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                              <thead>
                                <tr className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                                  <th className="px-4 py-3">Cliente</th>
                                  <th className="px-4 py-3">Contato</th>
                                  <th className="px-4 py-3">Pedidos</th>
                                  <th className="px-4 py-3">Ultima compra</th>
                                  <th className="px-4 py-3 text-right">Receita</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredCustomers.map((customer) => {
                                  const isSelected = customer.id === selectedCustomer?.id
                                  return (
                                    <tr
                                      key={customer.id}
                                      onClick={() => setSelectedCustomerId(customer.id)}
                                      className={`cursor-pointer border-t border-neutral-100 transition hover:bg-neutral-50 ${
                                        isSelected ? 'bg-neutral-50' : ''
                                      }`}
                                    >
                                      <td className="px-4 py-4">
                                        <div className="font-semibold text-neutral-900">{customer.full_name}</div>
                                        <div className="text-sm text-neutral-400">
                                          Cliente desde {formatDateTime(customer.created_at)}
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-sm text-neutral-500">
                                        <div>{customer.email || 'Sem e-mail sincronizado'}</div>
                                        <div>{customer.phone || 'Sem telefone'}</div>
                                      </td>
                                      <td className="px-4 py-4">
                                        <div className="font-semibold text-neutral-900">
                                          {formatCompact(customer.total_orders)}
                                        </div>
                                        <div className="text-sm text-neutral-400">
                                          {formatCompact(customer.paid_orders)} pagos
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-sm text-neutral-500">
                                        {customer.last_order_at ? formatDateTime(customer.last_order_at) : 'Sem pedidos'}
                                      </td>
                                      <td className="px-4 py-4 text-right font-semibold text-neutral-900">
                                        {formatCurrency(customer.total_spent)}
                                      </td>
                                    </tr>
                                  )
                                })}

                                {!customersLoading && filteredCustomers.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-neutral-400">
                                      Nenhum cliente encontrado para o filtro atual.
                                    </td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </article>

                      <article className="rounded-[28px] border border-neutral-100 bg-white p-6 shadow-soft">
                        {selectedCustomer ? (
                          <div className="space-y-6">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-500">
                                Cliente selecionado
                              </p>
                              <h2 className="mt-2 text-2xl font-semibold text-neutral-900">
                                {selectedCustomer.full_name}
                              </h2>
                              <p className="mt-2 text-sm text-neutral-500">
                                {selectedCustomer.email || 'Sem e-mail sincronizado'}
                              </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-[22px] border border-neutral-100 bg-neutral-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                                  Telefone
                                </p>
                                <p className="mt-2 text-sm font-medium text-neutral-900">
                                  {selectedCustomer.phone || 'Nao informado'}
                                </p>
                              </div>
                              <div className="rounded-[22px] border border-neutral-100 bg-neutral-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                                  CPF
                                </p>
                                <p className="mt-2 text-sm font-medium text-neutral-900">
                                  {selectedCustomer.cpf || 'Nao informado'}
                                </p>
                              </div>
                              <div className="rounded-[22px] border border-neutral-100 bg-neutral-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                                  Pedidos
                                </p>
                                <p className="mt-2 text-sm font-medium text-neutral-900">
                                  {formatCompact(selectedCustomer.total_orders)} pedidos
                                </p>
                              </div>
                              <div className="rounded-[22px] border border-neutral-100 bg-neutral-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                                  Receita
                                </p>
                                <p className="mt-2 text-sm font-medium text-neutral-900">
                                  {formatCurrency(selectedCustomer.total_spent)}
                                </p>
                              </div>
                            </div>

                            <div className="rounded-[24px] border border-neutral-100 bg-neutral-50 p-5">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">
                                    Endereco principal
                                  </h3>
                                  <p className="mt-2 text-base font-semibold text-neutral-900">
                                    {selectedCustomer.default_address?.label || 'Endereco padrao'}
                                  </p>
                                </div>
                                {selectedCustomer.default_address?.is_default ? (
                                  <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-600">
                                    Padrao
                                  </span>
                                ) : null}
                              </div>

                              {selectedCustomer.default_address ? (
                                <div className="mt-4 space-y-1 text-sm text-neutral-600">
                                  <p>
                                    {selectedCustomer.default_address.street}, {selectedCustomer.default_address.number}
                                  </p>
                                  {selectedCustomer.default_address.complement ? (
                                    <p>{selectedCustomer.default_address.complement}</p>
                                  ) : null}
                                  <p>
                                    {selectedCustomer.default_address.neighborhood} - {selectedCustomer.default_address.city}/{selectedCustomer.default_address.state}
                                  </p>
                                  <p>CEP {selectedCustomer.default_address.zip_code}</p>
                                </div>
                              ) : (
                                <p className="mt-4 text-sm text-neutral-500">
                                  Este cliente ainda nao cadastrou endereco.
                                </p>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center justify-between gap-4">
                                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-400">
                                  Ultimos pedidos
                                </h3>
                                <span className="text-xs font-semibold text-neutral-400">
                                  {formatCompact(selectedCustomer.paid_orders)} pagos
                                </span>
                              </div>

                              <div className="mt-4 space-y-3">
                                {selectedCustomer.recent_orders.map((order) => (
                                  <div
                                    key={order.id}
                                    className="rounded-[22px] border border-neutral-100 bg-white px-4 py-3"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="font-semibold text-neutral-900">
                                          Pedido {order.id.slice(0, 8)}
                                        </p>
                                        <p className="mt-1 text-sm text-neutral-500">
                                          {formatDateTime(order.created_at)}
                                        </p>
                                      </div>
                                      <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${normalizeStatus(order.status).className}`}
                                      >
                                        {normalizeStatus(order.status).label}
                                      </span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
                                      <span>Pagamento: {order.payment_status}</span>
                                      <span className="font-semibold text-neutral-900">
                                        {formatCurrency(order.total)}
                                      </span>
                                    </div>
                                  </div>
                                ))}

                                {selectedCustomer.recent_orders.length === 0 ? (
                                  <div className="rounded-[22px] border border-dashed border-neutral-200 px-4 py-5 text-sm text-neutral-500">
                                    Nenhum pedido registrado para este cliente.
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-full min-h-[420px] items-center justify-center rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 text-center text-sm text-neutral-500">
                            Selecione um cliente na lista para visualizar detalhes e historico.
                          </div>
                        )}
                      </article>
                    </section>
                  </section>
                ) : null}

                {activeSection === 'settings' ? (
                  <section className="space-y-6">
                  {/* Toggle de Promoção */}
                  <article className="rounded-[28px] border border-neutral-100 bg-white p-6 shadow-soft">
                    <div className="flex items-center justify-between gap-6">
                      <div>
                        <h2 className="text-lg font-semibold text-neutral-900">Secao de Promocao</h2>
                        <p className="mt-1 text-sm text-neutral-500">
                          Quando ativado, exibe o banner de oferta especial na pagina inicial.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleTogglePromo}
                        disabled={promoLoading}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${promoEnabled ? 'bg-primary-500' : 'bg-neutral-200'}`}
                        aria-label="Toggle promocao"
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${promoEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                    <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${promoEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-50 text-neutral-500'}`}>
                      {promoEnabled
                        ? 'Promocao ativa — o banner aparece na pagina inicial.'
                        : 'Promocao inativa — o banner esta oculto na pagina inicial.'}
                    </div>
                  </article>

                  <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <article className="rounded-[28px] border border-neutral-100 bg-white p-8 shadow-soft">
                      <span className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-500">
                        Seguranca
                      </span>
                      <h2 className="mt-4 text-2xl font-semibold text-neutral-900">
                        Alterar senha do admin
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-neutral-500">
                        Atualize a senha da sua conta com validacao da senha atual.
                        A autenticacao deste painel e feita pelo Supabase Auth.
                      </p>

                      <div className="mt-6 rounded-[24px] border border-neutral-200 bg-neutral-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                          Conta conectada
                        </p>
                        <p className="mt-2 text-sm font-medium text-neutral-800">
                          {adminEmail ?? 'Carregando e-mail da conta...'}
                        </p>
                      </div>

                      <div className="mt-6 space-y-4">
                        {[
                          'Informe a senha atual para confirmar sua identidade.',
                          'A nova senha deve ter ao menos 8 caracteres, 1 letra maiuscula e 1 numero.',
                          'Depois da troca, continue usando o mesmo e-mail para entrar no admin.',
                        ].map((item) => (
                          <div
                            key={item}
                            className="rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-600"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="rounded-[28px] border border-neutral-100 bg-white p-8 shadow-soft">
                      <h2 className="text-xl font-semibold text-neutral-900">
                        Atualizacao de senha
                      </h2>
                      <p className="mt-2 text-sm text-neutral-500">
                        Use esta opcao quando ja estiver logado no painel administrativo.
                      </p>

                      <form className="mt-6 space-y-4" onSubmit={handleChangePassword}>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-neutral-700">
                            Senha atual
                          </span>
                          <input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(event) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                currentPassword: event.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                            placeholder="Digite sua senha atual"
                            autoComplete="current-password"
                            required
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-neutral-700">
                            Nova senha
                          </span>
                          <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(event) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                newPassword: event.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                            placeholder="Nova senha"
                            autoComplete="new-password"
                            required
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-neutral-700">
                            Confirmar nova senha
                          </span>
                          <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(event) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                confirmPassword: event.target.value,
                              }))
                            }
                            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                            placeholder="Repita a nova senha"
                            autoComplete="new-password"
                            required
                          />
                        </label>

                        {passwordFeedback ? (
                          <div
                            className={`rounded-2xl px-4 py-3 text-sm ${
                              passwordFeedback.type === 'success'
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border border-rose-200 bg-rose-50 text-rose-700'
                            }`}
                          >
                            {passwordFeedback.message}
                          </div>
                        ) : null}

                        <button
                          type="submit"
                          className="btn-primary w-full"
                          disabled={passwordLoading}
                        >
                          {passwordLoading ? 'Atualizando senha...' : 'Salvar nova senha'}
                        </button>
                      </form>
                    </article>
                  </section>
                  </section>
                ) : null}

                {activeSection === 'categories' ? (
                  <section className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
                    <article className="rounded-[28px] border border-neutral-100 bg-white p-6 shadow-soft">
                      <h2 className="text-xl font-semibold text-neutral-900">Nova categoria</h2>
                      <p className="mt-1 text-sm text-neutral-400">Crie categorias para organizar o catalogo.</p>
                      <form className="mt-6 space-y-4" onSubmit={handleCreateCategory}>
                        <input
                          value={categoryForm.name}
                          onChange={(e) => {
                            const name = e.target.value
                            setCategoryForm((prev) => ({
                              ...prev,
                              name,
                              slug: prev.slug || slugifyCategory(name),
                            }))
                          }}
                          className="w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                          placeholder="Nome da categoria (ex: Miniaturas)"
                          required
                        />
                        <input
                          value={categoryForm.slug}
                          onChange={(e) => setCategoryForm((prev) => ({ ...prev, slug: e.target.value }))}
                          className="w-full rounded-2xl border border-neutral-200 px-4 py-3 font-mono text-sm outline-none transition focus:border-primary-500"
                          placeholder="slug (preenchido automaticamente)"
                        />
                        <textarea
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="min-h-[80px] w-full rounded-2xl border border-neutral-200 px-4 py-3 outline-none transition focus:border-primary-500"
                          placeholder="Descricao (opcional)"
                        />
                        <button
                          type="submit"
                          className="btn-primary w-full disabled:opacity-60"
                          disabled={categoryCreating}
                        >
                          {categoryCreating ? 'Criando...' : 'Criar categoria'}
                        </button>
                      </form>
                    </article>

                    <article className="rounded-[28px] border border-neutral-100 bg-white p-6 shadow-soft">
                      <h2 className="text-xl font-semibold text-neutral-900">Categorias</h2>
                      <p className="mt-1 text-sm text-neutral-400">{categories.length} categoria{categories.length !== 1 ? 's' : ''} cadastrada{categories.length !== 1 ? 's' : ''}.</p>
                      <div className="mt-6 overflow-x-auto">
                        <table className="min-w-full text-left">
                          <thead>
                            <tr className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                              <th className="px-4 py-3">Nome</th>
                              <th className="px-4 py-3">Slug</th>
                              <th className="px-4 py-3">Descricao</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categories.map((cat) => (
                              <tr key={cat.id} className="border-t border-neutral-100">
                                <td className="px-4 py-4 font-medium text-neutral-900">{cat.name}</td>
                                <td className="px-4 py-4 font-mono text-sm text-neutral-500">{cat.slug}</td>
                                <td className="px-4 py-4 text-sm text-neutral-500">{cat.description ?? '—'}</td>
                              </tr>
                            ))}
                            {categories.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-sm text-neutral-400">
                                  Nenhuma categoria cadastrada ainda.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  </section>
                ) : null}

                {activeSection === 'reports' ? (
                  <section className="space-y-6">
                    {/* Cabeçalho com filtro de período */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-neutral-900">Relatorio financeiro</h2>
                        <p className="mt-1 text-sm text-neutral-400">Visao geral de vendas, pedidos e desempenho.</p>
                      </div>
                      <div className="flex gap-2">
                        {(['day', 'week', 'month', 'year'] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setReportsPeriod(p)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                              reportsPeriod === p
                                ? 'bg-primary-500 text-white'
                                : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                            }`}
                          >
                            {p === 'day' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Ano'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {reportsLoading ? (
                      <div className="rounded-[28px] border border-neutral-100 bg-white p-10 text-center text-sm text-neutral-400 shadow-soft">
                        Carregando relatorio...
                      </div>
                    ) : !reportsData ? (
                      <div className="rounded-[28px] border border-neutral-100 bg-white p-10 text-center text-sm text-neutral-400 shadow-soft">
                        Nenhum dado disponivel para este periodo.
                      </div>
                    ) : (
                      <>
                        {/* KPI cards */}
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          {[
                            { label: 'Faturamento', value: formatCurrency(reportsData.kpis.total_revenue), color: 'bg-emerald-50 text-emerald-600' },
                            { label: 'Pedidos pagos', value: formatCompact(reportsData.kpis.paid_orders), color: 'bg-violet-50 text-violet-600' },
                            { label: 'Ticket medio', value: formatCurrency(reportsData.kpis.average_ticket), color: 'bg-sky-50 text-sky-600' },
                            { label: 'Pendentes', value: formatCompact(reportsData.kpis.pending_orders), color: 'bg-amber-50 text-amber-600' },
                          ].map((card) => (
                            <article key={card.label} className="rounded-[24px] border border-neutral-100 bg-white px-5 py-4 shadow-soft">
                              <p className={`inline-block rounded-xl px-3 py-1 text-xs font-semibold ${card.color}`}>{card.label}</p>
                              <p className="mt-3 text-3xl font-semibold text-neutral-900">{card.value}</p>
                            </article>
                          ))}
                        </div>

                        {/* Receita ao longo do tempo */}
                        <article className="rounded-[28px] border border-neutral-100 bg-white p-6 shadow-soft">
                          <h3 className="text-lg font-semibold text-neutral-900">Receita no periodo</h3>
                          {reportsData.revenue_over_time.length === 0 ? (
                            <p className="mt-6 text-center text-sm text-neutral-400">Sem dados de receita para este periodo.</p>
                          ) : (
                            <div className="mt-6 overflow-x-auto">
                              <table className="min-w-full text-left text-sm">
                                <thead>
                                  <tr className="text-xs uppercase tracking-widest text-neutral-400">
                                    <th className="pb-3 pr-8">Data</th>
                                    <th className="pb-3 pr-8">Receita</th>
                                    <th className="pb-3">Pedidos</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {reportsData.revenue_over_time.map((row) => (
                                    <tr key={row.date} className="border-t border-neutral-100">
                                      <td className="py-3 pr-8 font-mono text-neutral-500">{row.date}</td>
                                      <td className="py-3 pr-8 font-semibold text-neutral-900">{formatCurrency(row.revenue)}</td>
                                      <td className="py-3 text-neutral-600">{row.orders}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </article>

                        <div className="grid gap-6 xl:grid-cols-2">
                          {/* Pedidos por status */}
                          <article className="rounded-[28px] border border-neutral-100 bg-white p-6 shadow-soft">
                            <h3 className="text-lg font-semibold text-neutral-900">Pedidos por status</h3>
                            <div className="mt-5 space-y-3">
                              {reportsData.orders_by_status.map((row) => {
                                const st = normalizeStatus(row.status)
                                const total = reportsData.orders_by_status.reduce((s, r) => s + r.count, 0)
                                const pct = total > 0 ? Math.round((row.count / total) * 100) : 0
                                return (
                                  <div key={row.status}>
                                    <div className="mb-1 flex items-center justify-between text-sm">
                                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.className}`}>{st.label}</span>
                                      <span className="font-semibold text-neutral-900">{row.count} ({pct}%)</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                                      <div className="h-full rounded-full bg-primary-400" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                )
                              })}
                              {reportsData.orders_by_status.length === 0 && (
                                <p className="text-center text-sm text-neutral-400">Sem pedidos neste periodo.</p>
                              )}
                            </div>
                          </article>

                          {/* Top produtos */}
                          <article className="rounded-[28px] border border-neutral-100 bg-white p-6 shadow-soft">
                            <h3 className="text-lg font-semibold text-neutral-900">Top produtos</h3>
                            <div className="mt-5 overflow-x-auto">
                              <table className="min-w-full text-left text-sm">
                                <thead>
                                  <tr className="text-xs uppercase tracking-widest text-neutral-400">
                                    <th className="pb-3">#</th>
                                    <th className="pb-3 pl-3">Produto</th>
                                    <th className="pb-3 pl-3 text-right">Qtd</th>
                                    <th className="pb-3 pl-3 text-right">Receita</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {reportsData.top_products.map((item, i) => (
                                    <tr key={item.product_id} className="border-t border-neutral-100">
                                      <td className="py-3 text-xs font-bold text-primary-500">{i + 1}</td>
                                      <td className="py-3 pl-3">
                                        <p className="font-semibold text-neutral-900">{item.product_name}</p>
                                        <p className="text-xs text-neutral-400">{item.sku}</p>
                                      </td>
                                      <td className="py-3 pl-3 text-right text-neutral-600">{item.total_quantity}</td>
                                      <td className="py-3 pl-3 text-right font-semibold text-neutral-900">{formatCurrency(item.total_revenue)}</td>
                                    </tr>
                                  ))}
                                  {reportsData.top_products.length === 0 && (
                                    <tr><td colSpan={4} className="py-6 text-center text-sm text-neutral-400">Sem vendas neste periodo.</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </article>
                        </div>
                      </>
                    )}
                  </section>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
