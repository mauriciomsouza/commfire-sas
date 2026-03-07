import Link from 'next/link'
import { Flame, Radio, Building2, Shield, Wifi, Bell, ArrowRight, CheckCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600">
              <Flame className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <span className="text-lg font-bold text-gray-900">
              Commfire <span className="text-orange-600">SAS</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#recursos" className="text-sm text-gray-600 hover:text-orange-600 transition-colors">
              Recursos
            </a>
            <a href="#como-funciona" className="text-sm text-gray-600 hover:text-orange-600 transition-colors">
              Como Funciona
            </a>
            <a href="#precos" className="text-sm text-gray-600 hover:text-orange-600 transition-colors">
              Preços
            </a>
            <a href="#contato" className="text-sm text-gray-600 hover:text-orange-600 transition-colors">
              Contato
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/subscribe"
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
            >
              Começar agora <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50 to-white px-6 py-20 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                <Shield className="h-3.5 w-3.5" /> Smart Alarm System
              </span>
              <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
                Proteja seus <span className="text-orange-600">Edifícios</span> com Detecção
                Inteligente de Incêndio
              </h1>
              <p className="mb-8 text-lg text-gray-500">
                Sistema sem fio de detecção de incêndio baseado em rede mesh LoRa. Monitore múltiplos
                edifícios em tempo real com alertas instantâneos e painel centralizado.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/subscribe"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-base font-semibold text-white shadow hover:bg-orange-700 transition-colors"
                >
                  Começar agora <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                >
                  Ver como funciona
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-gray-500">
                {['Sem fio 100%', 'Instalação profissional', 'Monitoramento 24/7'].map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-orange-500" /> {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                {/* Mock header */}
                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <span className="mx-auto text-xs text-gray-400">Commfire SAS – Dashboard</span>
                </div>
                {/* Mock dashboard */}
                <div className="p-4">
                  <div className="mb-4 grid grid-cols-3 gap-3">
                    {[
                      { label: 'Edifícios', value: '3', color: 'blue' },
                      { label: 'Detectores', value: '24', color: 'orange' },
                      { label: 'Alarmes', value: '0', color: 'green' },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg bg-gray-50 p-3 text-center">
                        <p className="text-xl font-bold text-gray-900">{s.value}</p>
                        <p className="text-xs text-gray-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Mock floor plan */}
                  <div className="relative h-40 overflow-hidden rounded-lg bg-gray-100">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative h-32 w-full max-w-xs">
                        {/* Floor plan lines */}
                        <div className="absolute inset-4 rounded border-2 border-gray-300" />
                        <div className="absolute left-4 right-4 top-1/2 border border-dashed border-gray-300" />
                        {/* Detectors */}
                        <div className="absolute left-8 top-6 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white shadow">
                          T1
                        </div>
                        <div className="absolute right-12 top-8 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow">
                          T5
                        </div>
                        <div className="absolute bottom-6 left-16 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white shadow">
                          T3
                        </div>
                        {/* Gateway */}
                        <div className="absolute bottom-4 right-8 flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white shadow">
                          GW
                        </div>
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 text-xs font-medium text-gray-600">
                      Térreo
                    </div>
                  </div>
                  {/* Status panel */}
                  <div className="mt-3 rounded-lg border border-gray-200 p-3">
                    <p className="mb-2 text-xs font-semibold text-gray-700">Status da Rede</p>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" /> Gateway GW-01{' '}
                        <span className="text-green-600 font-medium">Online</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500" /> Detectores Online: 2
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" /> Detectores Offline: 1
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -right-4 -top-4 rounded-xl bg-orange-600 px-4 py-3 text-center text-white shadow-lg">
                <p className="text-2xl font-bold">1.2K+</p>
                <p className="text-xs opacity-90">Detectores instalados</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: '5+', label: 'Anos de experiência' },
              { value: '1.200+', label: 'Detectores instalados' },
              { value: '80+', label: 'Edifícios monitorados' },
              { value: '99,9%', label: 'Uptime garantido' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-orange-600">{stat.value}</p>
                <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="recursos" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Nossos recursos</h2>
            <p className="mt-3 text-gray-500">
              Tecnologia de ponta para a segurança do seu patrimônio.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Detecção Ótica',
                description:
                  'Detectores de fumaça óticos de alta sensibilidade com tecnologia LoRa mesh.',
                icon: <Flame className="h-8 w-8 text-orange-600" />,
                highlight: true,
              },
              {
                title: 'Rede sem fio',
                description:
                  'Comunicação LoRa de longo alcance sem necessidade de cabeamento complexo.',
                icon: <Wifi className="h-8 w-8 text-gray-600" />,
              },
              {
                title: 'Alertas Instantâneos',
                description:
                  'Notificações em tempo real via painel web e alarmes sonoros integrados.',
                icon: <Bell className="h-8 w-8 text-gray-600" />,
              },
              {
                title: 'Múltiplos Edifícios',
                description:
                  'Gerencie várias plantas em uma única conta com dashboards por andar.',
                icon: <Building2 className="h-8 w-8 text-gray-600" />,
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className={`rounded-xl p-6 ${
                  feat.highlight
                    ? 'bg-orange-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-900'
                }`}
              >
                <div className="mb-3">{feat.icon}</div>
                <h3 className="mb-2 font-semibold">{feat.title}</h3>
                <p className={`text-sm ${feat.highlight ? 'text-orange-100' : 'text-gray-500'}`}>
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="como-funciona" className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Como Funciona</h2>
            <p className="mt-3 text-gray-500">Da assinatura à proteção completa em 4 passos.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              {
                step: '01',
                title: 'Escolha seu plano',
                description:
                  'Selecione a quantidade de detectores, alarmes e gateways conforme o tamanho do seu edifício.',
              },
              {
                step: '02',
                title: 'Crie sua conta',
                description: 'Cadastre-se com e-mail e senha. Acesso imediato ao painel de controle.',
              },
              {
                step: '03',
                title: 'Agendamento',
                description:
                  'Um de nossos colaboradores entra em contato para agendar a instalação profissional.',
              },
              {
                step: '04',
                title: 'Monitoramento',
                description: 'Sistema ativo 24/7. Receba alertas e monitore em tempo real.',
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 text-lg font-bold text-white">
                  {s.step}
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="precos" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Preços transparentes</h2>
            <p className="mt-3 text-gray-500">
              Pague apenas pelo que você usa. Sem taxas ocultas.
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              {
                name: 'Detector de Fumaça',
                price: 'R$ 60',
                period: '/mês por unidade',
                description: 'Detector ótico sem fio com conectividade LoRa mesh.',
                features: ['Detecção ótica', 'Bateria longa duração', 'Mesh automático'],
                icon: <Flame className="h-6 w-6 text-orange-600" />,
              },
              {
                name: 'Alarme Sonoro',
                price: 'R$ 30',
                period: '/mês por unidade',
                description: 'Alarme sonoro integrado à rede para evacuação imediata.',
                features: ['85 dB de potência', 'Acionamento automático', 'Silenciamento remoto'],
                icon: <Bell className="h-6 w-6 text-orange-600" />,
              },
              {
                name: 'Gateway',
                price: 'R$ 250',
                period: '/mês por unidade',
                description:
                  'Concentrador de rede – cada gateway habilita um novo edifício à conta.',
                features: ['1 edifício por gateway', 'Redundância automática', 'Conexão 4G/Ethernet'],
                icon: <Radio className="h-6 w-6 text-orange-600" />,
                highlight: true,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 ${
                  plan.highlight
                    ? 'border-2 border-orange-600 bg-orange-50'
                    : 'border border-gray-200 bg-white'
                }`}
              >
                <div className="mb-4 flex items-center gap-2">
                  {plan.icon}
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                </div>
                <p className="mb-1 text-3xl font-bold text-gray-900">{plan.price}</p>
                <p className="mb-3 text-sm text-gray-500">{plan.period}</p>
                <p className="mb-4 text-sm text-gray-600">{plan.description}</p>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-orange-500" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/subscribe"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-8 py-3 text-base font-semibold text-white shadow hover:bg-orange-700 transition-colors"
            >
              Montar meu plano <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Monitoring highlight ── */}
      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
                Mantenha o controle de{' '}
                <span className="text-orange-600">todos os alertas e dispositivos</span>
              </h2>
              <p className="mb-6 text-gray-500">
                Visualize o mapa de cada andar, acompanhe o status de cada detector em tempo real e
                receba notificações instantâneas em caso de alarme ou falha.
              </p>
              <ul className="space-y-3">
                {[
                  'Planta baixa interativa por andar',
                  'Status online/offline de cada dispositivo',
                  'Histórico completo de eventos',
                  'Relatórios periódicos automáticos',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-orange-500" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
              <p className="mb-4 font-semibold text-gray-900">Exemplo de evento recente</p>
              <div className="space-y-3">
                {[
                  { time: '09:42', type: 'Alarme', device: 'Detector T-05', color: 'red' },
                  { time: '09:43', type: 'Alarme Resolvido', device: 'Detector T-05', color: 'green' },
                  { time: '10:15', type: 'Heartbeat', device: 'Gateway GW-01', color: 'blue' },
                  { time: '11:00', type: 'Bateria Baixa', device: 'Detector T-03', color: 'yellow' },
                ].map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
                    <span
                      className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                        ev.color === 'red'
                          ? 'bg-red-500'
                          : ev.color === 'green'
                            ? 'bg-green-500'
                            : ev.color === 'yellow'
                              ? 'bg-yellow-400'
                              : 'bg-blue-500'
                      }`}
                    />
                    <span className="text-xs text-gray-500">{ev.time}</span>
                    <span className="flex-1 text-sm font-medium text-gray-700">{ev.type}</span>
                    <span className="text-xs text-gray-500">{ev.device}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section id="contato" className="bg-orange-600 px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-3 text-3xl font-bold text-white md:text-4xl">
            Gerencie a segurança dos seus edifícios com o melhor do mercado
          </h2>
          <p className="mb-8 text-orange-100">
            Sem fios, sem complicações. Instalação feita por nossa equipe especializada.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/subscribe"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-orange-700 shadow hover:bg-orange-50 transition-colors"
            >
              Começar agora <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-6 py-3 text-base font-semibold text-white hover:border-white hover:bg-orange-700 transition-colors"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-600">
              <Flame className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <span className="font-bold text-gray-900">
              Commfire <span className="text-orange-600">SAS</span>
            </span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Commfire SAS. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <a href="#" className="hover:text-orange-600 transition-colors">
              Privacidade
            </a>
            <a href="#" className="hover:text-orange-600 transition-colors">
              Termos
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
