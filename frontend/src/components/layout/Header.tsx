'use client'

import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname.startsWith('/projects/new')) return 'New Project'
  if (pathname.match(/^\/projects\/[^/]+$/)) return 'Project Detail'
  if (pathname.startsWith('/strains')) return 'Strain Library'
  return 'CanopyOS'
}

export default function Header() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const title = getPageTitle(pathname)

  return (
    <header className="h-14 flex-shrink-0 bg-gray-900 border-b border-gray-800 flex items-center px-6">
      <div className="flex-1">
        <h2 className="text-sm font-semibold text-gray-200">{title}</h2>
      </div>

      {/* Right side: user avatar */}
      {user && (
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </header>
  )
}
