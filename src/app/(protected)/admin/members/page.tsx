import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { MemberActions } from './member-actions'

const statusLabel: Record<string, { label: string; class: string }> = {
  pending:  { label: '審査中', class: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: '承認済', class: 'bg-green-100 text-green-700 border-green-200' },
  suspended:{ label: '停止中', class: 'bg-red-100 text-red-700 border-red-200' },
}

function getRoleDisplayCategories(roles: string[]): string[] {
  const cats: string[] = []
  if (roles.some((r: string) => r === 'seller' || r === 'buyer')) cats.push('取引当事者')
  if (roles.includes('lender')) cats.push('レンダー')
  return cats
}

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const pending  = members?.filter((m) => m.status === 'pending') ?? []
  const others   = members?.filter((m) => m.status !== 'pending') ?? []

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">会員管理</h1>
        <p className="text-sm text-gray-500 mt-1">会員申請の承認・却下・停止を管理します</p>
      </div>

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
            審査待ち
            <span className="bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">
              {pending.length}
            </span>
          </h2>
          <MemberTable members={pending} currentUserId={user?.id} />
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">全会員</h2>
        <MemberTable members={others} currentUserId={user?.id} />
      </section>
    </div>
  )
}

function MemberTable({ members, currentUserId }: { members: any[], currentUserId?: string }) {
  if (members.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">
        該当する会員がいません
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">会社名 / 担当者</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">メールアドレス</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">ロール</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">申請日</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">ステータス</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((member) => {
            const s = statusLabel[member.status] ?? statusLabel.pending
            return (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{member.company_name}</p>
                  <p className="text-gray-500 text-xs">
                    {member.full_name}
                    {member.title && ` / ${member.title}`}
                    {member.department && ` (${member.department})`}
                  </p>
                </td>
                <td className="px-4 py-3 text-gray-600">{member.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {member.roles && member.roles.length > 0
                      ? getRoleDisplayCategories(member.roles).map((label: string) => (
                          <span
                            key={label}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                          >
                            {label}
                          </span>
                        ))
                      : <span className="text-xs text-gray-300">未設定</span>
                    }
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(member.created_at).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs px-2.5 py-1 rounded-full border ${s.class}`}>
                    {s.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {member.id === currentUserId ? (
                    <span className="text-xs text-gray-400">（自分）</span>
                  ) : (
                    <MemberActions memberId={member.id} currentStatus={member.status} />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
