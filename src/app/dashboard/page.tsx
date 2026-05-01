import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'

const roleLabels: Record<string, string> = {
  seller: '売主',
  buyer: '買主',
  lender: 'レンダー',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  // ロール未設定ならプロフィール設定ページへ
  if (!profile.roles || profile.roles.length === 0) {
    redirect('/profile?setup=true')
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          おはようございます、{profile.full_name} さん
        </h1>
        <p className="text-gray-500 text-sm mt-1">{profile.company_name}</p>
        <div className="flex gap-2 mt-3">
          {profile.roles.map((role: string) => (
            <Badge key={role} className="bg-[#1F3864] text-white">
              {roleLabels[role] ?? role}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryCard
          title="受信オファー"
          value="—"
          sub="件（未対応）"
          href="/offers"
          color="bg-blue-50 text-blue-700"
        />
        <SummaryCard
          title="公開中物件"
          value="—"
          sub="件"
          href="/properties"
          color="bg-green-50 text-green-700"
        />
        <SummaryCard
          title="進行中の取引"
          value="—"
          sub="件"
          href="/offers"
          color="bg-amber-50 text-amber-700"
        />
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-gray-900 mb-4">クイックアクセス</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickLink href="/properties/new" label="物件を登録する" icon="🏢" />
          <QuickLink href="/properties" label="物件一覧を見る" icon="🗺️" />
          <QuickLink href="/offers" label="オファーを確認する" icon="📋" />
          <QuickLink href="/transactions" label="取引事例を調べる" icon="📊" />
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  title, value, sub, href, color,
}: {
  title: string
  value: string
  sub: string
  href: string
  color: string
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow"
    >
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className={`text-3xl font-bold ${color.split(' ')[1]}`}>{value}</p>
      <p className="text-sm text-gray-400 mt-1">{sub}</p>
    </Link>
  )
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors text-sm text-gray-700"
    >
      <span>{icon}</span>
      {label}
    </Link>
  )
}
