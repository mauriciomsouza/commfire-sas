import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2, Plus, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Edifícios' }

export default async function BuildingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: buildings } = await supabase
    .from('buildings')
    .select(
      `
      id, name, address, city, country,
      gateways(id),
      detectors:detectors(id)
    `
    )
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edifícios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie seus edifícios monitorados e suas assinaturas.
          </p>
        </div>
        <Link
          href="/dashboard/buildings/new"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" /> Adicionar edifício
        </Link>
      </div>

      {!buildings || buildings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mb-4 flex justify-center">
            <Building2 className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Nenhum edifício ainda</h3>
          <p className="mb-6 text-sm text-gray-500">
            Adicione seu primeiro edifício para começar a monitorar sistemas de detecção de
            incêndio.
          </p>
          <Link
            href="/dashboard/buildings/new"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
          >
            <Plus className="h-4 w-4" /> Adicionar seu primeiro edifício
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buildings.map((building) => {
            const gatewayCount = Array.isArray(building.gateways) ? building.gateways.length : 0
            const detectorCount = Array.isArray(building.detectors)
              ? building.detectors.length
              : 0
            return (
              <Link
                key={building.id}
                href={`/dashboard/buildings/${building.id}`}
                className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                    <Building2 className="h-5 w-5 text-orange-600" />
                  </div>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                    Ativo
                  </span>
                </div>
                <h3 className="mb-1 font-semibold text-gray-900 group-hover:text-orange-600">
                  {building.name}
                </h3>
                {(building.address || building.city) && (
                  <p className="mb-3 flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    {[building.address, building.city].filter(Boolean).join(', ')}
                  </p>
                )}
                <div className="flex gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
                  <span>{gatewayCount} gateway{gatewayCount !== 1 ? 's' : ''}</span>
                  <span>{detectorCount} detector{detectorCount !== 1 ? 'es' : ''}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
