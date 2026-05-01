'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: '🏠' },
  { href: '/properties', label: '物件管理', icon: '🏢' },
  { href: '/offers', label: 'オファー管理', icon: '📋' },
  { href: '/transactions', label: '取引事例', icon: '📊' },
  { href: '/profile', label: 'プロフィール', icon: '👤' },
]

const adminItems = [
  { href: '/admin/members', label: '会員管理', icon: '👥' },
  { href: '/admin/properties', label: '物件承認', icon: '✅' },
]

type Props = {
  isAdmin: boolean
}

export function Sidebar({ isAdmin }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-[#1F3864] text-white min-h-screen">
      <div className="px-6 py-5 border-b border-white/10">
        <h1 className="text-lg font-bold tracking-wide">PropConnect</h1>
        <p className="text-xs text-white/50 mt-0.5">不動産取引プラットフォーム</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname === item.href
                ? 'bg-white/20 text-white font-medium'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs text-white/40 uppercase tracking-wider">管理者</p>
            </div>
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <span>🚪</span>
          ログアウト
        </button>
      </div>
    </aside>
  )
}
