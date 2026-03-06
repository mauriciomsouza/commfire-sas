'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Flame, MailCheck, CalendarCheck, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const PRICES = { detector: 60, alarm: 30, gateway: 250 }

function formatBRL(value: number) {
  return value.toFixed(2).replace('.', ',')
}

function SubscriptionSummary({
  detectors,
  alarms,
  gateways,
}: {
  detectors: number
  alarms: number
  gateways: number
}) {
  const total =
    detectors * PRICES.detector + alarms * PRICES.alarm + gateways * PRICES.gateway
  if (detectors === 0 && alarms === 0 && gateways === 0) return null
  return (
    <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
      <p className="mb-3 text-sm font-semibold text-orange-800">Seu plano selecionado</p>
      <ul className="space-y-1 text-sm text-orange-700">
        {detectors > 0 && (
          <li className="flex justify-between">
            <span>
              {detectors}× Detector{detectors !== 1 ? 'es' : ''} × R$ {PRICES.detector},00
            </span>
            <span className="font-medium">R$ {formatBRL(detectors * PRICES.detector)}/mês</span>
          </li>
        )}
        {alarms > 0 && (
          <li className="flex justify-between">
            <span>
              {alarms}× Alarme{alarms !== 1 ? 's' : ''} × R$ {PRICES.alarm},00
            </span>
            <span className="font-medium">R$ {formatBRL(alarms * PRICES.alarm)}/mês</span>
          </li>
        )}
        {gateways > 0 && (
          <li className="flex justify-between">
            <span>
              {gateways}× Gateway{gateways !== 1 ? 's' : ''} × R$ {PRICES.gateway},00
            </span>
            <span className="font-medium">R$ {formatBRL(gateways * PRICES.gateway)}/mês</span>
          </li>
        )}
        <li className="flex justify-between border-t border-orange-200 pt-1 font-bold text-orange-900">
          <span>Total mensal</span>
          <span>R$ {formatBRL(total)}/mês</span>
        </li>
      </ul>
    </div>
  )
}

function parsePositiveInt(value: string | null): number {
  const n = parseInt(value ?? '0', 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function RegisterForm() {
  const searchParams = useSearchParams()

  const detectors = parsePositiveInt(searchParams.get('detectors'))
  const alarms = parsePositiveInt(searchParams.get('alarms'))
  const gateways = parsePositiveInt(searchParams.get('gateways'))

  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          org_name: orgName,
          plan_detectors: detectors,
          plan_alarms: alarms,
          plan_gateways: gateways,
        },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    const total =
      detectors * PRICES.detector + alarms * PRICES.alarm + gateways * PRICES.gateway
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <MailCheck className="h-9 w-9 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Conta criada!</h2>
            <p className="mt-2 text-gray-500">
              Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para
              ativar sua conta.
            </p>

            {/* Installation scheduling confirmation */}
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-left">
              <div className="flex items-center gap-2 text-blue-800">
                <CalendarCheck className="h-5 w-5 flex-shrink-0" />
                <p className="font-semibold">Instalação profissional agendada</p>
              </div>
              <p className="mt-2 text-sm text-blue-700">
                Um de nossos colaboradores entrará em contato em até 2 dias úteis para agendar a
                instalação dos seus dispositivos.
              </p>
            </div>

            {/* Plan summary */}
            {total > 0 && (
              <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-left">
                <div className="flex items-center gap-2 text-orange-800">
                  <Shield className="h-5 w-5 flex-shrink-0" />
                  <p className="font-semibold">Seu plano</p>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-orange-700">
                  {detectors > 0 && (
                    <li>
                      {detectors} detector{detectors !== 1 ? 'es' : ''} de fumaça
                    </li>
                  )}
                  {alarms > 0 && (
                    <li>
                      {alarms} alarme{alarms !== 1 ? 's' : ''} sonoro{alarms !== 1 ? 's' : ''}
                    </li>
                  )}
                  {gateways > 0 && (
                    <li>
                      {gateways} gateway{gateways !== 1 ? 's' : ''} (
                      {gateways} edifício{gateways !== 1 ? 's' : ''})
                    </li>
                  )}
                  <li className="border-t border-orange-200 pt-1 font-bold text-orange-900">
                    R$ {formatBRL(total)}/mês
                  </li>
                </ul>
              </div>
            )}

            <Link
              href="/auth/login"
              className="mt-6 inline-block rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
            >
              Ir para o login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md py-8">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-orange-600">
            <Flame className="h-6 w-6" /> Commfire SAS
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Crie sua conta</h1>
          <p className="mt-1 text-sm text-gray-500">Comece hoje mesmo</p>
        </div>

        <SubscriptionSummary detectors={detectors} alarms={alarms} gateways={gateways} />

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="full-name" className="mb-1 block text-sm font-medium text-gray-700">
                Nome completo
              </label>
              <input
                id="full-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="João Silva"
              />
            </div>

            <div>
              <label htmlFor="org-name" className="mb-1 block text-sm font-medium text-gray-700">
                Nome da empresa
              </label>
              <input
                id="org-name"
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Minha Empresa Ltda"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="voce@empresa.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {loading ? 'Criando conta…' : 'Criar conta'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Já tem uma conta?{' '}
          <Link href="/auth/login" className="font-medium text-orange-600 hover:text-orange-700">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
