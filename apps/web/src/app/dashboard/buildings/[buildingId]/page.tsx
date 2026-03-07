import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { Layers, Radio, ScanSearch, Siren, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BuildingTabs } from './components/BuildingTabs'

export const metadata: Metadata = { title: 'Edifício' }

interface Props {
  params: Promise<{ buildingId: string }>
}

export default async function BuildingPage({ params }: Props) {
  const { buildingId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address, city, country, postal_code, created_at')
    .eq('id', buildingId)
    .single()

  if (!building) notFound()

  const [
    { data: floors },
    { data: gateways },
  ] = await Promise.all([
    supabase.from('floors').select('id, name, level, floor_plan_url').eq('building_id', buildingId).order('level'),
    supabase
      .from('gateways')
      .select('id, name, eui, serial_number, status, firmware, last_seen_at, pos_x, pos_y, floor_id')
      .eq('building_id', buildingId)
      .order('created_at'),
  ])

  const gatewayIds = gateways?.map((g) => g.id) ?? []

  const [{ data: detectors }, { data: alarms }, { data: events }] = await Promise.all([
    gatewayIds.length > 0
      ? supabase
          .from('detectors')
          .select('id, name, eui, serial_number, type, status, battery_level, last_seen_at, pos_x, pos_y, floor_id')
          .in('gateway_id', gatewayIds)
          .order('created_at')
      : Promise.resolve({ data: [] }),
    supabase
      .from('alarms')
      .select('id, name, serial_number, status, last_seen_at, floor_id, pos_x, pos_y')
      .eq('building_id', buildingId)
      .order('created_at'),
    gatewayIds.length > 0
      ? supabase
          .from('device_events')
          .select('id, type, received_at, payload')
          .in('gateway_id', gatewayIds)
          .order('received_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ])

  const activeAlarms = detectors?.filter((d) => d.status === 'alarm').length ?? 0

  return (
    <div>
      <div className="mb-6">
        <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/buildings" className="hover:text-gray-700">
            Edifícios
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-900">{building.name}</span>
        </nav>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/buildings"
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{building.name}</h1>
              {(building.address || building.city) && (
                <p className="text-sm text-gray-500">
                  {[building.address, building.city, building.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
          {activeAlarms > 0 && (
            <span className="inline-flex animate-pulse items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {activeAlarms} alarme{activeAlarms !== 1 ? 's' : ''} ativo{activeAlarms !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Andares', value: floors?.length ?? 0, icon: <Layers className="h-5 w-5 text-gray-500" /> },
          { label: 'Gateways', value: gateways?.length ?? 0, icon: <Radio className="h-5 w-5 text-gray-500" /> },
          { label: 'Detectores', value: detectors?.length ?? 0, icon: <ScanSearch className="h-5 w-5 text-gray-500" /> },
          { label: 'Alarmes ativos', value: activeAlarms, icon: <Siren className="h-5 w-5 text-red-500" /> },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              {stat.icon}
              <span className="text-sm font-medium text-gray-700">{stat.label}</span>
            </div>
            <span className="text-lg font-bold text-gray-900">{stat.value}</span>
          </div>
        ))}
      </div>

      <BuildingTabs
        buildingId={buildingId}
        floors={floors ?? []}
        gateways={gateways ?? []}
        detectors={detectors ?? []}
        alarms={alarms ?? []}
        events={events ?? []}
      />
    </div>
  )
}
