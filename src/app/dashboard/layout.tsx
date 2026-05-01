import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  // 審査中の場合は専用メッセージページ
  if (profile.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md text-center bg-white rounded-xl shadow-sm border p-8">
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">審査中です</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            現在、管理者が申請内容を審査しています。
            承認後にメールでご連絡いたします。
          </p>
          <p className="text-gray-400 text-xs mt-4">
            ご不明な点はお問い合わせください。
          </p>
        </div>
      </div>
    )
  }

  if (profile.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md text-center bg-white rounded-xl shadow-sm border p-8">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">アカウントが停止されています</h2>
          <p className="text-gray-600 text-sm">
            詳細については管理者にお問い合わせください。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isAdmin={profile.is_admin} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
