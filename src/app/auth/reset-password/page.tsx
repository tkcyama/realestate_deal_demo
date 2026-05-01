'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const schema = z.object({
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

export default function ResetPasswordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) {
      setError(error.message)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1F3864]">PropConnect</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">新しいパスワードを設定</h2>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">新しいパスワード</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password_confirm">パスワード（確認）</Label>
              <Input id="password_confirm" type="password" {...register('password_confirm')} />
              {errors.password_confirm && (
                <p className="text-xs text-red-500">{errors.password_confirm.message}</p>
              )}
            </div>
            <p className="text-xs text-gray-400">
              ※ 8文字以上・大文字・小文字・数字を含む必要があります
            </p>
            <Button
              type="submit"
              className="w-full bg-[#1F3864] hover:bg-[#162a4e]"
              disabled={isSubmitting}
            >
              {isSubmitting ? '更新中...' : 'パスワードを更新'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
