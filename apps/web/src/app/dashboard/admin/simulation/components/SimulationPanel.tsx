'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Radio,
  ScanSearch,
  Flame,
  ShieldAlert,
  Zap,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// How many ms to wait before refreshing the page after triggering an event,
// giving the sim-server time to process and mark the sim_event as done.
const REFRESH_DELAY_MS = 6_000

// ─── Types ────────────────────────────────────────────────────────────────────

interface VirtualGateway {
  id: string
  name: string
  eui: string
  status: string
  buildingName: string
}

interface VirtualDetector {
  id: string
  name: string
  eui: string
  type: string
  status: string
  gatewayName: string
}

interface SimEventRow {
  id: string
  deviceType: 'gateway' | 'detector' | 'alarm'
  deviceEui: string | null
  eventType: string
  status: 'pending' | 'processing' | 'done' | 'error'
  errorMessage: string | null
  createdAt: string
  processedAt: string | null
}

interface Props {
  gateways: VirtualGateway[]
  detectors: VirtualDetector[]
  recentEvents: SimEventRow[]
}

// ─── Event type labels ────────────────────────────────────────────────────────

const DETECTOR_EVENTS: Array<{ type: string; label: string; icon: React.ReactNode; color: string }> = [
  { type: 'alarm', label: 'Alarme', icon: <Flame className="h-4 w-4" />, color: 'bg-red-600 hover:bg-red-700' },
  { type: 'alarm_clear', label: 'Limpar alarme', icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-green-600 hover:bg-green-700' },
  { type: 'fault', label: 'Falha', icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-yellow-600 hover:bg-yellow-700' },
  { type: 'fault_clear', label: 'Limpar falha', icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-green-600 hover:bg-green-700' },
  { type: 'tamper', label: 'Tamper', icon: <ShieldAlert className="h-4 w-4" />, color: 'bg-orange-600 hover:bg-orange-700' },
  { type: 'low_battery', label: 'Bateria baixa', icon: <Zap className="h-4 w-4" />, color: 'bg-amber-600 hover:bg-amber-700' },
  { type: 'heartbeat', label: 'Heartbeat', icon: <RefreshCw className="h-4 w-4" />, color: 'bg-blue-600 hover:bg-blue-700' },
]

const GATEWAY_EVENTS: Array<{ type: string; label: string; icon: React.ReactNode; color: string }> = [
  { type: 'heartbeat', label: 'Heartbeat', icon: <RefreshCw className="h-4 w-4" />, color: 'bg-blue-600 hover:bg-blue-700' },
]

// ─── Simulation Panel ─────────────────────────────────────────────────────────

export function SimulationPanel({ gateways, detectors, recentEvents: initialEvents }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [events, setEvents] = useState<SimEventRow[]>(initialEvents)
  const [sending, setSending] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function triggerEvent(
    deviceType: 'gateway' | 'detector',
    deviceId: string,
    deviceEui: string,
    eventType: string,
    payload: Record<string, unknown> = {}
  ) {
    const key = `${deviceId}:${eventType}`
    setSending(key)

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('sim_events')
        .insert({
          device_type: deviceType,
          device_id: deviceId,
          device_eui: deviceEui,
          event_type: eventType,
          payload,
          status: 'pending',
        })
        .select('id, device_type, device_eui, event_type, status, error_message, created_at, processed_at')
        .single()

      if (error) {
        showToast(`Erro: ${error.message}`, 'error')
        return
      }

      showToast(`Evento "${eventType}" enviado para ${deviceEui}`, 'success')

      // Prepend new event to local list
      setEvents((prev) => [
        {
          id: data.id,
          deviceType: data.device_type as 'gateway' | 'detector' | 'alarm',
          deviceEui: data.device_eui,
          eventType: data.event_type,
          status: data.status as 'pending',
          errorMessage: data.error_message,
          createdAt: data.created_at,
          processedAt: data.processed_at,
        },
        ...prev.slice(0, 29),
      ])

      // Refresh server component after a short delay so status updates appear
      setTimeout(() => {
        startTransition(() => router.refresh())
      }, REFRESH_DELAY_MS)
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Empty state */}
      {gateways.length === 0 && detectors.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mb-4 flex justify-center">
            <ScanSearch className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Nenhum dispositivo virtual</h3>
          <p className="text-sm text-gray-500">
            Crie dispositivos virtuais na página de{' '}
            <a href="/dashboard/admin/devices" className="text-orange-600 hover:underline">
              Dispositivos
            </a>{' '}
            para poder disparar eventos de simulação.
          </p>
        </div>
      )}

      {/* Virtual Gateways */}
      {gateways.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Radio className="h-5 w-5 text-purple-500" />
            <h2 className="font-semibold text-gray-900">Gateways Virtuais</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {gateways.length}
            </span>
          </div>
          <div className="space-y-3">
            {gateways.map((gw) => (
              <DeviceCard
                key={gw.id}
                deviceType="gateway"
                deviceId={gw.id}
                deviceEui={gw.eui}
                name={gw.name}
                subtitle={gw.buildingName}
                status={gw.status}
                eui={gw.eui}
                events={GATEWAY_EVENTS}
                sending={sending}
                onTrigger={triggerEvent}
              />
            ))}
          </div>
        </section>
      )}

      {/* Virtual Detectors */}
      {detectors.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <ScanSearch className="h-5 w-5 text-orange-500" />
            <h2 className="font-semibold text-gray-900">Detectores Virtuais</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {detectors.length}
            </span>
          </div>
          <div className="space-y-3">
            {detectors.map((det) => (
              <DeviceCard
                key={det.id}
                deviceType="detector"
                deviceId={det.id}
                deviceEui={det.eui}
                name={det.name}
                subtitle={`${det.gatewayName} · ${det.type}`}
                status={det.status}
                eui={det.eui}
                events={DETECTOR_EVENTS}
                sending={sending}
                onTrigger={triggerEvent}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent sim_events log */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Log de eventos simulados</h2>
          {isPending && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" /> atualizando…
            </span>
          )}
        </div>

        {events.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum evento simulado ainda.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Dispositivo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Evento</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {ev.deviceType === 'gateway' ? (
                          <Radio className="h-3.5 w-3.5 text-purple-400" />
                        ) : (
                          <ScanSearch className="h-3.5 w-3.5 text-orange-400" />
                        )}
                        <span className="font-mono text-xs text-gray-700">
                          {ev.deviceEui ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{ev.eventType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <SimEventStatusBadge status={ev.status} error={ev.errorMessage} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(ev.createdAt).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Device Card ──────────────────────────────────────────────────────────────

interface DeviceCardProps {
  deviceType: 'gateway' | 'detector'
  deviceId: string
  deviceEui: string
  name: string
  subtitle: string
  status: string
  eui: string
  events: Array<{ type: string; label: string; icon: React.ReactNode; color: string }>
  sending: string | null
  onTrigger: (
    deviceType: 'gateway' | 'detector',
    deviceId: string,
    deviceEui: string,
    eventType: string,
    payload?: Record<string, unknown>
  ) => Promise<void>
}

function DeviceCard({
  deviceType,
  deviceId,
  deviceEui,
  name,
  subtitle,
  status,
  eui,
  events,
  sending,
  onTrigger,
}: DeviceCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{name}</span>
            <StatusBadge status={status} />
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
          <p className="mt-0.5 font-mono text-xs text-gray-400">{eui}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {events.map((ev) => {
          const key = `${deviceId}:${ev.type}`
          const isLoading = sending === key
          return (
            <button
              key={ev.type}
              disabled={sending !== null}
              onClick={() => onTrigger(deviceType, deviceId, deviceEui, ev.type)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50 ${ev.color}`}
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : ev.icon}
              {ev.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    online: 'bg-green-100 text-green-700',
    normal: 'bg-green-100 text-green-700',
    offline: 'bg-gray-100 text-gray-600',
    degraded: 'bg-orange-100 text-orange-700',
    alarm: 'bg-red-100 text-red-700',
    fault: 'bg-yellow-100 text-yellow-700',
    tamper: 'bg-orange-100 text-orange-700',
  }
  const labels: Record<string, string> = {
    online: 'Online',
    normal: 'Normal',
    offline: 'Offline',
    degraded: 'Degradado',
    alarm: 'Alarme',
    fault: 'Falha',
    tamper: 'Tamper',
  }
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${variants[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {labels[status] ?? status}
    </span>
  )
}

function SimEventStatusBadge({
  status,
  error,
}: {
  status: 'pending' | 'processing' | 'done' | 'error'
  error: string | null
}) {
  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
        <CheckCircle2 className="h-3 w-3" /> Concluído
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span
        className="inline-flex cursor-help items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700"
        title={error ?? undefined}
      >
        <XCircle className="h-3 w-3" /> Erro
      </span>
    )
  }
  if (status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
        <Loader2 className="h-3 w-3 animate-spin" /> Processando
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
      <Clock className="h-3 w-3" /> Pendente
    </span>
  )
}
