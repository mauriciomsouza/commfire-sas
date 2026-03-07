'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function NewBuildingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('Brasil')
  const [postalCode, setPostalCode] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.customer_id) {
      setError('Não foi possível identificar sua organização.')
      setLoading(false)
      return
    }

    const { data: building, error: insertError } = await supabase
      .from('buildings')
      .insert({
        customer_id: profile.customer_id,
        name,
        address,
        city,
        country,
        postal_code: postalCode,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/buildings/${building.id}`)
  }

  return (
    <div>
      <div className="mb-6">
        <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/buildings" className="hover:text-gray-700">
            Edifícios
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-900">Adicionar edifício</span>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/buildings"
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Novo edifício</h1>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <Building2 className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Informações do edifício</h2>
              <p className="text-sm text-gray-500">
                Preencha os dados do local a ser monitorado.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                Nome do edifício <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Ex: Torre Norte – Sede"
              />
            </div>

            <div>
              <label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-700">
                Endereço
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Rua das Flores, 123"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="mb-1 block text-sm font-medium text-gray-700">
                  Cidade
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="São Paulo"
                />
              </div>
              <div>
                <label
                  htmlFor="postalCode"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  CEP
                </label>
                <input
                  id="postalCode"
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="01310-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="country" className="mb-1 block text-sm font-medium text-gray-700">
                País
              </label>
              <input
                id="country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Brasil"
              />
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
                {loading ? 'Salvando…' : 'Salvar edifício'}
              </button>
              <Link
                href="/dashboard/buildings"
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
