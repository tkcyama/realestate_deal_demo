'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { geocodeAddress } from '@/lib/geocoding'
import { normalizeAddress } from '@/lib/normalize'
import { USE_TYPE_LABELS, type PropertyUse } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const posNum = () =>
  z.string().refine((v) => v === '' || (Number(v) > 0), '正の数を入力してください')
const intNum = (min = 0) =>
  z.string().refine((v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= min), `${min}以上の整数を入力してください`)

const schema = z.object({
  name: z.string().min(1, '物件名を入力してください'),
  prefecture: z.string().min(1, '都道府県を入力してください').max(4, '都道府県は4文字以内で入力してください（例：東京都）'),
  city: z.string().min(1, '市区町村を入力してください'),
  town: z.string().min(1, '町域を入力してください'),
  address_detail: z.string().optional(),
  nearest_line: z.string().optional(),
  nearest_station: z.string().optional(),
  walk_minutes: intNum(1),
  use_type: z.enum(['office','residential','commercial','logistics','hotel','mixed','other']),
  building_year: intNum(1900),
  structure: z.string().optional(),
  floors_above: intNum(0),
  floors_below: intNum(0),
  land_area_sqm: posNum(),
  total_floor_area_sqm: z.string().refine((v) => Number(v) > 0, '延床面積を入力してください'),
  exclusive_area_tsubo: posNum(),
  price: z.string().refine((v) => Number(v) > 0, '売却希望価格を入力してください'),
  noi: posNum(),
  ncf: posNum(),
  tenant_count: intNum(0),
  occupancy_rate: z.string().refine(
    (v) => v === '' || (Number(v) >= 0 && Number(v) <= 100),
    '0〜100の値を入力してください'
  ),
  monthly_rent_income: posNum(),
})
type FormData = z.infer<typeof schema>

const USE_TYPES = Object.entries(USE_TYPE_LABELS) as [PropertyUse, string][]

const FIELD_LABELS: Partial<Record<keyof FormData, string>> = {
  name: '物件名',
  prefecture: '都道府県',
  city: '市区町村',
  town: '町域',
  address_detail: '番地以降',
  nearest_line: '路線',
  nearest_station: '最寄り駅',
  walk_minutes: '徒歩（分）',
  use_type: '用途',
  building_year: '建築年',
  structure: '構造',
  floors_above: '地上階数',
  floors_below: '地下階数',
  total_floor_area_sqm: '延床面積（㎡）',
  exclusive_area_tsubo: '専有面積（坪）',
  land_area_sqm: '土地面積（㎡）',
  price: '売却希望価格（億円）',
  noi: 'NOI 年間純収益（円）',
  ncf: 'NCF 純キャッシュフロー（円）',
  monthly_rent_income: '月額賃料収入（円）',
  tenant_count: 'テナント数',
  occupancy_rate: '稼働率（%）',
}

