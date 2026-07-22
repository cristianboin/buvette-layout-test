'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Hop as Home, Plus, TrendingDown, TrendingUp, ChartBar as BarChart2, Menu, X, FileText, Truck, Package, Calendar, Settings, LogOut, Sparkles, Calculator } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const bottomNav = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/costi', icon: TrendingDown, label: 'Costi' },
  { href: '/registra', icon: Plus, label: 'Registra', main: true },
  { href: '/incassi', icon: TrendingUp, label: 'Incassi' },
  { href: '/report', icon: BarChart2, label: 'Report' },
]

const hamburgerMenu = [
  { href: '/chiedi', icon: Sparkles, label: 'Chiedi (AI)' },
  { href: '/chiusura', icon: Calculator, label: 'Chiusura cassa' },
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
    <div className="min-h-screen bg-page flex flex-col">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-lg border-b border-line">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-sm shadow-green-700/30">
              <span className="text-white text-xs font-extrabold tracking-tight">FC</span>
            </div>
            <div className="leading-tight">
              <span className="font-bold text-ink text-sm tracking-tight block">Buvette FC Ceresio</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-green-600 dark:text-green-400">Buvette</span>
            </div>
          </div>
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2.5 rounded-xl text-muted hover:text-ink hover:bg-page transition-colors"
            aria-label="Apri menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Hamburger menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="w-72 bg-surface h-full shadow-2xl flex flex-col border-l border-line">
            <div className="flex items-center justify-between px-4 py-4 border-b border-line">
              <span className="font-bold text-ink tracking-tight">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-xl text-muted hover:text-ink hover:bg-page transition-colors"
                aria-label="Chiudi menu"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {hamburgerMenu.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                      active
                        ? 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 font-semibold'
                        : 'text-ink/80 hover:bg-page hover:text-ink'
                    }`}
                  >
                    <item.icon size={18} className={active ? '' : 'text-muted'} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="px-3 py-4 border-t border-line">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors w-full"
              >
                <LogOut size={18} />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenuto pagina */}
      <main className="flex-1 pt-16 pb-28">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-lg border-t border-line">
        <div className="max-w-2xl mx-auto flex items-center justify-around px-2 py-2">
          {bottomNav.map((item) => {
            const isActive = pathname === item.href
            if (item.main) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-1 -mt-7"
                >
                  <div className="w-15 h-15 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center shadow-lg shadow-green-700/40 ring-4 ring-surface">
                    <item.icon size={24} className="text-white" />
                  </div>
                  <span className="text-[11px] font-medium text-muted">{item.label}</span>
                </Link>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 px-3 py-1.5"
              >
                <item.icon
                  size={21}
                  className={isActive ? 'text-green-600 dark:text-green-400' : 'text-muted'}
                />
                <span className={`text-[11px] ${isActive ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-muted'}`}>
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
