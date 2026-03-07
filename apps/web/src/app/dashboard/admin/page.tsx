import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Users, ScanSearch, DollarSign, TrendingUp, Building2, Radio } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Admin – Visão Geral' }

const PRICES = { detector: 60, alarm: 30, gateway: 250 }

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Check platform_admin role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'platform_admin') {
    redirect('/dashboard')
  }

  // Fetch stats
  const [
    { count: usersCount },
    { count: detectorsCount },
    { count: buildingsCount },
    { count: gatewaysCount },
    { data: subscriptions },
  ] = await Promise.all([
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('detectors').select('id', { count: 'exact', head: true }),
    supabase.from('buildings').select('id', { count: 'exact', head: true }),
    supabase.from('gateways').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('status').eq('status', 'active'),
  ])

  const activeSubscriptions = subscriptions?.length ?? 0
  // Estimated MRR: use device counts as proxy (detectors + gateways; alarms not tracked separately in DB yet)
  const estimatedMRR =
    (detectorsCount ?? 0) * PRICES.detector + (gatewaysCount ?? 0) * PRICES.gateway

  const stats = [
    {
      label: 'Usuários ativos',
      value: usersCount ?? 0,
      icon: <Users className="h-6 w-6 text-blue-500" />,
      color: 'blue',
    },
    {
      label: 'Detectores instalados',
      value: detectorsCount ?? 0,
      icon: <ScanSearch className="h-6 w-6 text-orange-500" />,
      color: 'orange',
    },
    {
      label: 'Edifícios monitorados',
      value: buildingsCount ?? 0,
      icon: <Building2 className="h-6 w-6 text-green-500" />,
      color: 'green',
    },
    {
      label: 'Gateways ativos',
      value: gatewaysCount ?? 0,
      icon: <Radio className="h-6 w-6 text-purple-500" />,
      color: 'purple',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Painel Administrador</h1>
        <p className="mt-1 text-sm text-gray-500">
          Visão geral da plataforma Commfire SAS.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              {stat.icon}
              <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Financial section */}
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <h2 className="font-semibold text-gray-900">Financeiro</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3">
              <div>
                <p className="text-sm text-gray-600">MRR estimado</p>
                <p className="text-xs text-gray-400">Baseado em dispositivos ativos</p>
              </div>
              <p className="text-2xl font-bold text-green-700">
                R${' '}
                {estimatedMRR.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
              <div>
                <p className="text-sm text-gray-600">Assinaturas ativas</p>
                <p className="text-xs text-gray-400">Status: active no Stripe</p>
              </div>
              <p className="text-2xl font-bold text-blue-700">{activeSubscriptions}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h2 className="font-semibold text-gray-900">Receita por dispositivo</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                label: 'Detectores de fumaça',
                count: detectorsCount ?? 0,
                price: PRICES.detector,
              },
              {
                label: 'Gateways',
                count: gatewaysCount ?? 0,
                price: PRICES.gateway,
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium text-gray-900">
                      R${' '}
                      {(item.count * item.price).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                      /mês
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{
                        width: estimatedMRR > 0 ? `${((item.count * item.price) / estimatedMRR) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-gray-900">Total estimado</span>
                <span className="font-bold text-orange-600">
                  R${' '}
                  {estimatedMRR.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  /mês
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info note about role assignment */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-semibold text-amber-800">Como se tornar administrador</p>
        <p className="mt-1 text-sm text-amber-700">
          Para definir um usuário como administrador da plataforma, execute o seguinte comando
          diretamente no banco de dados (Supabase SQL Editor):
        </p>
        <pre className="mt-2 overflow-x-auto rounded-md bg-amber-100 p-3 text-xs text-amber-900">
          {`UPDATE public.user_profiles\n  SET role = 'platform_admin'\n  WHERE email = 'admin@suaempresa.com';`}
        </pre>
      </div>
    </div>
  )
}
