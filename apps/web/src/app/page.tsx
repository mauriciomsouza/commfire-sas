import Link from 'next/link'
import { Flame, Radio, Building2 } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-orange-50 to-white px-4">
      <div className="w-full max-w-2xl text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 shadow-lg">
            <Flame className="h-9 w-9 text-white" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900">
          Commfire <span className="text-orange-600">SAS</span>
        </h1>
        <p className="mb-8 text-xl text-gray-500">
          IoT SaaS platform for wireless fire detection systems
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center rounded-lg bg-orange-600 px-8 py-3 text-base font-semibold text-white shadow hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-8 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            Get started
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              title: 'LoRa Mesh Detection',
              description: 'Multi-hop wireless mesh network for total building coverage',
              icon: <Radio className="h-8 w-8 text-orange-600" />,
            },
            {
              title: 'Real-time Monitoring',
              description: 'Live dashboard with instant alarm notifications via Supabase Realtime',
              icon: <Flame className="h-8 w-8 text-orange-600" />,
            },
            {
              title: 'Multi-building SaaS',
              description: 'Manage multiple buildings and subscriptions from a single account',
              icon: <Building2 className="h-8 w-8 text-orange-600" />,
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-left"
            >
              <div className="mb-3">{feature.icon}</div>
              <h3 className="mb-2 font-semibold text-gray-900">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
