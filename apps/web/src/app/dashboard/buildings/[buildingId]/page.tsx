import type { Metadata } from 'next'
import Link from 'next/link'
import { Layers, Radio, ScanSearch, Siren, Map } from 'lucide-react'

export const metadata: Metadata = { title: 'Building' }

interface Props {
  params: Promise<{ buildingId: string }>
}

export default async function BuildingPage({ params }: Props) {
  const { buildingId } = await params
  return (
    <div>
      <div className="mb-6">
        <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/buildings" className="hover:text-gray-700">Buildings</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Building details</span>
        </nav>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Building {buildingId}</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Online
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {['Overview', 'Floors', 'Gateways', 'Detectors', 'Events', 'Billing'].map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              i === 0
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Stats */}
        <div className="lg:col-span-1 space-y-4">
          {[
            { label: 'Floors', value: '—', icon: <Layers className="h-5 w-5 text-gray-500" /> },
            { label: 'Gateways', value: '—', icon: <Radio className="h-5 w-5 text-gray-500" /> },
            { label: 'Detectors', value: '—', icon: <ScanSearch className="h-5 w-5 text-gray-500" /> },
            { label: 'Active alarms', value: '0', icon: <Siren className="h-5 w-5 text-gray-500" /> },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                {stat.icon}
                <span className="text-sm font-medium text-gray-700">{stat.label}</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Floor plan placeholder */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Floor plan</h2>
          <FloorPlanPlaceholder />
        </div>
      </div>
    </div>
  )
}

function FloorPlanPlaceholder() {
  return (
    <div className="relative h-64 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
      <div className="text-center">
        <div className="mb-2 flex justify-center">
          <Map className="h-10 w-10 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-500">Upload a floor plan to visualize detectors</p>
        <button className="mt-3 text-xs text-orange-600 hover:underline">Upload floor plan</button>
      </div>

      {/* Demo detector dots */}
      {[
        { x: 20, y: 30, status: 'normal' },
        { x: 50, y: 60, status: 'alarm' },
        { x: 75, y: 25, status: 'normal' },
        { x: 35, y: 80, status: 'normal' },
        { x: 85, y: 70, status: 'fault' },
      ].map((det, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: `${det.x}%`, top: `${det.y}%` }}
          title={`Detector ${i + 1} – ${det.status}`}
        >
          <div
            className={`h-4 w-4 rounded-full border-2 border-white shadow ${
              det.status === 'alarm'
                ? 'bg-red-500 animate-pulse'
                : det.status === 'fault'
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
            }`}
          />
        </div>
      ))}

      {/* Demo mesh lines */}
      <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
        <line x1="20%" y1="30%" x2="50%" y2="60%" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3" />
        <line x1="50%" y1="60%" x2="75%" y2="25%" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3" />
        <line x1="20%" y1="30%" x2="35%" y2="80%" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3" />
        <line x1="75%" y1="25%" x2="85%" y2="70%" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3" />
      </svg>
    </div>
  )
}
