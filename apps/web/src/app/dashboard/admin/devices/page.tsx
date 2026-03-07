import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Radio, ScanSearch, Siren, Cpu } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AddVirtualDeviceForm } from './components/AddVirtualDeviceForm'

export const metadata: Metadata = { title: 'Admin – Dispositivos' }

export default async function AdminDevicesPage() {
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
    { data: gateways },
    { data: detectors },
    { data: alarms },
    { count: virtualGatewayCount },
    { count: virtualDetectorCount },
  ] = await Promise.all([
    supabase
      .from('gateways')
      .select('id, name, eui, serial_number, is_virtual, status, building_id, buildings(name)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('detectors')
      .select('id, name, eui, serial_number, is_virtual, type, status, gateway_id, gateways(name)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('alarms')
      .select('id, name, serial_number, is_virtual, status, building_id, buildings(name)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('gateways')
      .select('id', { count: 'exact', head: true })
      .eq('is_virtual', true),
    supabase
      .from('detectors')
      .select('id', { count: 'exact', head: true })
      .eq('is_virtual', true),
  ])

  return (
    <div>
      <div className="mb-8">
        <nav className="mb-2 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/admin" className="hover:text-gray-700">
            Administrador
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-900">Dispositivos</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Controle de Dispositivos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerencie todos os dispositivos da plataforma. Crie dispositivos virtuais para testes de
          desenvolvimento.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'Gateways',
            value: gateways?.length ?? 0,
            icon: <Radio className="h-6 w-6 text-purple-500" />,
          },
          {
            label: 'Detectores',
            value: detectors?.length ?? 0,
            icon: <ScanSearch className="h-6 w-6 text-orange-500" />,
          },
          {
            label: 'Alarmes',
            value: alarms?.length ?? 0,
            icon: <Siren className="h-6 w-6 text-red-500" />,
          },
          {
            label: 'Virtuais',
            value: (virtualGatewayCount ?? 0) + (virtualDetectorCount ?? 0),
            icon: <Cpu className="h-6 w-6 text-blue-500" />,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              {stat.icon}
              <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Add virtual device */}
      <div className="mb-8">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-blue-900">Criar dispositivo virtual</h2>
          </div>
          <p className="mb-4 text-sm text-blue-700">
            Dispositivos virtuais simulam hardware real para testes de desenvolvimento. Use o
            simulador de detectores para gerar telemetria.
          </p>
          <AddVirtualDeviceForm />
        </div>
      </div>

      {/* Gateways table */}
      <DeviceTable
        title="Gateways"
        icon={<Radio className="h-5 w-5 text-purple-500" />}
        devices={
          gateways?.map((g) => ({
            id: g.id,
            name: g.name,
            eui: g.eui,
            serial: g.serial_number,
            isVirtual: g.is_virtual,
            status: g.status,
            location: Array.isArray(g.buildings)
              ? (g.buildings[0] as { name: string })?.name ?? '—'
              : (g.buildings as { name: string } | null)?.name ?? '—',
            extra: null,
          })) ?? []
        }
      />

      {/* Detectors table */}
      <DeviceTable
        title="Detectores"
        icon={<ScanSearch className="h-5 w-5 text-orange-500" />}
        devices={
          detectors?.map((d) => {
            const gw = Array.isArray(d.gateways) ? d.gateways[0] : d.gateways as { name: string } | null
            return {
              id: d.id,
              name: d.name,
              eui: d.eui,
              serial: d.serial_number,
              isVirtual: d.is_virtual,
              status: d.status,
              location: gw?.name ?? '—',
              extra: d.type,
            }
          }) ?? []
        }
      />

      {/* Alarms table */}
      <DeviceTable
        title="Alarmes"
        icon={<Siren className="h-5 w-5 text-red-500" />}
        devices={
          alarms?.map((a) => ({
            id: a.id,
            name: a.name,
            eui: null,
            serial: a.serial_number,
            isVirtual: a.is_virtual,
            status: a.status,
            location: Array.isArray(a.buildings)
              ? (a.buildings[0] as { name: string })?.name ?? '—'
              : (a.buildings as { name: string } | null)?.name ?? '—',
            extra: null,
          })) ?? []
        }
      />
    </div>
  )
}

interface DeviceRow {
  id: string
  name: string
  eui: string | null
  serial: string | null
  isVirtual: boolean
  status: string
  location: string
  extra: string | null
}

function DeviceTable({
  title,
  icon,
  devices,
}: {
  title: string
  icon: React.ReactNode
  devices: DeviceRow[]
}) {
  if (devices.length === 0) return null

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {devices.length}
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">EUI / Serial</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Localização</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {devices.map((device) => (
              <tr key={device.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{device.name}</span>
                    {device.isVirtual && (
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                        virtual
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                  {device.eui && <div>{device.eui}</div>}
                  {device.serial && (
                    <div className="text-gray-400">S/N: {device.serial}</div>
                  )}
                  {!device.eui && !device.serial && <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={device.status} />
                </td>
                <td className="px-4 py-3 text-gray-600">{device.location}</td>
                <td className="px-4 py-3 text-gray-500">{device.extra ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    online: 'bg-green-100 text-green-700',
    normal: 'bg-green-100 text-green-700',
    offline: 'bg-gray-100 text-gray-600',
    degraded: 'bg-orange-100 text-orange-700',
    alarm: 'bg-red-100 text-red-700',
    triggered: 'bg-red-100 text-red-700',
    fault: 'bg-yellow-100 text-yellow-700',
  }
  const labels: Record<string, string> = {
    online: 'Online',
    normal: 'Normal',
    offline: 'Offline',
    degraded: 'Degradado',
    alarm: 'Alarme',
    triggered: 'Acionado',
    fault: 'Falha',
  }
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {labels[status] ?? status}
    </span>
  )
}