export default function NewPropertyPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { use_type: 'office' },
  })

  async function save(data: FormData, status: 'draft' | 'pending_approval') {
    setError(null)
    setValidationErrors([])
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 住所正規化（漢数字・全角数字 → 半角）
    const prefecture = normalizeAddress(data.prefecture)
    const city = normalizeAddress(data.city)
    const town = normalizeAddress(data.town)
    const address_detail = data.address_detail ? normalizeAddress(data.address_detail) : ''

    // Geocoding
    const address = [prefecture, city, town, address_detail]
      .filter(Boolean).join('')
    setGeocoding(true)
    const coords = await geocodeAddress(address)
    setGeocoding(false)

    const exclusive_area_tsubo = data.exclusive_area_tsubo
      ? Number(data.exclusive_area_tsubo) : null
    // 入力は億円単位 → 円に変換して保存
    const price = Math.round(Number(data.price) * 1_0000_0000)
    const exclusive_tsubo_price =
      exclusive_area_tsubo ? Math.round(price / exclusive_area_tsubo) : null
    // NOI・NCF・月額賃料は円単位のまま
    const noi = data.noi ? Number(data.noi) : null
    const ncf = data.ncf ? Number(data.ncf) : null

    const payload = {
      seller_id: user.id,
      name: data.name,
      address,
      prefecture,
      city,
      town,
      address_detail: address_detail || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      nearest_line: data.nearest_line || null,
      nearest_station: data.nearest_station || null,
      walk_minutes: data.walk_minutes ? Number(data.walk_minutes) : null,
      use_type: data.use_type,
      building_year: data.building_year ? Number(data.building_year) : null,
      structure: data.structure || null,
      floors_above: data.floors_above ? Number(data.floors_above) : null,
      floors_below: data.floors_below ? Number(data.floors_below) : null,
      land_area_sqm: data.land_area_sqm ? Number(data.land_area_sqm) : null,
      total_floor_area_sqm: Number(data.total_floor_area_sqm),
      exclusive_area_tsubo,
      exclusive_area_sqm: exclusive_area_tsubo
        ? Math.round(exclusive_area_tsubo * 3.30579) : null,
      exclusive_tsubo_price,
      price,
      noi,
      ncf,
      noi_yield: noi != null && price ? noi / price : null,
      ncf_yield: ncf != null && price ? ncf / price : null,
      tenant_count: data.tenant_count ? Number(data.tenant_count) : null,
      occupancy_rate: data.occupancy_rate ? Number(data.occupancy_rate) : null,
      monthly_rent_income: data.monthly_rent_income
        ? Number(data.monthly_rent_income) : null,
      status,
    }

    const { data: property, error } = await supabase
      .from('properties')
      .insert(payload)
      .select('id')
      .single()

    if (error) { setError(error.message); return }
    router.push(`/properties/${property.id}`)
    router.refresh()
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">物件を登録する</h1>
        <p className="text-sm text-gray-500 mt-1">
          下書き保存後に公開申請できます
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            <p className="font-medium mb-1">以下の項目を確認してください：</p>
            <ul className="list-disc list-inside space-y-0.5 text-sm">
              {validationErrors.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <form className="space-y-6">
        {/* 基本情報 */}
        <Section title="基本情報">
          <Field label="物件名" required error={errors.name?.message}>
            <Input placeholder="〇〇ビル" {...register('name')} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="都道府県" required error={errors.prefecture?.message}>
              <Input placeholder="東京都" maxLength={4} {...register('prefecture')} />
            </Field>
            <Field label="市区町村" required error={errors.city?.message}>
              <Input placeholder="千代田区" {...register('city')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="町域" required error={errors.town?.message}>
              <Input placeholder="丸の内" {...register('town')} />
            </Field>
            <Field label="番地以降" error={errors.address_detail?.message}>
              <Input placeholder="1-1-1 ○○ビル" {...register('address_detail')} />
            </Field>
          </div>
          <p className="text-xs text-gray-400">都道府県〜番地を結合して緯度経度を自動取得します</p>

          <Field label="用途" required>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
              {...register('use_type')}
            >
              {USE_TYPES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-4 gap-4">
            <Field label="建築年" error={errors.building_year?.message}>
              <Input type="number" placeholder="2005" {...register('building_year')} />
            </Field>
            <Field label="構造">
              <Input placeholder="RC造" {...register('structure')} />
            </Field>
            <Field label="地上階数">
              <Input type="number" placeholder="10" {...register('floors_above')} />
            </Field>
            <Field label="地下階数">
              <Input type="number" placeholder="0" {...register('floors_below')} />
            </Field>
          </div>
        </Section>

        {/* 交通 */}
        <Section title="交通">
          <div className="grid grid-cols-3 gap-4">
            <Field label="路線">
              <Input placeholder="東京メトロ丸ノ内線" {...register('nearest_line')} />
            </Field>
            <Field label="最寄り駅">
              <Input placeholder="大手町駅" {...register('nearest_station')} />
            </Field>
            <Field label="徒歩（分）" error={errors.walk_minutes?.message}>
              <Input type="number" placeholder="5" {...register('walk_minutes')} />
            </Field>
          </div>
        </Section>

        {/* 面積情報 */}
        <Section title="面積情報">
          <div className="grid grid-cols-2 gap-4">
            <Field label="延床面積（㎡）" required error={errors.total_floor_area_sqm?.message}>
              <Input type="number" step="0.01" placeholder="5000" {...register('total_floor_area_sqm')} />
            </Field>
            <Field label="専有面積（坪）">
              <Input type="number" step="0.01" placeholder="1200" {...register('exclusive_area_tsubo')} />
            </Field>
            <Field label="土地面積（㎡）">
              <Input type="number" step="0.01" placeholder="1000" {...register('land_area_sqm')} />
            </Field>
          </div>
        </Section>

        {/* 財務情報 */}
        <Section title="財務情報">
          <div className="grid grid-cols-2 gap-4">
            <Field label="売却希望価格（億円）" required error={errors.price?.message}>
              <Input type="number" step="0.1" placeholder="50" {...register('price')} />
            </Field>
            <Field label="NOI 年間純収益（円）">
              <Input type="number" placeholder="200000000" {...register('noi')} />
            </Field>
            <Field label="NCF 純キャッシュフロー（円）">
              <Input type="number" placeholder="180000000" {...register('ncf')} />
            </Field>
            <Field label="月額賃料収入（円）">
              <Input type="number" placeholder="20000000" {...register('monthly_rent_income')} />
            </Field>
          </div>
          <p className="text-xs text-gray-400">
            ※ NOI利回り・NCF利回り・専有坪単価は自動計算されます
          </p>
        </Section>

        {/* テナント情報 */}
        <Section title="テナント情報">
          <div className="grid grid-cols-2 gap-4">
            <Field label="テナント数">
              <Input type="number" placeholder="10" {...register('tenant_count')} />
            </Field>
            <Field label="稼働率（%）">
              <Input type="number" step="0.1" placeholder="95.5" {...register('occupancy_rate')} />
            </Field>
          </div>
        </Section>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleSubmit((d) => save(d, 'draft'), (errs) => {
              setValidationErrors(
                (Object.keys(errs) as (keyof FormData)[]).map(key =>
                  `${FIELD_LABELS[key] ?? key}: ${(errs[key] as any)?.message ?? 'エラー'}`
                )
              )
              window.scrollTo({ top: 0, behavior: 'smooth' })
            })}
            disabled={isSubmitting || geocoding}
          >
            {isSubmitting || geocoding ? '保存中...' : '下書き保存'}
          </Button>
          <Button
            type="button"
            className="bg-[#1F3864] hover:bg-[#162a4e]"
            onClick={handleSubmit((d) => save(d, 'pending_approval'), (errs) => {
              setValidationErrors(
                (Object.keys(errs) as (keyof FormData)[]).map(key =>
                  `${FIELD_LABELS[key] ?? key}: ${(errs[key] as any)?.message ?? 'エラー'}`
                )
              )
              window.scrollTo({ top: 0, behavior: 'smooth' })
            })}
            disabled={isSubmitting || geocoding}
          >
            {isSubmitting ? '申請中...' : geocoding ? '住所変換中...' : '公開申請する'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-6 space-y-4">
      <h2 className="font-semibold text-gray-900 border-b pb-3">{title}</h2>
      {children}
    </div>
  )
}

function Field({
  label, required, error, children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
