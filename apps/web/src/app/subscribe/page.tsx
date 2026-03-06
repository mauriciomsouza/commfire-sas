'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Flame, Minus, Plus, Radio, Bell, ArrowRight, Shield } from 'lucide-react'

const PRICES = {
  detector: 60,
  alarm: 30,
  gateway: 250,
}

const DEFAULTS = {
  detectors: 2,
  alarms: 1,
  gateways: 1,
}

function QuantitySelector({
  label,
  description,
  price,
  value,
  onChange,
  icon,
}: {
  label: string
  description: string
  price: number
  value: number
  onChange: (v: number) => void
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-orange-50">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
        <p className="mt-1 text-sm font-medium text-orange-600">
          R$ {price.toFixed(2).replace('.', ',')}/mês por unidade
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors"
          aria-label={`Diminuir ${label}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-lg font-bold text-gray-900">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors"
          aria-label={`Aumentar ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function SubscribePage() {
  const router = useRouter()
  const [detectors, setDetectors] = useState(DEFAULTS.detectors)
  const [alarms, setAlarms] = useState(DEFAULTS.alarms)
  const [gateways, setGateways] = useState(DEFAULTS.gateways)

  const total =
    detectors * PRICES.detector + alarms * PRICES.alarm + gateways * PRICES.gateway

  function handleContinue() {
    const params = new URLSearchParams({
      detectors: String(detectors),
      alarms: String(alarms),
      gateways: String(gateways),
    })
    router.push(`/auth/register?${params.toString()}`)
  }

  const isValid = detectors > 0 && gateways > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600">
              <Flame className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <span className="text-lg font-bold text-gray-900">
              Commfire <span className="text-orange-600">SAS</span>
            </span>
          </Link>
          <Link href="/auth/login" className="text-sm text-gray-500 hover:text-orange-600 transition-colors">
            Já tenho conta
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Monte seu plano</h1>
          <p className="mt-2 text-gray-500">
            Selecione a quantidade de dispositivos para o seu edifício. Cada gateway habilita um
            novo edifício na sua conta.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left – Selectors */}
          <div className="space-y-4 lg:col-span-2">
            <QuantitySelector
              label="Detectores de Fumaça"
              description="Detectores óticos sem fio com rede mesh LoRa"
              price={PRICES.detector}
              value={detectors}
              onChange={setDetectors}
              icon={<Flame className="h-6 w-6 text-orange-600" />}
            />
            <QuantitySelector
              label="Alarmes Sonoros"
              description="Alarmes de 85 dB para evacuação imediata"
              price={PRICES.alarm}
              value={alarms}
              onChange={setAlarms}
              icon={<Bell className="h-6 w-6 text-orange-600" />}
            />
            <QuantitySelector
              label="Gateways"
              description="Concentrador de rede – 1 gateway por edifício"
              price={PRICES.gateway}
              value={gateways}
              onChange={setGateways}
              icon={<Radio className="h-6 w-6 text-orange-600" />}
            />

            {!isValid && (
              <p className="text-sm text-red-600">
                Selecione ao menos 1 detector e 1 gateway para continuar.
              </p>
            )}
          </div>

          {/* Right – Summary */}
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-gray-900">Resumo do plano</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <span>
                    {detectors}× Detector{detectors !== 1 ? 'es' : ''} × R${' '}
                    {PRICES.detector},00
                  </span>
                  <span className="font-medium text-gray-900">
                    R$ {(detectors * PRICES.detector).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>
                    {alarms}× Alarme{alarms !== 1 ? 's' : ''} × R$ {PRICES.alarm},00
                  </span>
                  <span className="font-medium text-gray-900">
                    R$ {(alarms * PRICES.alarm).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>
                    {gateways}× Gateway{gateways !== 1 ? 's' : ''} × R$ {PRICES.gateway},00
                  </span>
                  <span className="font-medium text-gray-900">
                    R$ {(gateways * PRICES.gateway).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Total mensal</span>
                    <span className="text-xl font-bold text-orange-600">
                      R$ {total.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">+ impostos aplicáveis</p>
                </div>
              </div>
            </div>

            {/* Gateways = buildings info */}
            {gateways > 0 && (
              <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                <p className="font-medium">
                  {gateways} edifício{gateways !== 1 ? 's' : ''} incluído
                  {gateways !== 1 ? 's' : ''}
                </p>
                <p className="mt-1 text-blue-600">Cada gateway habilita um edifício na sua conta.</p>
              </div>
            )}

            <div className="rounded-lg bg-orange-50 p-4 text-sm text-orange-800">
              <p className="flex items-center gap-2 font-medium">
                <Shield className="h-4 w-4" /> Instalação profissional inclusa
              </p>
              <p className="mt-1 text-orange-600">
                Após a criação da conta, agendaremos a instalação por um de nossos colaboradores.
              </p>
            </div>

            <button
              type="button"
              onClick={handleContinue}
              disabled={!isValid}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-base font-semibold text-white shadow hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              Criar conta <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
