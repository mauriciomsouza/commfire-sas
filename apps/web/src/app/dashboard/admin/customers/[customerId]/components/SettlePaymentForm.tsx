'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PAYMENT_METHODS = [
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'bank_transfer', label: 'Transferência bancária' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'manual', label: 'Outro (manual)' },
]

export function SettlePaymentForm({ customerId }: { customerId: string }) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('pix')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Informe um valor válido.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from('payment_settlements').insert({
      customer_id: customerId,
      amount: parsedAmount,
      currency: 'BRL',
      method,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      settled_by: user?.id ?? null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setSuccess(
      `Pagamento de R$ ${parsedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} registrado.`
    )
    setAmount('')
    setReference('')
    setNotes('')
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="amount" className="mb-1 block text-sm font-medium text-green-800">
          Valor (R$) <span className="text-red-500">*</span>
        </label>
        <input
          id="amount"
          type="text"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ex: 1.500,00"
          className="block w-full rounded-md border border-green-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      <div>
        <label htmlFor="method" className="mb-1 block text-sm font-medium text-green-800">
          Forma de pagamento
        </label>
        <select
          id="method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="block w-full rounded-md border border-green-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="reference" className="mb-1 block text-sm font-medium text-green-800">
          Referência / Comprovante
        </label>
        <input
          id="reference"
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Ex: E2024001, código Pix, etc."
          className="block w-full rounded-md border border-green-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-green-800">
          Observações
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Informações adicionais sobre o pagamento"
          className="block w-full rounded-md border border-green-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-100 px-4 py-3 text-sm text-green-800">{success}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-green-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Registrando…' : 'Registrar pagamento'}
      </button>
    </form>
  )
}
