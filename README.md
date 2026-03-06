# Commfire SAS

IoT SaaS platform for wireless fire detection systems using LoRa mesh networks.

## Architecture

```
commfire-sas/
├── apps/
│   ├── web/            # Next.js 15 dashboard (SaaS onboarding + monitoring)
│   ├── gateway/        # Device ingestion runtime (LoRa mesh → backend)
│   └── detector-sim/   # Virtual LoRa detector simulator
├── packages/
│   ├── types/          # Shared TypeScript types
│   ├── protocol/       # LoRa mesh frame codec (encode/decode + CRC-16)
│   ├── domain/         # Business logic (topology, event processing, battery)
│   ├── simulation/     # Virtual device utilities (VirtualDetector, VirtualMesh)
│   └── ui/             # Shared React component library (Tailwind CSS)
└── supabase/
    └── migrations/     # Postgres schema + RLS policies
```

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Web app | Next.js 15 (App Router), Tailwind CSS, TypeScript |
| Auth & DB | Supabase (Auth, Postgres, Realtime, Storage) |
| Billing | Stripe |
| Gateway runtime | Node.js / TypeScript |
| Device protocol | Custom LoRa mesh binary protocol (CRC-16/CCITT) |

## Account types

| Type | Description |
|---|---|
| **Platform admin** | Commfire staff – access all customers and systems |
| **Customer** | Organisation managing their own buildings and subscriptions |

Each customer can have multiple buildings. Each building has its own subscription, gateways, detectors, and floor plans.

## Getting started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 – install via [Corepack](https://nodejs.org/api/corepack.html) (bundled with Node.js):
  ```bash
  corepack enable
  ```
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
cp apps/gateway/.env.example apps/gateway/.env
cp apps/detector-sim/.env.example apps/detector-sim/.env
```

### Database setup

Run the migration against your Supabase project:

```bash
# Using Supabase CLI
supabase db push

# Or directly in the Supabase SQL editor:
# Copy supabase/migrations/001_initial_schema.sql
```

### Development

```bash
# Start all apps in parallel
pnpm dev

# Or start individually
pnpm --filter @commfire/web dev
pnpm --filter @commfire/gateway dev
pnpm --filter @commfire/detector-sim dev
```

### Build

```bash
pnpm build
```

### Tests

```bash
pnpm test
```

## Apps

### Web (`apps/web`)

Next.js 15 dashboard with:
- **Landing page** – product overview and call to action
- **Auth** – sign in / register via Supabase Auth
- **Dashboard** – building overview with live status
- **Buildings** – CRUD for buildings, floors, gateways, detectors
- **Floor plan viewer** – SVG overlay with detector positions, mesh links, battery / signal badges
- **Gateway API routes** – `/api/gateway/events`, `/api/gateway/heartbeat/gateway`, `/api/gateway/heartbeat/detector`

### Gateway (`apps/gateway`)

Node.js runtime that:
1. Listens on a TCP port for binary mesh frames from physical (or virtual) LoRa detectors
2. Decodes frames using `@commfire/protocol`
3. Maintains an in-memory mesh topology using `@commfire/domain`
4. Forwards events and heartbeats to the backend API via HTTPS
5. Periodically sends its own heartbeat to the backend
6. Prunes stale detectors that have not sent a heartbeat within the configured threshold

**Environment variables:** see `apps/gateway/.env.example`

### Detector Simulator (`apps/detector-sim`)

Interactive CLI that:
1. Creates a pre-wired virtual mesh using `@commfire/simulation`
2. Connects to a gateway via TCP
3. Streams heartbeats and join frames on a configurable interval
4. Accepts interactive commands to trigger alarms, faults, and other events

```
Commands:
  alarm <eui>   – trigger alarm on detector
  clear <eui>   – clear alarm on detector
  fault <eui>   – trigger fault on detector
  list          – list all virtual detectors
  quit          – stop simulator
```

## Packages

### `@commfire/types`

All shared TypeScript interfaces: `UserProfile`, `Customer`, `Building`, `Floor`, `Gateway`, `Detector`, `DeviceEvent`, `MeshTopology`, `Subscription`, `BillingPlan`, and more.

### `@commfire/protocol`

Binary frame codec for the Commfire LoRa mesh protocol:
- Frame structure: type (1B) + src EUI (8B) + dst EUI (8B) + hop count (1B) + seq (2B) + payload length (2B) + payload + CRC-16/CCITT (2B)
- `encodeFrame` / `decodeFrame`
- Payload encoders/decoders for: heartbeat, alarm, fault, tamper, low battery, join, mesh update

### `@commfire/domain`

Business logic:
- `TopologyManager` – in-memory mesh topology (upsert, mark offline, remove)
- `classifyBattery` – millivolt → battery level string
- `statusFromBitmask` – heartbeat bitmask → detector status
- `frameTypeToEventType` – frame type byte → event type string
- `buildDeviceEvent` – creates a `DeviceEvent` from raw frame data
- `isStale` – checks if a detector has missed heartbeats

### `@commfire/simulation`

Virtual device simulation:
- `VirtualDetector` – emits binary-encoded mesh frames (heartbeat, alarm, fault, etc.)
- `VirtualMesh` – manages a collection of virtual detectors with timers
- `createDemoMesh` – pre-wired 5-detector demo topology

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
| `gateways` | LoRa gateways; position on floor plan |
| `detectors` | LoRa detectors; position, battery, RSSI, mesh depth |
| `mesh_links` | Topology edges between detectors |
| `device_events` | Alarms, faults, heartbeats, and other device events |

Platform admins bypass RLS; customers see only their own data.
