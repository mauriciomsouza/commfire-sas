'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ScanSearch, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { use } from 'react'

interface Props {
  params: Promise<{ buildingId: string }>
}

const DETECTOR_TYPES = [
  { value: 'smoke', label: 'Fumaça' },
  { value: 'heat', label: 'Calor' },
  { value: 'co', label: 'Monóxido de carbono (CO)' },
  { value: 'multi', label: 'Multi-sensor' },
]

export default function NewDetectorPage({ params }: Props) {
  const { buildingId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [eui, setEui] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [type, setType] = useState('smoke')
  const [gatewayId, setGatewayId] = useState('')
  const [isVirtual, setIsVirtual] = useState(false)
  const [gateways, setGateways] = useState<{ id: string; name: string; eui: string }[]>([])
  const [gatewaysLoaded, setGatewaysLoaded] = useState(false)

  async function loadGateways() {
    if (gatewaysLoaded) return
    const supabase = createClient()
    const { data } = await supabase
      .from('gateways')
      .select('id, name, eui')
      .eq('building_id', buildingId)
      .order('created_at')
    setGateways(data ?? [])
    setGatewaysLoaded(true)
    if (data && data.length > 0) setGatewayId(data[0].id)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!gatewayId) {
      setError('Selecione um gateway.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { error: insertError } = await supabase.from('detectors').insert({
      gateway_id: gatewayId,
      name,
      eui: eui.trim().toUpperCase(),
      serial_number: serialNumber.trim() || null,
      type,
      is_virtual: isVirtual,
      status: 'normal',
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/buildings/${buildingId}`)
  }

  return (
    <div>
      <div className="mb-6">
        <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/buildings" className="hover:text-gray-700">
            Edifícios
          </Link>
          <span>/</span>
          <Link href={`/dashboard/buildings/${buildingId}`} className="hover:text-gray-700">
            Edifício
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-900">Novo detector</span>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/buildings/${buildingId}`}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Adicionar detector</h1>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <ScanSearch className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Informações do detector</h2>
              <p className="text-sm text-gray-500">
                Preencha os dados do detector a ser instalado.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} onFocus={loadGateways} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Ex: Detector Sala 3 – 1º andar"
              />
            </div>

            <div>
              <label htmlFor="type" className="mb-1 block text-sm font-medium text-gray-700">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {DETECTOR_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="eui" className="mb-1 block text-sm font-medium text-gray-700">
                EUI-64 <span className="text-red-500">*</span>
              </label>
              <input
                id="eui"
                type="text"
                required
                value={eui}
                onChange={(e) => setEui(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="AA:BB:CC:DD:EE:FF:00:01"
                pattern="[0-9A-Fa-f:]{23}"
                title="EUI-64 no formato AA:BB:CC:DD:EE:FF:00:01"
              />
            </div>

            <div>
              <label
                htmlFor="serialNumber"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Número serial
              </label>
              <input
                id="serialNumber"
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Ex: CFD-2024-001"
              />
              <p className="mt-1 text-xs text-gray-500">
                Número serial do hardware para controle e cobrança.
              </p>
            </div>

            <div>
              <label
                htmlFor="gatewayId"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Gateway <span className="text-red-500">*</span>
              </label>
              {!gatewaysLoaded ? (
                <button
                  type="button"
                  onClick={loadGateways}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-left text-sm text-gray-400 shadow-sm hover:border-orange-400"
                >
                  Clique para carregar gateways…
                </button>
              ) : gateways.length === 0 ? (
                <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
                  Nenhum gateway encontrado.{' '}
                  <Link
                    href={`/dashboard/buildings/${buildingId}/gateways/new`}
                    className="font-semibold underline"
                  >
                    Adicione um gateway primeiro.
                  </Link>
                </div>
              ) : (
                <select
                  id="gatewayId"
                  value={gatewayId}
                  onChange={(e) => setGatewayId(e.target.value)}
                  required
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {gateways.map((gw) => (
                    <option key={gw.id} value={gw.id}>
                      {gw.name} ({gw.eui})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <input
                id="isVirtual"
                type="checkbox"
                checked={isVirtual}
                onChange={(e) => setIsVirtual(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <label htmlFor="isVirtual" className="text-sm">
                <span className="font-medium text-orange-800">Dispositivo virtual</span>
                <p className="mt-0.5 text-orange-700">
                  Marque para criar um detector virtual para testes de desenvolvimento.
                </p>
              </label>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Salvando…' : 'Adicionar detector'}
              </button>
              <Link
                href={`/dashboard/buildings/${buildingId}`}
                className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
