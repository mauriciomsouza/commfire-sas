import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutDashboard, Building2, Settings, LogOut, ShieldCheck, Users, Cpu, FlaskConical } from 'lucide-react'
import { CommfireIcon } from '@/components/commfire-logo'
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

  // Fetch profile to determine role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'platform_admin'

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Visão geral', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/dashboard/buildings', label: 'Edifícios', icon: <Building2 className="h-4 w-4" /> },
    { href: '/dashboard/settings', label: 'Configurações', icon: <Settings className="h-4 w-4" /> },
  ]

  const adminNavItems = [
    { href: '/dashboard/admin', label: 'Painel Admin', icon: <ShieldCheck className="h-4 w-4" /> },
    { href: '/dashboard/admin/customers', label: 'Clientes', icon: <Users className="h-4 w-4" /> },
    { href: '/dashboard/admin/devices', label: 'Dispositivos', icon: <Cpu className="h-4 w-4" /> },
    { href: '/dashboard/admin/simulation', label: 'Simulação', icon: <FlaskConical className="h-4 w-4" /> },
  ]

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="flex w-64 flex-col border-r border-gray-200 bg-white px-4 py-6">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2">
          <CommfireIcon className="h-8 w-8" />
          <span className="text-lg font-bold text-gray-900">Commfire</span>
        </Link>

        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="my-3 border-t border-gray-100" />
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Administrador
              </p>
              {adminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 transition-colors"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </div>

        {/* User section */}
        <div className="mt-auto border-t border-gray-200 pt-4">
          {isAdmin && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              <ShieldCheck className="h-3 w-3" /> Admin
            </span>
          )}
          <p className="mb-3 truncate px-3 text-xs text-gray-500">{user.email}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50 p-8">{children}</main>
    </div>
  )
}
