'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Siren, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { use } from 'react'

interface Props {
  params: Promise<{ buildingId: string }>
}

export default function NewAlarmPage({ params }: Props) {
  const { buildingId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [isVirtual, setIsVirtual] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: insertError } = await supabase.from('alarms').insert({
      building_id: buildingId,
      name,
      serial_number: serialNumber.trim() || null,
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
          <span className="font-medium text-gray-900">Novo alarme</span>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/buildings/${buildingId}`}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Adicionar alarme</h1>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <Siren className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Informações do alarme</h2>
              <p className="text-sm text-gray-500">
                Preencha os dados da sirene ou painel de alarme.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Ex: Sirene Corredor Principal"
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
                placeholder="Ex: CFA-2024-001"
              />
              <p className="mt-1 text-xs text-gray-500">
                Número serial do hardware para controle e cobrança.
              </p>
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
                  Marque para criar um alarme virtual para testes de desenvolvimento.
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
                {loading ? 'Salvando…' : 'Adicionar alarme'}
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
