'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

const schema = z.object({
  company_name: z.string().min(1, '会社名を入力してください'),
  address: z.string().min(1, '住所を入力してください'),
  department: z.string().optional(),
  full_name: z.string().min(1, '氏名を入力してください'),
  title: z.string().optional(),
  profile_text: z.string().optional(),
})
type FormData = z.infer<typeof schema>

type RoleCategory = 'party' | 'lender'

const ROLE_CATEGORIES: { value: RoleCategory; label: string; description: string }[] = [
  { value: 'party',  label: '取引当事者', description: '物件の売却・購入を行う' },
  { value: 'lender', label: 'レンダー',   description: '融資を提供する' },
]

// DB roles ↔ 表示カテゴリの変換
function rolesToCategories(roles: string[]): RoleCategory[] {
  const cats: RoleCategory[] = []
  if (roles.some(r => r === 'seller' || r === 'buyer')) cats.push('party')
  if (roles.includes('lender')) cats.push('lender')
  return cats
}

function categoriesToRoles(cats: RoleCategory[]): string[] {
  const roles: string[] = []
  if (cats.includes('party')) roles.push('seller', 'buyer')
  if (cats.includes('lender')) roles.push('lender')
  return roles
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileForm />
    </Suspense>
  )
}

function ProfileForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSetup = searchParams.get('setup') === 'true'

  const [profile, setProfile] = useState<Profile | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<RoleCategory[]>([])
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleError, setRoleError] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile(data)
        setSelectedCategories(rolesToCategories(data.roles ?? []))
        reset({
          company_name: data.company_name,
          address: data.address,
          department: data.department ?? '',
          full_name: data.full_name,
          title: data.title ?? '',
          profile_text: data.profile_text ?? '',
        })
      }
    }
    load()
  }, [reset])

  function toggleCategory(cat: RoleCategory) {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
    setRoleError(false)
  }

  async function onSubmit(data: FormData) {
    if (selectedCategories.length === 0) {
      setRoleError(true)
      return
    }
    setError(null)
    setSaved(false)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        ...data,
        roles: categoriesToRoles(selectedCategories),
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      return
    }

    setSaved(true)
    if (isSetup) {
      router.push('/dashboard')
    }
  }

  if (!profile) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isSetup ? 'ロールの設定' : 'プロフィール設定'}
        </h1>
        {isSetup && (
          <p className="text-gray-500 text-sm mt-1">
            ご自身のロールを選択してください。後から変更できます。
          </p>
        )}
      </div>

      {saved && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <AlertDescription className="text-green-700">
            プロフィールを更新しました
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ロール選択 */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-1">
            ロール <span className="text-red-500">*</span>
          </h2>
          <p className="text-sm text-gray-500 mb-4">複数選択可能です</p>
          <div className="grid grid-cols-2 gap-3">
            {ROLE_CATEGORIES.map((cat) => {
              const selected = selectedCategories.includes(cat.value)
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleCategory(cat.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    selected
                      ? 'border-[#1F3864] bg-[#1F3864]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{cat.label}</span>
                    {selected && (
                      <Badge className="bg-[#1F3864] text-white text-xs px-1.5">✓</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{cat.description}</p>
                </button>
              )
            })}
          </div>
          {roleError && (
            <p className="text-xs text-red-500 mt-2">1つ以上のロールを選択してください</p>
          )}
        </div>

        {/* プロフィール情報 */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">基本情報</h2>

          <div className="space-y-1.5">
            <Label htmlFor="company_name">
              会社名 <span className="text-red-500">*</span>
            </Label>
            <Input id="company_name" {...register('company_name')} />
            {errors.company_name && (
              <p className="text-xs text-red-500">{errors.company_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">
              住所 <span className="text-red-500">*</span>
            </Label>
            <Input id="address" {...register('address')} />
            {errors.address && (
              <p className="text-xs text-red-500">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">
                氏名 <span className="text-red-500">*</span>
              </Label>
              <Input id="full_name" {...register('full_name')} />
              {errors.full_name && (
                <p className="text-xs text-red-500">{errors.full_name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department">部署名</Label>
              <Input id="department" {...register('department')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">役職</Label>
            <Input id="title" {...register('title')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile_text">自社紹介（任意）</Label>
            <Textarea
              id="profile_text"
              rows={3}
              placeholder="他の会員に表示されます"
              {...register('profile_text')}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="bg-[#1F3864] hover:bg-[#162a4e] px-8"
          disabled={isSubmitting}
        >
          {isSubmitting ? '保存中...' : isSetup ? '設定を完了する' : '変更を保存'}
        </Button>
      </form>
    </div>
  )
}
