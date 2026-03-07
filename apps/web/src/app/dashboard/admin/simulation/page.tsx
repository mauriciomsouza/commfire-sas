import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Cpu } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SimulationPanel } from './components/SimulationPanel'

export const metadata: Metadata = { title: 'Admin – Simulação' }

export default async function SimulationPage() {
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

  const [{ data: gateways }, { data: detectors }, { data: recentEvents }] = await Promise.all([
    supabase
      .from('gateways')
      .select('id, name, eui, status, buildings(name)')
      .eq('is_virtual', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('detectors')
      .select('id, name, eui, type, status, gateways(name, eui)')
      .eq('is_virtual', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('sim_events')
      .select('id, device_type, device_eui, event_type, status, error_message, created_at, processed_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  return (
    <div>
      <div className="mb-8">
        <nav className="mb-2 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/admin" className="hover:text-gray-700">
            Administrador
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-900">Simulação</span>
        </nav>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
            <Cpu className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Painel de Simulação</h1>
            <p className="text-sm text-gray-500">
              Dispare eventos manualmente em dispositivos virtuais para testar o fluxo completo.
            </p>
          </div>
        </div>
      </div>

      <SimulationPanel
        gateways={
          gateways?.map((g) => ({
            id: g.id,
            name: g.name,
            eui: g.eui,
            status: g.status,
            buildingName: normalizeRelation<{ name: string }>(g.buildings)?.name ?? '—',
          })) ?? []
        }
        detectors={
          detectors?.map((d) => {
            const gw = normalizeRelation<{ name: string; eui: string }>(d.gateways)
            return {
              id: d.id,
              name: d.name,
              eui: d.eui,
              type: d.type,
              status: d.status,
              gatewayName: gw?.name ?? '—',
            }
          }) ?? []
        }
        recentEvents={
          recentEvents?.map((e) => ({
            id: e.id,
            deviceType: e.device_type as 'gateway' | 'detector' | 'alarm',
            deviceEui: e.device_eui,
            eventType: e.event_type,
            status: e.status as 'pending' | 'processing' | 'done' | 'error',
            errorMessage: e.error_message,
            createdAt: e.created_at,
            processedAt: e.processed_at,
          })) ?? []
        }
      />
    </div>
  )
}

function normalizeRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) return null
  return Array.isArray(relation) ? (relation[0] ?? null) : relation
}
