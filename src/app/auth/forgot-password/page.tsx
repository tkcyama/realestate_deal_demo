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
import { Alert, AlertDescription } from '@/components/ui/alert'

const schema = z.object({
  email: z.string().email('正しいメールアドレスを入力してください'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${location.origin}/auth/reset-password`,
    })
    if (error) {
      setError(error.message)
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
            <h2 className="text-xl font-semibold text-gray-900 mb-3">メールを送信しました</h2>
            <p className="text-gray-600 text-sm">
              パスワード再設定用のリンクをメールでお送りしました。
              メールをご確認ください。
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1F3864]">PropConnect</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">パスワードをお忘れの方</h2>
          <p className="text-sm text-gray-500 mb-6">
            登録済みのメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@company.co.jp"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#1F3864] hover:bg-[#162a4e]"
              disabled={isSubmitting}
            >
              {isSubmitting ? '送信中...' : '再設定メールを送信'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link href="/auth/login" className="text-[#1F3864] hover:underline">
              ログインページへ戻る
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
