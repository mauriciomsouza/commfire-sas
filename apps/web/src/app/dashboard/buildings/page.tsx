import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, Plus } from 'lucide-react'

export const metadata: Metadata = { title: 'Buildings' }

export default function BuildingsPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buildings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your monitored buildings and their subscriptions.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition-colors">
          <Plus className="h-4 w-4" /> Add building
        </button>
      </div>

      {/* Empty state */}
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <div className="mb-4 flex justify-center">
          <Building2 className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">No buildings yet</h3>
        <p className="mb-6 text-sm text-gray-500">
          Add your first building to start monitoring fire detection systems.
        </p>
        <button className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors">
          <Plus className="h-4 w-4" /> Add your first building
        </button>
      </div>
    </div>
  )
}
