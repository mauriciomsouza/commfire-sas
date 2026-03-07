'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function generateEUI() {
  const bytes = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  )
  return bytes.join(':')
}

function generateSerial(prefix: string) {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `${prefix}-${year}-${rand}`
}

export function AddVirtualDeviceForm() {
  const router = useRouter()
  const [deviceType, setDeviceType] = useState<'gateway' | 'detector' | 'alarm'>('gateway')
  const [name, setName] = useState('')
  const [eui, setEui] = useState(generateEUI())
  const [serial, setSerial] = useState(generateSerial('CFG'))
  const [detectorType, setDetectorType] = useState('smoke')
  const [buildingId, setBuildingId] = useState('')
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([])
  const [buildingsLoaded, setBuildingsLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function loadBuildings() {
    if (buildingsLoaded) return
    const supabase = createClient()
    const { data } = await supabase.from('buildings').select('id, name').order('name')
    setBuildings(data ?? [])
    setBuildingsLoaded(true)
    if (data && data.length > 0) setBuildingId(data[0].id)
  }

  function handleTypeChange(type: 'gateway' | 'detector' | 'alarm') {
    setDeviceType(type)
    const prefix = type === 'gateway' ? 'CFG' : type === 'detector' ? 'CFD' : 'CFA'
    setSerial(generateSerial(prefix))
    setEui(generateEUI())
    setError(null)
    setSuccess(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (!buildingId) {
      setError('Selecione um edifício.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    if (deviceType === 'gateway') {
      const { error: err } = await supabase.from('gateways').insert({
        building_id: buildingId,
        name: name || `Gateway Virtual ${serial}`,
        eui,
        serial_number: serial,
        is_virtual: true,
        status: 'offline',
        firmware: 'virtual-1.0.0',
      })
      if (err) { setError(err.message); setLoading(false); return }
    } else if (deviceType === 'detector') {
      // Need a gateway in the building first
      const { data: gws } = await supabase
        .from('gateways')
        .select('id')
        .eq('building_id', buildingId)
        .limit(1)

      if (!gws || gws.length === 0) {
        setError('Crie um gateway no edifício antes de adicionar detectores virtuais.')
        setLoading(false)
        return
      }

      const { error: err } = await supabase.from('detectors').insert({
        gateway_id: gws[0].id,
        name: name || `Detector Virtual ${serial}`,
        eui,
        serial_number: serial,
        type: detectorType,
        is_virtual: true,
        status: 'normal',
      })
      if (err) { setError(err.message); setLoading(false); return }
    } else {
      const { error: err } = await supabase.from('alarms').insert({
        building_id: buildingId,
        name: name || `Alarme Virtual ${serial}`,
        serial_number: serial,
        is_virtual: true,
        status: 'normal',
      })
      if (err) { setError(err.message); setLoading(false); return }
    }

    setSuccess(`Dispositivo virtual criado com sucesso! S/N: ${serial}`)
    setName('')
    setEui(generateEUI())
    setSerial(generateSerial(deviceType === 'gateway' ? 'CFG' : deviceType === 'detector' ? 'CFD' : 'CFA'))
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} onFocus={loadBuildings} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-blue-800">Tipo de dispositivo</label>
          <select
            value={deviceType}
            onChange={(e) => handleTypeChange(e.target.value as 'gateway' | 'detector' | 'alarm')}
            className="block w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="gateway">Gateway</option>
            <option value="detector">Detector</option>
            <option value="alarm">Alarme</option>
          </select>
        </div>

        {deviceType === 'detector' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-blue-800">Tipo de sensor</label>
            <select
              value={detectorType}
              onChange={(e) => setDetectorType(e.target.value)}
              className="block w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="smoke">Fumaça</option>
              <option value="heat">Calor</option>
              <option value="co">CO</option>
              <option value="multi">Multi-sensor</option>
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-blue-800">Edifício</label>
          {!buildingsLoaded ? (
            <button
              type="button"
              onClick={loadBuildings}
              className="block w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-left text-sm text-gray-400 hover:border-blue-400"
            >
              Carregar edifícios…
            </button>
          ) : (
            <select
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              required
              className="block w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-blue-800">Nome (opcional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Será gerado automaticamente`}
            className="block w-full rounded-md border border-blue-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-blue-800">EUI-64 (gerado)</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={eui}
              onChange={(e) => setEui(e.target.value)}
              className="block w-full rounded-md border border-blue-300 px-3 py-2 font-mono text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setEui(generateEUI())}
              className="shrink-0 rounded-md border border-blue-300 bg-white px-2 py-2 text-xs text-blue-600 hover:bg-blue-50"
              title="Gerar novo EUI"
            >
              ↺
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-blue-800">Número serial (gerado)</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              className="block w-full rounded-md border border-blue-300 px-3 py-2 font-mono text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setSerial(generateSerial(deviceType === 'gateway' ? 'CFG' : deviceType === 'detector' ? 'CFD' : 'CFA'))}
              className="shrink-0 rounded-md border border-blue-300 bg-white px-2 py-2 text-xs text-blue-600 hover:bg-blue-50"
              title="Gerar novo serial"
            >
              ↺
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Criando…' : 'Criar dispositivo virtual'}
      </button>
    </form>
  )
}
