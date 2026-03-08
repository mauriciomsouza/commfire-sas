'use client'

import { useState, useRef, useMemo, useEffect, type Dispatch, type SetStateAction } from 'react'
import Link from 'next/link'
import {
  Plus,
  Radio,
  ScanSearch,
  Siren,
  Layers,
  Map,
  Activity,
  Battery,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Floor {
  id: string
  name: string
  level: number
  floor_plan_url: string | null
}

interface Gateway {
  id: string
  name: string
  eui: string
  serial_number: string | null
  status: string
  firmware: string
  last_seen_at: string | null
  pos_x: number | null
  pos_y: number | null
  floor_id: string | null
}

interface Detector {
  id: string
  name: string
  eui: string
  serial_number: string | null
  type: string
  status: string
  battery_level: string | null
  last_seen_at: string | null
  pos_x: number | null
  pos_y: number | null
  floor_id: string | null
}

interface Alarm {
  id: string
  name: string
  serial_number: string | null
  status: string
  last_seen_at: string | null
  floor_id: string | null
  pos_x: number | null
  pos_y: number | null
}

interface Event {
  id: string
  type: string
  received_at: string
  payload: Record<string, unknown>
  detector_id: string | null
  gateway_id: string | null
}

interface DeviceFilter {
  type: 'gateway' | 'detector'
  id: string
  name: string
}

interface BuildingTabsProps {
  buildingId: string
  floors: Floor[]
  gateways: Gateway[]
  detectors: Detector[]
  alarms: Alarm[]
  events: Event[]
}

const TABS = ['Visão geral', 'Andares', 'Gateways', 'Detectores', 'Alarmes', 'Planta Baixa', 'Eventos'] as const
type Tab = (typeof TABS)[number]

function statusColor(status: string) {
  switch (status) {
    case 'online':
    case 'normal':
      return 'text-green-700 bg-green-100'
    case 'alarm':
    case 'triggered':
      return 'text-red-700 bg-red-100'
    case 'fault':
      return 'text-yellow-700 bg-yellow-100'
    case 'offline':
      return 'text-gray-600 bg-gray-100'
    case 'degraded':
      return 'text-orange-700 bg-orange-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    online: 'Online',
    offline: 'Offline',
    degraded: 'Degradado',
    normal: 'Normal',
    alarm: 'Alarme',
    fault: 'Falha',
    triggered: 'Acionado',
    tamper: 'Tamper',
  }
  return map[status] ?? status
}

function batteryLabel(level: string | null) {
  if (!level) return null
  const map: Record<string, string> = {
    full: 'Cheio',
    good: 'Bom',
    medium: 'Médio',
    low: 'Baixo',
    critical: 'Crítico',
  }
  return map[level] ?? level
}

function eventLabel(type: string) {
  const map: Record<string, string> = {
    alarm: '🔴 Alarme',
    alarm_clear: '✅ Alarme limpo',
    fault: '⚠️ Falha',
    fault_clear: '✅ Falha limpa',
    tamper: '🔓 Tamper',
    tamper_clear: '✅ Tamper limpo',
    low_battery: '🔋 Bateria fraca',
    heartbeat: '💓 Heartbeat',
    join: '📡 Join',
    leave: '📴 Leave',
  }
  return map[type] ?? type
}

export function BuildingTabs({
  buildingId,
  floors,
  gateways,
  detectors,
  alarms,
  events,
}: BuildingTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Visão geral')
  const [activeFilter, setActiveFilter] = useState<DeviceFilter | null>(null)

  const goToEvents = (filter: DeviceFilter | null) => {
    setActiveFilter(filter)
    setActiveTab('Eventos')
  }

  const gatewayMap = useMemo(
    () => gateways.reduce<Record<string, Gateway>>((acc, g) => ({ ...acc, [g.id]: g }), {}),
    [gateways],
  )

  const detectorMap = useMemo(
    () => detectors.reduce<Record<string, Detector>>((acc, d) => ({ ...acc, [d.id]: d }), {}),
    [detectors],
  )

  const [localDetectors, setLocalDetectors] = useState(detectors)
  const [localGateways, setLocalGateways] = useState(gateways)
  const [localAlarms, setLocalAlarms] = useState(alarms)
  const [localEvents, setLocalEvents] = useState<Event[]>(events)

  // Keep localEvents in sync when server re-renders with fresh data
  useEffect(() => {
    setLocalEvents(events)
  }, [events])

  // Subscribe to device_events for realtime updates on the Eventos tab
  useEffect(() => {
    const gatewayIds = gateways.map((g) => g.id)
    if (gatewayIds.length === 0) return

    const supabase = createClient()
    const channel = supabase
      .channel(`building-events-${buildingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_events',
          filter: `gateway_id=in.(${gatewayIds.join(',')})`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            type: string
            received_at: string
            payload: Record<string, unknown>
            detector_id: string | null
            gateway_id: string | null
          }
          setLocalEvents((prev) => [
            {
              id: row.id,
              type: row.type,
              received_at: row.received_at,
              payload: row.payload ?? {},
              detector_id: row.detector_id,
              gateway_id: row.gateway_id,
            },
            ...prev.slice(0, 199),
          ])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [buildingId, gateways])

  const filteredEvents = useMemo(
    () =>
      activeFilter
        ? localEvents.filter((evt) =>
            activeFilter.type === 'gateway'
              ? evt.gateway_id === activeFilter.id
              : evt.detector_id === activeFilter.id,
          )
        : localEvents,
    [localEvents, activeFilter],
  )

  return (
    <div>
      {/* Tab nav */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'Visão geral' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-semibold text-gray-900">Resumo</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Andares</dt>
                  <dd className="font-medium text-gray-900">{floors.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Gateways</dt>
                  <dd className="font-medium text-gray-900">{gateways.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Detectores</dt>
                  <dd className="font-medium text-gray-900">{detectors.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Alarmes</dt>
                  <dd className="font-medium text-gray-900">{alarms.length}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-semibold text-gray-900">Estado dos detectores</h3>
              {localDetectors.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum detector cadastrado.</p>
              ) : (
                <dl className="space-y-2 text-sm">
                  {(['normal', 'alarm', 'fault', 'offline'] as const).map((s) => {
                    const count = localDetectors.filter((d) => d.status === s).length
                    if (count === 0) return null
                    return (
                      <div key={s} className="flex justify-between">
                        <dt className="text-gray-500">{statusLabel(s)}</dt>
                        <dd>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(s)}`}>
                            {count}
                          </span>
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              )}
            </div>
          </div>

          {/* Floor plan overview */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-4 font-semibold text-gray-900">Planta baixa</h2>
            {floors.length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-center">
                <Map className="mb-2 h-10 w-10 text-gray-400" />
                <p className="text-sm font-medium text-gray-500">
                  Adicione um andar para visualizar a planta
                </p>
                <button
                  onClick={() => setActiveTab('Andares')}
                  className="mt-3 text-xs text-orange-600 hover:underline"
                >
                  Ir para Andares
                </button>
              </div>
            ) : (
              <FloorPlanMap
                floors={floors}
                detectors={localDetectors}
                gateways={localGateways}
                alarms={localAlarms}
              />
            )}
          </div>
        </div>
      )}

      {/* Floors */}
      {activeTab === 'Andares' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Link
              href={`/dashboard/buildings/${buildingId}/floors/new`}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" /> Adicionar andar
            </Link>
          </div>
          {floors.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-10 w-10 text-gray-400" />}
              title="Nenhum andar cadastrado"
              description="Adicione andares com plantas baixas para posicionar detectores e gateways."
              action={
                <Link
                  href={`/dashboard/buildings/${buildingId}/floors/new`}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4" /> Adicionar andar
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {floors.map((floor) => (
                <div
                  key={floor.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                      <Layers className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{floor.name}</p>
                      <p className="text-xs text-gray-500">Nível {floor.level}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {floor.floor_plan_url ? (
                      <span className="text-xs text-green-600">Planta carregada</span>
                    ) : (
                      <span className="text-xs text-gray-400">Sem planta</span>
                    )}
                    <span className="text-xs text-gray-500">
                      {detectors.filter((d) => d.floor_id === floor.id).length} detectores
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gateways */}
      {activeTab === 'Gateways' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Link
              href={`/dashboard/buildings/${buildingId}/gateways/new`}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" /> Adicionar gateway
            </Link>
          </div>
          {gateways.length === 0 ? (
            <EmptyState
              icon={<Radio className="h-10 w-10 text-gray-400" />}
              title="Nenhum gateway cadastrado"
              description="Adicione um gateway para conectar detectores ao sistema de monitoramento."
              action={
                <Link
                  href={`/dashboard/buildings/${buildingId}/gateways/new`}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4" /> Adicionar gateway
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {gateways.map((gw) => (
                <button
                  key={gw.id}
                  onClick={() => goToEvents({ type: 'gateway', id: gw.id, name: gw.name })}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
                      <Radio className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{gw.name}</p>
                      <p className="font-mono text-xs text-gray-500">{gw.eui}</p>
                      {gw.serial_number && (
                        <p className="text-xs text-gray-400">S/N: {gw.serial_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(gw.status)}`}
                    >
                      {statusLabel(gw.status)}
                    </span>
                    {gw.firmware && (
                      <span className="text-xs text-gray-400">fw {gw.firmware}</span>
                    )}
                    <span className="text-xs text-gray-400">Ver eventos →</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detectors */}
      {activeTab === 'Detectores' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Link
              href={`/dashboard/buildings/${buildingId}/detectors/new`}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" /> Adicionar detector
            </Link>
          </div>
          {detectors.length === 0 ? (
            <EmptyState
              icon={<ScanSearch className="h-10 w-10 text-gray-400" />}
              title="Nenhum detector cadastrado"
              description="Adicione detectores de fumaça, calor ou CO para monitorar o edifício."
              action={
                <Link
                  href={`/dashboard/buildings/${buildingId}/detectors/new`}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4" /> Adicionar detector
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {detectors.map((det) => (
                <button
                  key={det.id}
                  onClick={() => goToEvents({ type: 'detector', id: det.id, name: det.name })}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100">
                      <ScanSearch className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{det.name}</p>
                      <p className="font-mono text-xs text-gray-500">{det.eui}</p>
                      {det.serial_number && (
                        <p className="text-xs text-gray-400">S/N: {det.serial_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(det.status)}`}
                    >
                      {statusLabel(det.status)}
                    </span>
                    {det.battery_level && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Battery className="h-3 w-3" />
                        {batteryLabel(det.battery_level)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{det.type}</span>
                    <span className="text-xs text-gray-400">Ver eventos →</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alarms */}
      {activeTab === 'Alarmes' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Link
              href={`/dashboard/buildings/${buildingId}/alarms/new`}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" /> Adicionar alarme
            </Link>
          </div>
          {alarms.length === 0 ? (
            <EmptyState
              icon={<Siren className="h-10 w-10 text-gray-400" />}
              title="Nenhum alarme cadastrado"
              description="Adicione sirenes e painéis de alarme para completar o sistema de detecção."
              action={
                <Link
                  href={`/dashboard/buildings/${buildingId}/alarms/new`}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4" /> Adicionar alarme
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {alarms.map((alarm) => (
                <button
                  key={alarm.id}
                  onClick={() => setActiveTab('Eventos')}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
                      <Siren className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{alarm.name}</p>
                      {alarm.serial_number && (
                        <p className="text-xs text-gray-400">S/N: {alarm.serial_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(alarm.status)}`}
                    >
                      {statusLabel(alarm.status)}
                    </span>
                    <span className="text-xs text-gray-400">Ver eventos →</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Planta Baixa */}
      {activeTab === 'Planta Baixa' && (
        <FloorPlanEditor
          buildingId={buildingId}
          floors={floors}
          gateways={localGateways}
          setGateways={setLocalGateways}
          detectors={localDetectors}
          setDetectors={setLocalDetectors}
          alarms={localAlarms}
          setAlarms={setLocalAlarms}
        />
      )}

      {/* Events */}
      {activeTab === 'Eventos' && (
        <div>
          {activeFilter && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-2">
              <span className="text-sm text-orange-800">
                Filtrando eventos de: <strong>{activeFilter.name}</strong>
              </span>
              <button
                onClick={() => setActiveFilter(null)}
                className="ml-4 text-xs font-medium text-orange-600 hover:text-orange-800"
              >
                ✕ Limpar filtro
              </button>
            </div>
          )}
          {filteredEvents.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-10 w-10 text-gray-400" />}
              title="Nenhum evento registrado"
              description={
                activeFilter
                  ? `Nenhum evento encontrado para ${activeFilter.name}.`
                  : 'Os eventos de alarme, falha e heartbeat serão exibidos aqui em tempo real.'
              }
            />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="divide-y divide-gray-100">
                {filteredEvents.map((evt) => {
                  const gatewayName = evt.gateway_id ? gatewayMap[evt.gateway_id]?.name : null
                  const detectorName = evt.detector_id ? detectorMap[evt.detector_id]?.name : null
                  const deviceName = detectorName ?? gatewayName
                  return (
                    <div key={evt.id} className="flex items-center gap-4 px-4 py-3">
                      <span className="w-40 shrink-0 text-sm font-medium text-gray-900">
                        {eventLabel(evt.type)}
                      </span>
                      {deviceName && (
                        <span className="w-40 shrink-0 truncate text-xs text-gray-600">
                          {deviceName}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(evt.received_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FloorPlanEditor({
  buildingId,
  floors,
  gateways,
  setGateways,
  detectors,
  setDetectors,
  alarms,
  setAlarms,
}: {
  buildingId: string
  floors: Floor[]
  gateways: Gateway[]
  setGateways: Dispatch<SetStateAction<Gateway[]>>
  detectors: Detector[]
  setDetectors: Dispatch<SetStateAction<Detector[]>>
  alarms: Alarm[]
  setAlarms: Dispatch<SetStateAction<Alarm[]>>
}) {
  const [floorId, setFloorId] = useState<string>(floors[0]?.id ?? '')
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [selected, setSelected] = useState<{
    type: 'detector' | 'gateway' | 'alarm'
    id: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const imgWrapperRef = useRef<HTMLDivElement>(null)
  const isPanning = useRef(false)
  const lastPanPoint = useRef({ x: 0, y: 0 })

  const floor = floors.find((f) => f.id === floorId)
  const floorDetectors = detectors.filter((d) => d.floor_id === floorId && d.pos_x != null)
  const floorGateways = gateways.filter((g) => g.floor_id === floorId && g.pos_x != null)
  const floorAlarms = alarms.filter((a) => a.floor_id === floorId && a.pos_x != null)

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    setZoom((prev) => Math.max(0.25, Math.min(6, prev * factor)))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selected) return
    isPanning.current = true
    lastPanPoint.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastPanPoint.current.x
    const dy = e.clientY - lastPanPoint.current.y
    lastPanPoint.current = { x: e.clientX, y: e.clientY }
    setPanX((prev) => prev + dx)
    setPanY((prev) => prev + dy)
  }

  const handleMouseUp = () => {
    isPanning.current = false
  }

  const savePosition = async (
    type: 'detector' | 'gateway' | 'alarm',
    id: string,
    posX: number,
    posY: number,
    targetFloorId: string,
  ) => {
    setSaving(true)
    try {
      const supabase = createClient()
      const table =
        type === 'detector' ? 'detectors' : type === 'gateway' ? 'gateways' : 'alarms'
      const { error } = await supabase
        .from(table)
        .update({ pos_x: posX, pos_y: posY, floor_id: targetFloorId })
        .eq('id', id)
      if (error) throw error
      setSaveMsg('Posição salva!')
    } catch (err) {
      console.error('Error saving device position:', err)
      setSaveMsg('Erro ao salvar posição')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 2500)
    }
  }

  const handleFloorPlanClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selected || !floorId) return
    const imgWrapper = imgWrapperRef.current
    if (!imgWrapper) return
    const rect = imgWrapper.getBoundingClientRect()
    const posX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const posY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))

    const { type, id } = selected
    if (type === 'detector') {
      setDetectors((prev) =>
        prev.map((d) => (d.id === id ? { ...d, pos_x: posX, pos_y: posY, floor_id: floorId } : d)),
      )
    } else if (type === 'gateway') {
      setGateways((prev) =>
        prev.map((g) => (g.id === id ? { ...g, pos_x: posX, pos_y: posY, floor_id: floorId } : g)),
      )
    } else {
      setAlarms((prev) =>
        prev.map((a) => (a.id === id ? { ...a, pos_x: posX, pos_y: posY, floor_id: floorId } : a)),
      )
    }
    setSelected(null)
    await savePosition(type, id, posX, posY, floorId)
  }

  const removeDevicePosition = async (
    type: 'detector' | 'gateway' | 'alarm',
    id: string,
  ) => {
    if (type === 'detector') {
      setDetectors((prev) =>
        prev.map((d) => (d.id === id ? { ...d, pos_x: null, pos_y: null, floor_id: null } : d)),
      )
    } else if (type === 'gateway') {
      setGateways((prev) =>
        prev.map((g) => (g.id === id ? { ...g, pos_x: null, pos_y: null, floor_id: null } : g)),
      )
    } else {
      setAlarms((prev) =>
        prev.map((a) => (a.id === id ? { ...a, pos_x: null, pos_y: null, floor_id: null } : a)),
      )
    }
    const supabase = createClient()
    const table =
      type === 'detector' ? 'detectors' : type === 'gateway' ? 'gateways' : 'alarms'
    await supabase
      .from(table)
      .update({ pos_x: null, pos_y: null, floor_id: null })
      .eq('id', id)
  }

  if (floors.length === 0) {
    return (
      <EmptyState
        icon={<Map className="h-10 w-10 text-gray-400" />}
        title="Nenhum andar cadastrado"
        description="Adicione um andar com planta baixa para começar a posicionar dispositivos."
        action={
          <Link
            href={`/dashboard/buildings/${buildingId}/floors/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
          >
            <Plus className="h-4 w-4" /> Adicionar andar
          </Link>
        }
      />
    )
  }

  return (
    <div className="flex gap-4" style={{ height: '580px' }}>
      {/* Device list sidebar */}
      <div className="flex w-56 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Dispositivos
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {/* Detectors */}
          {detectors.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 px-1 text-xs text-gray-400">Detectores</p>
              <div className="space-y-0.5">
                {detectors.map((det) => {
                  const isSelected = selected?.type === 'detector' && selected.id === det.id
                  const positionedHere = det.floor_id === floorId && det.pos_x != null
                  const positionedElsewhere =
                    det.floor_id !== floorId && det.pos_x != null && det.floor_id != null
                  return (
                    <div
                      key={det.id}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                        isSelected ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      <button
                        className="flex flex-1 items-center gap-1.5 text-left"
                        onClick={() =>
                          setSelected(isSelected ? null : { type: 'detector', id: det.id })
                        }
                        title={isSelected ? 'Cancelar seleção' : 'Selecionar para posicionar'}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${positionedHere ? 'bg-orange-100' : 'bg-gray-100'}`}
                        >
                          <ScanSearch
                            className={`h-3 w-3 ${positionedHere ? 'text-orange-600' : 'text-gray-500'}`}
                          />
                        </span>
                        <span className="min-w-0 truncate text-gray-700">{det.name}</span>
                        {positionedHere && (
                          <span className="shrink-0 text-green-500" title="Posicionado aqui">
                            ●
                          </span>
                        )}
                        {positionedElsewhere && (
                          <span className="shrink-0 text-gray-400" title="Posicionado em outro andar">
                            ○
                          </span>
                        )}
                      </button>
                      {positionedHere && (
                        <button
                          className="shrink-0 text-gray-300 hover:text-red-500"
                          onClick={() => removeDevicePosition('detector', det.id)}
                          title="Remover posição"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Gateways */}
          {gateways.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 px-1 text-xs text-gray-400">Gateways</p>
              <div className="space-y-0.5">
                {gateways.map((gw) => {
                  const isSelected = selected?.type === 'gateway' && selected.id === gw.id
                  const positionedHere = gw.floor_id === floorId && gw.pos_x != null
                  const positionedElsewhere =
                    gw.floor_id !== floorId && gw.pos_x != null && gw.floor_id != null
                  return (
                    <div
                      key={gw.id}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                        isSelected ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      <button
                        className="flex flex-1 items-center gap-1.5 text-left"
                        onClick={() =>
                          setSelected(isSelected ? null : { type: 'gateway', id: gw.id })
                        }
                        title={isSelected ? 'Cancelar seleção' : 'Selecionar para posicionar'}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${positionedHere ? 'bg-purple-100' : 'bg-gray-100'}`}
                        >
                          <Radio
                            className={`h-3 w-3 ${positionedHere ? 'text-purple-600' : 'text-gray-500'}`}
                          />
                        </span>
                        <span className="min-w-0 truncate text-gray-700">{gw.name}</span>
                        {positionedHere && (
                          <span className="shrink-0 text-green-500" title="Posicionado aqui">
                            ●
                          </span>
                        )}
                        {positionedElsewhere && (
                          <span className="shrink-0 text-gray-400" title="Posicionado em outro andar">
                            ○
                          </span>
                        )}
                      </button>
                      {positionedHere && (
                        <button
                          className="shrink-0 text-gray-300 hover:text-red-500"
                          onClick={() => removeDevicePosition('gateway', gw.id)}
                          title="Remover posição"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Alarms */}
          {alarms.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 px-1 text-xs text-gray-400">Alarmes</p>
              <div className="space-y-0.5">
                {alarms.map((alarm) => {
                  const isSelected = selected?.type === 'alarm' && selected.id === alarm.id
                  const positionedHere = alarm.floor_id === floorId && alarm.pos_x != null
                  const positionedElsewhere =
                    alarm.floor_id !== floorId && alarm.pos_x != null && alarm.floor_id != null
                  return (
                    <div
                      key={alarm.id}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                        isSelected ? 'bg-red-100 text-red-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      <button
                        className="flex flex-1 items-center gap-1.5 text-left"
                        onClick={() =>
                          setSelected(isSelected ? null : { type: 'alarm', id: alarm.id })
                        }
                        title={isSelected ? 'Cancelar seleção' : 'Selecionar para posicionar'}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${positionedHere ? 'bg-red-100' : 'bg-gray-100'}`}
                        >
                          <Siren
                            className={`h-3 w-3 ${positionedHere ? 'text-red-600' : 'text-gray-500'}`}
                          />
                        </span>
                        <span className="min-w-0 truncate text-gray-700">{alarm.name}</span>
                        {positionedHere && (
                          <span className="shrink-0 text-green-500" title="Posicionado aqui">
                            ●
                          </span>
                        )}
                        {positionedElsewhere && (
                          <span className="shrink-0 text-gray-400" title="Posicionado em outro andar">
                            ○
                          </span>
                        )}
                      </button>
                      {positionedHere && (
                        <button
                          className="shrink-0 text-gray-300 hover:text-red-500"
                          onClick={() => removeDevicePosition('alarm', alarm.id)}
                          title="Remover posição"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {detectors.length === 0 && gateways.length === 0 && alarms.length === 0 && (
            <p className="px-1 text-xs text-gray-400">Nenhum dispositivo cadastrado.</p>
          )}
        </div>
      </div>

      {/* Main floor plan area */}
      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        {/* Toolbar */}
        <div className="flex shrink-0 items-center justify-between gap-2">
          <select
            value={floorId}
            onChange={(e) => {
              setFloorId(e.target.value)
              setZoom(1)
              setPanX(0)
              setPanY(0)
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} (Nível {f.level})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            {saving && <span className="text-xs text-gray-500">Salvando...</span>}
            <button
              onClick={() => setZoom((z) => Math.min(6, z * 1.25))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="min-w-[3rem] text-center text-xs text-gray-500">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.max(0.25, z / 1.25))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setZoom(1)
                setPanX(0)
                setPanY(0)
              }}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
              title="Resetar visualização"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Floor plan canvas */}
        <div
          ref={containerRef}
          className={`relative flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 ${
            selected ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
          }`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {floor ? (
            floor.floor_plan_url ? (
              <div
                style={{
                  position: 'absolute',
                  transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                  transformOrigin: '0 0',
                }}
                onClick={handleFloorPlanClick}
              >
                <div ref={imgWrapperRef} className="relative select-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={floor.floor_plan_url}
                    alt={floor.name}
                    draggable={false}
                    className="block"
                    style={{ maxWidth: '900px', maxHeight: '500px' }}
                  />

                  {/* Detector markers */}
                  {floorDetectors.map((det) => (
                    <button
                      key={det.id}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-2 border-white shadow transition-transform hover:scale-125 ${
                        det.status === 'alarm'
                          ? 'animate-pulse bg-red-500'
                          : det.status === 'fault'
                            ? 'bg-yellow-500'
                            : det.status === 'offline'
                              ? 'bg-gray-400'
                              : 'bg-green-500'
                      } ${selected?.type === 'detector' && selected.id === det.id ? 'ring-2 ring-orange-400 ring-offset-1' : ''}`}
                      style={{
                        left: `${det.pos_x}%`,
                        top: `${det.pos_y}%`,
                        width: '22px',
                        height: '22px',
                      }}
                      title={`${det.name} – ${statusLabel(det.status)}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelected(
                          selected?.type === 'detector' && selected.id === det.id
                            ? null
                            : { type: 'detector', id: det.id },
                        )
                      }}
                    >
                      <ScanSearch className="h-3 w-3 text-white" />
                    </button>
                  ))}

                  {/* Gateway markers */}
                  {floorGateways.map((gw) => (
                    <button
                      key={gw.id}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-2 border-white bg-purple-500 shadow transition-transform hover:scale-125 ${
                        selected?.type === 'gateway' && selected.id === gw.id
                          ? 'ring-2 ring-purple-400 ring-offset-1'
                          : ''
                      }`}
                      style={{
                        left: `${gw.pos_x}%`,
                        top: `${gw.pos_y}%`,
                        width: '22px',
                        height: '22px',
                      }}
                      title={`${gw.name} – ${statusLabel(gw.status)}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelected(
                          selected?.type === 'gateway' && selected.id === gw.id
                            ? null
                            : { type: 'gateway', id: gw.id },
                        )
                      }}
                    >
                      <Radio className="h-3 w-3 text-white" />
                    </button>
                  ))}

                  {/* Alarm markers */}
                  {floorAlarms.map((alarm) => (
                    <button
                      key={alarm.id}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-2 border-white bg-red-600 shadow transition-transform hover:scale-125 ${
                        alarm.status === 'triggered' ? 'animate-pulse' : ''
                      } ${
                        selected?.type === 'alarm' && selected.id === alarm.id
                          ? 'ring-2 ring-red-400 ring-offset-1'
                          : ''
                      }`}
                      style={{
                        left: `${alarm.pos_x}%`,
                        top: `${alarm.pos_y}%`,
                        width: '22px',
                        height: '22px',
                      }}
                      title={`${alarm.name} – ${statusLabel(alarm.status)}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelected(
                          selected?.type === 'alarm' && selected.id === alarm.id
                            ? null
                            : { type: 'alarm', id: alarm.id },
                        )
                      }}
                    >
                      <Siren className="h-3 w-3 text-white" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <Map className="h-12 w-12 text-gray-400" />
                <p className="text-sm text-gray-500">Nenhuma planta carregada para {floor.name}</p>
                <Link
                  href={`/dashboard/buildings/${buildingId}/floors/new`}
                  className="text-xs text-orange-600 hover:underline"
                >
                  Adicionar planta
                </Link>
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-500">Selecione um andar</p>
            </div>
          )}

          {/* Toast messages */}
          {saveMsg && (
            <div
              className={`absolute bottom-4 right-4 rounded-lg px-3 py-2 text-sm text-white shadow-lg ${
                saveMsg.includes('Erro') ? 'bg-red-600' : 'bg-gray-800'
              }`}
            >
              {saveMsg}
            </div>
          )}

          {/* Placement mode indicator */}
          {selected && (
            <div className="absolute inset-x-4 top-4 flex items-center justify-between rounded-lg bg-orange-600 px-3 py-2 text-sm text-white shadow">
              <span>Clique na planta para posicionar o dispositivo</span>
              <button
                onClick={() => setSelected(null)}
                className="ml-3 font-bold hover:opacity-80"
              >
                ✕ Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
      <div className="mb-4 flex justify-center">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mb-6 text-sm text-gray-500">{description}</p>
      {action}
    </div>
  )
}

function FloorPlanMap({
  floors,
  detectors,
  gateways,
  alarms,
}: {
  floors: Floor[]
  detectors: Detector[]
  gateways: Gateway[]
  alarms: Alarm[]
}) {
  const [floorId, setFloorId] = useState(floors[0]?.id ?? '')
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const isPanning = useRef(false)
  const lastPanPoint = useRef({ x: 0, y: 0 })

  const floor = floors.find((f) => f.id === floorId)
  const floorDetectors = detectors.filter((d) => d.floor_id === floorId && d.pos_x != null)
  const floorGateways = gateways.filter((g) => g.floor_id === floorId && g.pos_x != null)
  const floorAlarms = alarms.filter((a) => a.floor_id === floorId && a.pos_x != null)

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    setZoom((prev) => Math.max(0.25, Math.min(6, prev * factor)))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    isPanning.current = true
    lastPanPoint.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastPanPoint.current.x
    const dy = e.clientY - lastPanPoint.current.y
    lastPanPoint.current = { x: e.clientX, y: e.clientY }
    setPanX((prev) => prev + dx)
    setPanY((prev) => prev + dy)
  }

  const handleMouseUp = () => {
    isPanning.current = false
  }

  if (!floor) return null

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <select
          value={floorId}
          onChange={(e) => {
            setFloorId(e.target.value)
            setZoom(1)
            setPanX(0)
            setPanY(0)
          }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} (Nível {f.level})
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(6, z * 1.25))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-xs text-gray-500">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z / 1.25))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1)
              setPanX(0)
              setPanY(0)
            }}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className={`relative h-64 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 ${floor.floor_plan_url ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {floor.floor_plan_url ? (
          <div
            style={{
              position: 'absolute',
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            <div className="relative select-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={floor.floor_plan_url}
                alt={`Planta – ${floor.name}`}
                draggable={false}
                className="block"
                style={{ maxWidth: '900px', maxHeight: '220px' }}
              />

              {/* Detector markers */}
              {floorDetectors.map((det) => {
                if (det.pos_x == null || det.pos_y == null) return null
                return (
                  <div
                    key={det.id}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-2 border-white shadow ${
                      det.status === 'alarm'
                        ? 'animate-pulse bg-red-500'
                        : det.status === 'fault'
                          ? 'bg-yellow-500'
                          : det.status === 'offline'
                            ? 'bg-gray-400'
                            : 'bg-green-500'
                    }`}
                    style={{ left: `${det.pos_x}%`, top: `${det.pos_y}%`, width: '20px', height: '20px' }}
                    title={`${det.name} – ${statusLabel(det.status)}`}
                  >
                    <ScanSearch className="h-2.5 w-2.5 text-white" />
                  </div>
                )
              })}

              {/* Gateway markers */}
              {floorGateways.map((gw) => {
                if (gw.pos_x == null || gw.pos_y == null) return null
                return (
                  <div
                    key={gw.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-2 border-white bg-purple-500 shadow"
                    style={{ left: `${gw.pos_x}%`, top: `${gw.pos_y}%`, width: '20px', height: '20px' }}
                    title={`${gw.name} – ${statusLabel(gw.status)}`}
                  >
                    <Radio className="h-2.5 w-2.5 text-white" />
                  </div>
                )
              })}

              {/* Alarm markers */}
              {floorAlarms.map((alarm) => {
                if (alarm.pos_x == null || alarm.pos_y == null) return null
                return (
                  <div
                    key={alarm.id}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-2 border-white bg-red-600 shadow ${
                      alarm.status === 'triggered' ? 'animate-pulse' : ''
                    }`}
                    style={{ left: `${alarm.pos_x}%`, top: `${alarm.pos_y}%`, width: '20px', height: '20px' }}
                    title={`${alarm.name} – ${statusLabel(alarm.status)}`}
                  >
                    <Siren className="h-2.5 w-2.5 text-white" />
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Map className="mx-auto mb-2 h-10 w-10 text-gray-400" />
              <p className="text-sm text-gray-500">{floor.name} – sem planta carregada</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
