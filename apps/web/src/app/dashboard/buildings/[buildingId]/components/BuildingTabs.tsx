'use client'

import { useState } from 'react'
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
} from 'lucide-react'

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
}

interface Event {
  id: string
  type: string
  received_at: string
  payload: Record<string, unknown>
}

interface BuildingTabsProps {
  buildingId: string
  floors: Floor[]
  gateways: Gateway[]
  detectors: Detector[]
  alarms: Alarm[]
  events: Event[]
}

const TABS = ['Visão geral', 'Andares', 'Gateways', 'Detectores', 'Alarmes', 'Eventos'] as const
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
              {detectors.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum detector cadastrado.</p>
              ) : (
                <dl className="space-y-2 text-sm">
                  {(['normal', 'alarm', 'fault', 'offline'] as const).map((s) => {
                    const count = detectors.filter((d) => d.status === s).length
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
                floor={floors[0]}
                detectors={detectors.filter((d) => d.floor_id === floors[0].id)}
                gateways={gateways}
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
                <div
                  key={gw.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
                      <Radio className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
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
                  </div>
                </div>
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
                <div
                  key={det.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100">
                      <ScanSearch className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
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
                  </div>
                </div>
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
                <div
                  key={alarm.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
                      <Siren className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{alarm.name}</p>
                      {alarm.serial_number && (
                        <p className="text-xs text-gray-400">S/N: {alarm.serial_number}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(alarm.status)}`}
                  >
                    {statusLabel(alarm.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Events */}
      {activeTab === 'Eventos' && (
        <div>
          {events.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-10 w-10 text-gray-400" />}
              title="Nenhum evento registrado"
              description="Os eventos de alarme, falha e heartbeat serão exibidos aqui em tempo real."
            />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="divide-y divide-gray-100">
                {events.map((evt) => (
                  <div key={evt.id} className="flex items-center gap-4 px-4 py-3">
                    <span className="w-40 shrink-0 text-sm font-medium text-gray-900">
                      {eventLabel(evt.type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(evt.received_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
  floor,
  detectors,
}: {
  floor: Floor
  detectors: Detector[]
  gateways: Gateway[]
}) {
  return (
    <div className="relative h-64 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
      {floor.floor_plan_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={floor.floor_plan_url}
          alt={`Planta – ${floor.name}`}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <Map className="mx-auto mb-2 h-10 w-10 text-gray-400" />
            <p className="text-sm text-gray-500">{floor.name} – sem planta carregada</p>
          </div>
        </div>
      )}
      {/* Detector overlays */}
      {detectors.map((det) => {
        if (det.pos_x == null || det.pos_y == null) return null
        return (
          <div
            key={det.id}
            className="absolute"
            style={{ left: `${det.pos_x}%`, top: `${det.pos_y}%` }}
            title={`${det.name} – ${statusLabel(det.status)}`}
          >
            <div
              className={`h-4 w-4 rounded-full border-2 border-white shadow ${
                det.status === 'alarm'
                  ? 'animate-pulse bg-red-500'
                  : det.status === 'fault'
                    ? 'bg-yellow-500'
                    : det.status === 'offline'
                      ? 'bg-gray-400'
                      : 'bg-green-500'
              }`}
            />
          </div>
        )
      })}
    </div>
  )
}
