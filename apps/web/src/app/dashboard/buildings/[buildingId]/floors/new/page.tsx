'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Layers, ArrowLeft, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { use } from 'react'

interface Props {
  params: Promise<{ buildingId: string }>
}

export default function NewFloorPage({ params }: Props) {
  const { buildingId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [level, setLevel] = useState('0')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    let floorPlanUrl: string | null = null

    if (file) {
      setUploading(true)
      const ext = file.name.split('.').pop()
      const path = `floor-plans/${buildingId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        setError(`Erro ao enviar planta: ${uploadError.message}`)
        setLoading(false)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('floor-plans').getPublicUrl(path)
      floorPlanUrl = urlData?.publicUrl ?? null
      setUploading(false)
    }

    const { error: insertError } = await supabase.from('floors').insert({
      building_id: buildingId,
      name,
      level: parseInt(level, 10),
      floor_plan_url: floorPlanUrl,
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
          <span className="font-medium text-gray-900">Novo andar</span>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/buildings/${buildingId}`}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Adicionar andar</h1>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Layers className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Informações do andar</h2>
              <p className="text-sm text-gray-500">
                Adicione um andar e, opcionalmente, faça upload da planta baixa.
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
                placeholder="Ex: Térreo, 1º andar, Cobertura"
              />
            </div>

            <div>
              <label htmlFor="level" className="mb-1 block text-sm font-medium text-gray-700">
                Nível (número do andar)
              </label>
              <input
                id="level"
                type="number"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="0 = térreo, 1 = 1º andar, -1 = subsolo"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Planta baixa (opcional)
              </label>
              <label
                htmlFor="floorPlan"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 transition-colors hover:border-orange-400 hover:bg-orange-50"
              >
                <Upload className="mb-2 h-8 w-8 text-gray-400" />
                {file ? (
                  <span className="text-sm font-medium text-orange-600">{file.name}</span>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-700">
                      Clique para selecionar ou arraste aqui
                    </span>
                    <span className="mt-1 text-xs text-gray-500">PNG, JPG, SVG ou PDF</span>
                  </>
                )}
                <input
                  id="floorPlan"
                  type="file"
                  accept="image/*,.pdf,.svg"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || uploading}
                className="rounded-md bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? 'Enviando planta…' : loading ? 'Salvando…' : 'Adicionar andar'}
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
