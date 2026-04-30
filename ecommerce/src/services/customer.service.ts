import { createServiceClient } from '@/lib/supabase/server'

type ProfileRow = {
  id: string
  full_name: string | null
  phone: string | null
  cpf: string | null
  created_at: string
}

type AddressRow = {
  user_id: string
  label: string | null
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zip_code: string
  is_default: boolean | null
  created_at: string
}

type OrderRow = {
  id: string
  user_id: string
  status: string
  payment_status: string
  total: number
  created_at: string
}

export interface AdminCustomerAddress {
  label: string | null
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zip_code: string
  is_default: boolean
}

export interface AdminCustomerOrder {
  id: string
  status: string
  payment_status: string
  total: number
  created_at: string
}

export interface AdminCustomerRecord {
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
  default_address: AdminCustomerAddress | null
  recent_orders: AdminCustomerOrder[]
}

function isLegacyOrdersSchemaError(error: { message?: string; code?: string } | null): boolean {
  const message = error?.message ?? ''
  return error?.code === '42703' || message.includes('does not exist')
}

async function getCustomerOrders(customerIds: string[]): Promise<OrderRow[]> {
  const supabase = createServiceClient()

  const primaryQuery = await supabase
    .from('orders')
    .select('id, user_id, status, payment_status, total, created_at')
    .in('user_id', customerIds)
    .order('created_at', { ascending: false })

  if (!primaryQuery.error) {
    return ((primaryQuery.data ?? []) as Array<{
      id: string
      user_id: string
      status: string
      payment_status: string
      total: number
      created_at: string
    }>).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      status: row.status,
      payment_status: row.payment_status,
      total: Number(row.total ?? 0),
      created_at: row.created_at,
    }))
  }

  if (!isLegacyOrdersSchemaError(primaryQuery.error)) {
    throw new Error(`[CustomerService] listCustomers orders: ${primaryQuery.error.message}`)
  }

  const legacyQuery = await supabase
    .from('orders')
    .select('id, customer_id, status, payment_status, total_amount, created_at')
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false })

  if (legacyQuery.error) {
    throw new Error(`[CustomerService] listCustomers legacy orders: ${legacyQuery.error.message}`)
  }

  return ((legacyQuery.data ?? []) as Array<{
    id: string
    customer_id: string
    status: string
    payment_status: string
    total_amount: number
    created_at: string
  }>).map((row) => ({
    id: row.id,
    user_id: row.customer_id,
    status: row.status,
    payment_status: row.payment_status,
    total: Number(row.total_amount ?? 0),
    created_at: row.created_at,
  }))
}

async function getCustomerEmails(customerIds: string[]): Promise<Map<string, string>> {
  const supabase = createServiceClient()
  const customerIdSet = new Set(customerIds)
  const emailById = new Map<string, string>()
  let page = 1
  const perPage = 200

  while (emailById.size < customerIds.length) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(`[CustomerService] listCustomers auth users: ${error.message}`)
    }

    const users = data?.users ?? []
    if (users.length === 0) break

    for (const user of users) {
      if (!customerIdSet.has(user.id)) continue
      emailById.set(user.id, user.email ?? '')
    }

    if (users.length < perPage) break
    page += 1
  }

  return emailById
}

async function getCustomerAddresses(customerIds: string[]): Promise<Map<string, AddressRow[]>> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('addresses')
    .select(
      'user_id, label, street, number, complement, neighborhood, city, state, zip_code, is_default, created_at'
    )
    .in('user_id', customerIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[CustomerService] listCustomers addresses fallback', error.message)
    return new Map()
  }

  const addressesByUser = new Map<string, AddressRow[]>()
  for (const address of (data ?? []) as AddressRow[]) {
    const userAddresses = addressesByUser.get(address.user_id) ?? []
    userAddresses.push(address)
    addressesByUser.set(address.user_id, userAddresses)
  }

  return addressesByUser
}

async function getCustomerOrdersSafe(customerIds: string[]): Promise<Map<string, OrderRow[]>> {
  try {
    const orders = await getCustomerOrders(customerIds)
    const ordersByUser = new Map<string, OrderRow[]>()

    for (const order of orders) {
      const userOrders = ordersByUser.get(order.user_id) ?? []
      userOrders.push(order)
      ordersByUser.set(order.user_id, userOrders)
    }

    return ordersByUser
  } catch (error) {
    console.warn(
      '[CustomerService] listCustomers orders fallback',
      error instanceof Error ? error.message : error
    )
    return new Map()
  }
}

async function getCustomerEmailsSafe(customerIds: string[]): Promise<Map<string, string>> {
  try {
    return await getCustomerEmails(customerIds)
  } catch (error) {
    console.warn(
      '[CustomerService] listCustomers auth users fallback',
      error instanceof Error ? error.message : error
    )
    return new Map()
  }
}

export const CustomerService = {
  async listCustomers(limit = 100): Promise<AdminCustomerRecord[]> {
    const supabase = createServiceClient()

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, cpf, created_at')
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (profilesError) {
      throw new Error(`[CustomerService] listCustomers profiles: ${profilesError.message}`)
    }

    const customerProfiles = (profiles ?? []) as ProfileRow[]
    if (customerProfiles.length === 0) return []

    const customerIds = customerProfiles.map((profile) => profile.id)

    const [addressesByUser, ordersByUser, emailById] = await Promise.all([
      getCustomerAddresses(customerIds),
      getCustomerOrdersSafe(customerIds),
      getCustomerEmailsSafe(customerIds),
    ])

    return customerProfiles.map((profile) => {
      const userOrders = ordersByUser.get(profile.id) ?? []
      const paidOrders = userOrders.filter((order) => order.payment_status === 'paid')
      const canceledOrders = userOrders.filter((order) => order.status === 'cancelado')
      const recentOrders = userOrders.slice(0, 4).map((order) => ({
        id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        total: Number(order.total ?? 0),
        created_at: order.created_at,
      }))

      const orderedAddresses = addressesByUser.get(profile.id) ?? []
      const defaultAddress = orderedAddresses.find((address) => address.is_default) ?? orderedAddresses[0] ?? null

      return {
        id: profile.id,
        full_name: profile.full_name?.trim() || 'Cliente sem nome',
        email: emailById.get(profile.id) ?? '',
        phone: profile.phone,
        cpf: profile.cpf,
        created_at: profile.created_at,
        total_orders: userOrders.length,
        paid_orders: paidOrders.length,
        canceled_orders: canceledOrders.length,
        total_spent: Number(
          paidOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0).toFixed(2)
        ),
        last_order_at: userOrders[0]?.created_at ?? null,
        default_address: defaultAddress
          ? {
              label: defaultAddress.label,
              street: defaultAddress.street,
              number: defaultAddress.number,
              complement: defaultAddress.complement,
              neighborhood: defaultAddress.neighborhood,
              city: defaultAddress.city,
              state: defaultAddress.state,
              zip_code: defaultAddress.zip_code,
              is_default: Boolean(defaultAddress.is_default),
            }
          : null,
        recent_orders: recentOrders,
      }
    })
  },
}
