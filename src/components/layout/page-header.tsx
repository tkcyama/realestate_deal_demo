'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function PageHeader() {
  const pathname = usePathname()
  if (pathname === '/dashboard') return null

  return (
    <div className="sticky top-0 z-10 bg-white border-b px-6 py-2 flex items-center gap-2">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1F3864] transition-colors"
      >
        <span className="text-base">🏠</span>
        トップへ戻る
      </Link>
    </div>
  )
}
