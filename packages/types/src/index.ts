// ─── Common primitives ───────────────────────────────────────────────────────

export type UUID = string
export type ISO8601 = string
export type EUI64 = string // 64-bit Extended Unique Identifier (device address)

// ─── Account / Auth ───────────────────────────────────────────────────────────

export type AccountRole = 'platform_admin' | 'customer'

export interface UserProfile {
  id: UUID
  email: string
  fullName: string
  role: AccountRole
  customerId: UUID | null
  createdAt: ISO8601
  updatedAt: ISO8601
}

// ─── Customer ────────────────────────────────────────────────────────────────

export interface Customer {
  id: UUID
  name: string
  slug: string
  logoUrl: string | null
  stripeCustomerId: string | null
  createdAt: ISO8601
  updatedAt: ISO8601
}

// ─── Subscription ────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'

export interface Subscription {
  id: UUID
  customerId: UUID
  buildingId: UUID
  stripeSubscriptionId: string
  status: SubscriptionStatus
  planId: string
  currentPeriodStart: ISO8601
  currentPeriodEnd: ISO8601
  cancelAtPeriodEnd: boolean
  createdAt: ISO8601
  updatedAt: ISO8601
}

// ─── Building ────────────────────────────────────────────────────────────────

export interface Building {
  id: UUID
  customerId: UUID
  name: string
  address: string
  city: string
  country: string
  postalCode: string
  createdAt: ISO8601
  updatedAt: ISO8601
}

// ─── Floor ───────────────────────────────────────────────────────────────────

export interface Floor {
  id: UUID
  buildingId: UUID
  name: string
  level: number
  floorPlanUrl: string | null
  floorPlanWidth: number | null
  floorPlanHeight: number | null
  createdAt: ISO8601
  updatedAt: ISO8601
}

// ─── Gateway ─────────────────────────────────────────────────────────────────

export type GatewayStatus = 'online' | 'offline' | 'degraded'

export interface Gateway {
  id: UUID
  buildingId: UUID
  floorId: UUID | null
  eui: EUI64
  name: string
  status: GatewayStatus
  firmware: string
  lastSeenAt: ISO8601 | null
  posX: number | null
  posY: number | null
  createdAt: ISO8601
  updatedAt: ISO8601
}

// ─── Detector ────────────────────────────────────────────────────────────────

export type DetectorType = 'smoke' | 'heat' | 'co' | 'multi'
export type DetectorStatus = 'normal' | 'alarm' | 'fault' | 'offline' | 'tamper'
export type BatteryLevel = 'critical' | 'low' | 'medium' | 'good' | 'full'

export interface Detector {
  id: UUID
  gatewayId: UUID
  floorId: UUID | null
  eui: EUI64
  name: string
  type: DetectorType
  status: DetectorStatus
  batteryVoltage: number | null
  batteryLevel: BatteryLevel | null
  rssi: number | null
  snr: number | null
  lastSeenAt: ISO8601 | null
  posX: number | null
  posY: number | null
  parentEui: EUI64 | null
  hopCount: number
  meshDepth: number
  createdAt: ISO8601
  updatedAt: ISO8601
}

// ─── Mesh topology ───────────────────────────────────────────────────────────

export interface MeshLink {
  sourceEui: EUI64
  targetEui: EUI64
  rssi: number
  snr: number
  updatedAt: ISO8601
}

export interface MeshTopology {
  gatewayEui: EUI64
  nodes: Detector[]
  links: MeshLink[]
  updatedAt: ISO8601
}

// ─── Events ──────────────────────────────────────────────────────────────────

export type EventType =
  | 'alarm'
  | 'alarm_clear'
  | 'fault'
  | 'fault_clear'
  | 'tamper'
  | 'tamper_clear'
  | 'low_battery'
  | 'heartbeat'
  | 'join'
  | 'leave'

export interface DeviceEvent {
  id: UUID
  detectorId: UUID
  gatewayId: UUID
  type: EventType
  payload: Record<string, unknown>
  receivedAt: ISO8601
  processedAt: ISO8601 | null
}

// ─── Heartbeat (gateway → backend) ───────────────────────────────────────────

export interface GatewayHeartbeat {
  gatewayEui: EUI64
  timestamp: ISO8601
  firmwareVersion: string
  uptime: number
  connectedDetectors: number
  status: GatewayStatus
}

export interface DetectorHeartbeat {
  detectorEui: EUI64
  gatewayEui: EUI64
  timestamp: ISO8601
  batteryVoltage: number
  rssi: number
  snr: number
  status: DetectorStatus
  parentEui: EUI64 | null
  hopCount: number
}

// ─── API Request / Response shapes ───────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    code: string
    message: string
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// ─── Dashboard summary ───────────────────────────────────────────────────────

export interface BuildingSummary {
  building: Building
  subscription: Subscription | null
  gateways: number
  detectors: number
  alarmsActive: number
  faultsActive: number
  lastEventAt: ISO8601 | null
}

// ─── Stripe / Billing ────────────────────────────────────────────────────────

export interface BillingPlan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: 'month' | 'year'
  maxGateways: number
  maxDetectors: number
  features: string[]
}
