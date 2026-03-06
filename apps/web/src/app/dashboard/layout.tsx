import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Flame, LayoutDashboard, Building2, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="flex w-64 flex-col border-r border-gray-200 bg-white px-4 py-6">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600">
            <Flame className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <span className="text-lg font-bold text-gray-900">Commfire</span>
        </Link>

        <div className="space-y-1">
          {[
            { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
            { href: '/dashboard/buildings', label: 'Buildings', icon: <Building2 className="h-4 w-4" /> },
            { href: '/dashboard/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>

        {/* User section */}
        <div className="mt-auto border-t border-gray-200 pt-4">
          <p className="mb-3 truncate px-3 text-xs text-gray-500">{user.email}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50 p-8">{children}</main>
    </div>
  )
}
