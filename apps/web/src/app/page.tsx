import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-orange-50 to-white px-4">
      <div className="w-full max-w-2xl text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 shadow-lg">
            <svg
              className="h-9 w-9 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.362-6.386z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z"
              />
            </svg>
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
              icon: '📡',
            },
            {
              title: 'Real-time Monitoring',
              description: 'Live dashboard with instant alarm notifications via Supabase Realtime',
              icon: '🔥',
            },
            {
              title: 'Multi-building SaaS',
              description: 'Manage multiple buildings and subscriptions from a single account',
              icon: '🏢',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-left"
            >
              <div className="mb-3 text-3xl">{feature.icon}</div>
              <h3 className="mb-2 font-semibold text-gray-900">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
