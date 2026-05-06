'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

const schema = z.object({
  company_name: z.string().min(1, '会社名を入力してください'),
  address: z.string().min(1, '住所を入力してください'),
  department: z.string().optional(),
  full_name: z.string().min(1, '担当者氏名を入力してください'),
  title: z.string().optional(),
  email: z.string().email('正しいメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, '8文字以上で入力してください')
    .regex(/[A-Z]/, '大文字を含めてください')
    .regex(/[a-z]/, '小文字を含めてください')
    .regex(/[0-9]/, '数字を含めてください'),
  password_confirm: z.string(),
}).refine((d) => d.password === d.password_confirm, {
  message: 'パスワードが一致しません',
  path: ['password_confirm'],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          company_name: data.company_name,
          address: data.address,
          department: data.department ?? '',
          full_name: data.full_name,
          title: data.title ?? '',
        },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })
    if (error) {
      if (error.message.toLowerCase().includes('rate limit')) {
        setError('メール送信の上限に達しました。しばらく時間をおいてから再度お試しください（1時間あたりの送信数制限があります）。')
      } else {
        setError(error.message)
      }
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="text-4xl mb-4">✉️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              申請を受け付けました
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              ご登録いただいたメールアドレスに確認メールをお送りしました。
              メールのリンクをクリックしてメールアドレスを確認してください。
            </p>
            <p className="text-gray-500 text-sm mt-3">
              確認後、管理者が審査を行います。承認後に改めてご連絡いたします。
            </p>
            <Link
              href="/auth/login"
              className="mt-6 inline-block text-sm text-[#1F3864] hover:underline"
            >
              ログインページへ戻る
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1F3864]">PropConnect</h1>
          <p className="text-sm text-gray-500 mt-1">不動産取引プラットフォーム</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">会員申請</h2>
          <p className="text-sm text-gray-500 mb-6">
            法人会員のみ対象です。審査後、管理者より承認通知をお送りします。
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="company_name">
                  会社名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="company_name"
                  placeholder="〇〇不動産投資株式会社"
                  {...register('company_name')}
                />
                {errors.company_name && (
                  <p className="text-xs text-red-500">{errors.company_name.message}</p>
                )}
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="address">
                  住所 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  placeholder="東京都千代田区〇〇1-2-3"
                  {...register('address')}
                />
                {errors.address && (
                  <p className="text-xs text-red-500">{errors.address.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="full_name">
                  担当者氏名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="full_name"
                  placeholder="山田 太郎"
                  {...register('full_name')}
                />
                {errors.full_name && (
                  <p className="text-xs text-red-500">{errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="department">部署名</Label>
                <Input
                  id="department"
                  placeholder="投資部"
                  {...register('department')}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="title">役職</Label>
                <Input
                  id="title"
                  placeholder="部長"
                  {...register('title')}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="email">
                  メールアドレス <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="yamada@company.co.jp"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">
                  パスワード <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password_confirm">
                  パスワード（確認） <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password_confirm"
                  type="password"
                  {...register('password_confirm')}
                />
                {errors.password_confirm && (
                  <p className="text-xs text-red-500">{errors.password_confirm.message}</p>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-400">
              ※ パスワードは8文字以上・大文字・小文字・数字を含む必要があります
            </p>

            <Button
              type="submit"
              className="w-full bg-[#1F3864] hover:bg-[#162a4e]"
              disabled={isSubmitting}
            >
              {isSubmitting ? '送信中...' : '申請する'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/auth/login" className="text-[#1F3864] hover:underline font-medium">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
