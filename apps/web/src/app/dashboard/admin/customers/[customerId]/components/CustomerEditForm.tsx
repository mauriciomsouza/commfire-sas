'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Customer {
  id: string
  name: string
  slug: string
  stripe_customer_id: string | null
}

export function CustomerEditForm({ customer }: { customer: Customer }) {
  const router = useRouter()
  const [name, setName] = useState(customer.name)
  const [stripeId, setStripeId] = useState(customer.stripe_customer_id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        name,
        stripe_customer_id: stripeId.trim() || null,
      })
      .eq('id', customer.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="custName" className="mb-1 block text-sm font-medium text-gray-700">
          Nome da empresa
        </label>
        <input
          id="custName"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      <div>
        <label htmlFor="slug" className="mb-1 block text-sm font-medium text-gray-700">
          Slug
        </label>
        <input
          id="slug"
          type="text"
          disabled
          value={customer.slug}
          className="block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 shadow-sm"
        />
      </div>

      <div>
        <label htmlFor="stripeId" className="mb-1 block text-sm font-medium text-gray-700">
          Stripe Customer ID
        </label>
        <input
          id="stripeId"
          type="text"
          value={stripeId}
          onChange={(e) => setStripeId(e.target.value)}
          placeholder="cus_xxxx"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          Dados atualizados com sucesso.
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Salvando…' : 'Salvar alterações'}
      </button>
    </form>
  )
}
