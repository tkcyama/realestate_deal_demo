// ── 会員 ─────────────────────────────────────────────────────
export type MemberStatus = 'pending' | 'approved' | 'suspended'
export type MemberRole = 'seller' | 'buyer' | 'lender'

export type Profile = {
  id: string
  company_name: string
  address: string
  department: string | null
  full_name: string
  title: string | null
  email: string
  roles: MemberRole[]
  status: MemberStatus
  profile_text: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ── 物件 ─────────────────────────────────────────────────────
export type PropertyUse =
  | 'office'
  | 'residential'
  | 'commercial'
  | 'logistics'
  | 'hotel'
  | 'mixed'
  | 'other'

export type PropertyStatus =
  | 'draft'
  | 'pending_approval'
  | 'published'
  | 'sold'

export type Property = {
  id: string
  seller_id: string
  name: string
  address: string
  prefecture: string | null
  city: string | null
  town: string | null
  address_detail: string | null
  lat: number | null
  lng: number | null
  nearest_line: string | null
  nearest_station: string | null
  walk_minutes: number | null
  use_type: PropertyUse
  building_year: number | null
  structure: string | null
  floors_above: number | null
  floors_below: number | null
  land_area_sqm: number | null
  total_floor_area_sqm: number
  exclusive_area_sqm: number | null
  exclusive_area_tsubo: number | null
  exclusive_tsubo_price: number | null
  price: number
  noi: number | null
  ncf: number | null
  noi_yield: number | null
  ncf_yield: number | null
  tenant_count: number | null
  occupancy_rate: number | null
  monthly_rent_income: number | null
  status: PropertyStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
  // JOIN
  profiles?: Pick<Profile, 'company_name' | 'full_name'>
}

export const USE_TYPE_LABELS: Record<PropertyUse, string> = {
  office:      'オフィス',
  residential: 'レジデンシャル',
  commercial:  '商業',
  logistics:   '物流',
  hotel:       'ホテル',
  mixed:       '複合',
  other:       'その他',
}

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  draft:            '下書き',
  pending_approval: '承認待ち',
  published:        '公開中',
  sold:             '売却完了',
}

// ── オファー ──────────────────────────────────────────────────
export type SaleOfferStatus = 'pending' | 'considering' | 'declined' | 'expired'
export type PurchaseOfferStatus =
  | 'pending' | 'accepted' | 'counter_offered' | 'declined' | 'expired' | 'agreed'
export type LoanOfferStatus =
  | 'pending' | 'considering' | 'offered_back' | 'declined' | 'expired' | 'completed'

// ── 取引事例 ──────────────────────────────────────────────────
export type PartyType = 'fund' | 'reit' | 'corporate' | 'individual' | 'other'
