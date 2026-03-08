# Commfire SAS

IoT SaaS platform for wireless fire detection systems.

## Architecture

```
commfire-sas/
├── apps/
│   ├── web/            # Next.js 15 dashboard (SaaS admin + customer portal)
│   └── sim-server/     # Simulation server (sends virtual device events to the web API)
├── packages/
│   ├── types/          # Shared TypeScript types
│   └── ui/             # Shared React component library (Tailwind CSS)
└── supabase/
    └── migrations/     # Postgres schema + RLS policies
```

> **Note on hardware / LoRa:** The physical gateway runtime and LoRa mesh protocol implementation
> are not part of this codebase right now. We'll tackle hardware integration once the web platform
> and business processes are solid.

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Web app | Next.js 15 (App Router), Tailwind CSS, TypeScript |
| Auth & DB | Supabase (Auth, Postgres, Realtime, Storage) |
| Billing | Stripe |

## Account types

| Type | Description |
|---|---|
| **Platform admin** | Commfire staff – access all customers and systems |
| **Customer** | Organisation managing their own buildings and subscriptions |

Each customer can have multiple buildings. Each building has its own subscription, gateways, detectors, and floor plans.

## Getting started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)
- A Supabase project
- A Stripe account (for billing)

### Installation

```bash
pnpm install
```

### Environment variables

Copy the example files and fill in your values:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/sim-server/.env.example apps/sim-server/.env   # if running sim-server locally
```

### Database setup

Run the migration against your Supabase project:

```bash
# Using Supabase CLI
supabase db push

# Or directly in the Supabase SQL editor:
# Copy the files under supabase/migrations/ in order
```

### Development

```bash
# Start web + sim-server in parallel
pnpm dev

# Or start individually
pnpm --filter @commfire/web dev
pnpm --filter @commfire/sim-server dev
```

### Build

```bash
pnpm build
```

## Apps

### Web (`apps/web`)

Next.js 15 dashboard with:
- **Landing page** – product overview and call to action
- **Auth** – sign in / register via Supabase Auth
- **Dashboard** – building overview with live status
- **Buildings** – CRUD for buildings, floors, gateways, detectors
- **Floor plan viewer** – SVG overlay with detector positions, battery / signal badges
- **Admin panel** – customer management, virtual device management, simulation panel
- **API routes** – `/api/gateway/events`, `/api/gateway/heartbeat/gateway`, `/api/gateway/heartbeat/detector` (consumed by sim-server)

### Simulation Server (`apps/sim-server`)

Node.js service that:
1. Reads virtual devices (gateways and detectors) from Supabase (`is_virtual = true`)
2. Sends periodic heartbeats to keep them appearing online in the dashboard
3. Polls the `sim_events` table for manual event commands fired from the admin simulation panel
4. Dispatches events (alarm, fault, tamper, etc.) via the web API

**Required environment variables:**
- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `BACKEND_URL` – base URL of the web app (default `http://localhost:3000`)
- `HEARTBEAT_INTERVAL_MS` – heartbeat frequency in ms (default `30000`)
- `POLL_INTERVAL_MS` – sim_events poll frequency in ms (default `5000`)

## Packages

### `@commfire/types`

All shared TypeScript interfaces: `UserProfile`, `Customer`, `Building`, `Floor`, `Gateway`, `Detector`, `DeviceEvent`, `Subscription`, `BillingPlan`, and more.

### `@commfire/ui`

Shared Tailwind CSS component library (React):
- `Badge`, `Button`, `Card` / `CardHeader` / `CardContent` / `CardFooter`
- `Input`, `StatusDot`, `Spinner`
- `cn()` utility (clsx + tailwind-merge)

## Database schema

Key tables with Row Level Security (RLS):

| Table | Description |
|---|---|
| `user_profiles` | Extended user data; role (platform_admin / customer) |
| `customers` | Organisations; linked to Stripe customer |
| `buildings` | Physical buildings owned by customers |
| `subscriptions` | Per-building Stripe subscriptions |
| `floors` | Building floors with optional floor plan image |
| `gateways` | Gateways registered to a building |
| `detectors` | Detectors linked to a gateway |
| `alarms` | Alarm panels linked to a building |
| `device_events` | Alarms, faults, heartbeats, and other device events |
| `sim_events` | Pending simulation commands dispatched by the admin panel |

Platform admins bypass RLS; customers see only their own data.
