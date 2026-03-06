import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account and organisation settings.</p>
      </div>

      <div className="space-y-6">
        {/* Account section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Account</h2>
          <p className="text-sm text-gray-500">Account settings coming soon.</p>
        </div>

        {/* Organisation section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Organisation</h2>
          <p className="text-sm text-gray-500">Organisation settings coming soon.</p>
        </div>

        {/* Billing section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Billing</h2>
          <p className="text-sm text-gray-500">Billing settings coming soon.</p>
        </div>
      </div>
    </div>
  )
}
