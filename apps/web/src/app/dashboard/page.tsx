import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, Radio, ScanSearch, Siren, Plus } from 'lucide-react'

export const metadata: Metadata = { title: 'Overview' }

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor all your fire detection systems from one place.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Buildings', value: '—', color: 'blue', icon: <Building2 className="h-6 w-6 text-blue-500" /> },
          { label: 'Gateways', value: '—', color: 'green', icon: <Radio className="h-6 w-6 text-green-500" /> },
          { label: 'Detectors', value: '—', color: 'orange', icon: <ScanSearch className="h-6 w-6 text-orange-500" /> },
          { label: 'Active Alarms', value: '0', color: 'red', icon: <Siren className="h-6 w-6 text-red-500" /> },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              {stat.icon}
              <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/buildings"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
          >
            <Building2 className="h-4 w-4" /> Manage buildings
          </Link>
          <Link
            href="/dashboard/buildings"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add building
          </Link>
        </div>
      </div>
    </div>
  )
}
