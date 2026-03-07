import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Users, Building2, CreditCard, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Admin – Clientes' }

export default async function AdminCustomersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'platform_admin') redirect('/dashboard')

  const { data: customers } = await supabase
    .from('customers')
    .select(
      `
      id, name, slug, stripe_customer_id, created_at,
      user_profiles(id, email, full_name, role),
      buildings(id, name)
    `
    )
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <nav className="mb-2 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/admin" className="hover:text-gray-700">
            Administrador
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-900">Clientes</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Controle de Clientes</h1>
            <p className="mt-1 text-sm text-gray-500">
              Visualize e gerencie todos os clientes da plataforma.
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
            {customers?.length ?? 0} clientes
          </span>
        </div>
      </div>

      {!customers || customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-gray-500">Nenhum cliente cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => {
            const userCount = Array.isArray(customer.user_profiles)
              ? customer.user_profiles.length
              : 0
            const buildingCount = Array.isArray(customer.buildings)
              ? customer.buildings.length
              : 0
            const primaryUser = Array.isArray(customer.user_profiles)
              ? customer.user_profiles[0]
              : null

            return (
              <Link
                key={customer.id}
                href={`/dashboard/admin/customers/${customer.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{customer.name}</p>
                    <p className="text-xs text-gray-500">
                      {primaryUser?.email ?? customer.slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>{userCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Building2 className="h-4 w-4" />
                    <span>{buildingCount}</span>
                  </div>
                  {customer.stripe_customer_id && (
                    <div className="flex items-center gap-1.5 text-sm text-green-600">
                      <CreditCard className="h-4 w-4" />
                      <span>Stripe</span>
                    </div>
                  )}
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
