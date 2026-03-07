import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import {
  Users,
  Building2,
  CreditCard,
  ArrowLeft,
  DollarSign,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CustomerEditForm } from './components/CustomerEditForm'
import { SettlePaymentForm } from './components/SettlePaymentForm'

export const metadata: Metadata = { title: 'Admin – Cliente' }

interface Props {
  params: Promise<{ customerId: string }>
}

export default async function AdminCustomerDetailPage({ params }: Props) {
  const { customerId } = await params
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

  const [
    { data: customer },
    { data: customerUsers },
    { data: buildings },
    { data: subscriptions },
    { data: settlements },
    { data: orders },
  ] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, slug, stripe_customer_id, created_at')
      .eq('id', customerId)
      .single(),
    supabase
      .from('user_profiles')
      .select('id, email, full_name, role, created_at')
      .eq('customer_id', customerId)
      .order('created_at'),
    supabase
      .from('buildings')
      .select('id, name, address, city, created_at')
      .eq('customer_id', customerId)
      .order('created_at'),
    supabase
      .from('subscriptions')
      .select('id, status, plan_id, current_period_start, current_period_end, stripe_subscription_id')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('payment_settlements')
      .select('id, amount, currency, method, reference, notes, settled_at, period_start, period_end')
      .eq('customer_id', customerId)
      .order('settled_at', { ascending: false }),
    supabase
      .from('subscription_orders')
      .select('id, detectors_qty, alarms_qty, gateways_qty, monthly_total, status, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
  ])

  if (!customer) notFound()

  return (
    <div>
      <div className="mb-6">
        <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/admin" className="hover:text-gray-700">
            Administrador
          </Link>
          <span>/</span>
          <Link href="/dashboard/admin/customers" className="hover:text-gray-700">
            Clientes
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-900">{customer.name}</span>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/customers"
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: details + edit */}
        <div className="space-y-6 lg:col-span-2">
          {/* Edit form */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">Dados do cliente</h2>
            <CustomerEditForm customer={customer} />
          </div>

          {/* Users */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">
                Usuários ({customerUsers?.length ?? 0})
              </h2>
            </div>
            {!customerUsers || customerUsers.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum usuário.</p>
            ) : (
              <div className="space-y-2">
                {customerUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {u.full_name || u.email}
                      </p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        u.role === 'platform_admin'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {u.role === 'platform_admin' ? 'Admin' : 'Cliente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buildings */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">
                Edifícios ({buildings?.length ?? 0})
              </h2>
            </div>
            {!buildings || buildings.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum edifício cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {buildings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{b.name}</p>
                      {b.address && (
                        <p className="text-xs text-gray-500">
                          {[b.address, b.city].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/dashboard/buildings/${b.id}`}
                      className="text-xs text-orange-600 hover:underline"
                    >
                      Ver →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subscription orders */}
          {orders && orders.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                <h2 className="font-semibold text-gray-900">Pedidos de instalação</h2>
              </div>
              <div className="space-y-2">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3 text-sm"
                  >
                    <div className="text-gray-600">
                      {o.detectors_qty > 0 && <span>{o.detectors_qty} detectores </span>}
                      {o.alarms_qty > 0 && <span>{o.alarms_qty} alarmes </span>}
                      {o.gateways_qty > 0 && <span>{o.gateways_qty} gateways </span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">
                        R${' '}
                        {Number(o.monthly_total).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                        /mês
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          o.status === 'installed'
                            ? 'bg-green-100 text-green-700'
                            : o.status === 'canceled'
                              ? 'bg-gray-100 text-gray-500'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: billing */}
        <div className="space-y-6">
          {/* Stripe info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Cobrança</h2>
            </div>
            {customer.stripe_customer_id ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Conectado ao Stripe</span>
                </div>
                <p className="font-mono text-xs text-gray-500">{customer.stripe_customer_id}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Sem cadastro no Stripe.</p>
            )}

            {subscriptions && subscriptions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Assinaturas
                </p>
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded-lg border border-gray-100 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{sub.plan_id}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          sub.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : sub.status === 'trialing'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual payment settlement */}
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h2 className="font-semibold text-green-900">Liquidar pagamento</h2>
            </div>
            <p className="mb-4 text-sm text-green-700">
              Registre um pagamento realizado fora do sistema de cobrança automático do Stripe
              (Pix, boleto, transferência, etc).
            </p>
            <SettlePaymentForm customerId={customerId} />
          </div>

          {/* Settlements history */}
          {settlements && settlements.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold text-gray-900">Histórico de liquidações</h2>
              <div className="space-y-2">
                {settlements.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-gray-100 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">
                        R${' '}
                        {Number(s.amount).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {s.method}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(s.settled_at).toLocaleDateString('pt-BR')}
                      {s.reference && ` · Ref: ${s.reference}`}
                    </p>
                    {s.notes && <p className="mt-1 text-xs text-gray-400">{s.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
