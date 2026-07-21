'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Plus,
  TrendingDown,
  TrendingUp,
  BarChart2,
  Menu,
  X,
  FileText,
  Truck,
  Package,
  Calendar,
  Settings,
  LogOut
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

const bottomNav = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/costi', icon: TrendingDown, label: 'Costi' },
  { href: '/registra', icon: Plus, label: 'Registra', main: true },
  { href: '/incassi', icon: TrendingUp, label: 'Incassi' },
  { href: '/report', icon: BarChart2, label: 'Report' },
]

const hamburgerMenu = [
  { href: '/documenti', icon: FileText, label: 'Documenti' },
  { href: '/fornitori', icon: Truck, label: 'Fornitori' },
  { href: '/prodotti', icon: Package, label: 'Prodotti' },
  { href: '/eventi', icon: Calendar, label: 'Eventi' },
  { href: '/impostazioni', icon: Settings, label: 'Impostazioni' },
]

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">FC</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">Buvette FC Ceresio</span>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu size={20} className="text-gray-600" />
        </button>
      </header>

      {/* Hamburger menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
          <div className="w-72 bg-white h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
              <span className="font-semibold text-gray-900">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={18} className="text-gray-600" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {hamburgerMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <item.icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors w-full"
              >
                <LogOut size={18} />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenuto pagina */}
      <main className="flex-1 pt-16 pb-20">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around px-2 py-2">
          {bottomNav.map((item) => {
            const isActive = pathname === item.href
            if (item.main) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-1 -mt-6"
                >
                  <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
                    <item.icon size={24} className="text-white" />
                  </div>
                  <span className="text-xs text-gray-500">{item.label}</span>
                </Link>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 px-3 py-1"
              >
                <item.icon
                  size={20}
                  className={isActive ? 'text-green-600' : 'text-gray-400'}
                />
                <span className={`text-xs ${isActive ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

    </div>
  )
}