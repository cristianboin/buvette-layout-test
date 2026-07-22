'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { TrendingDown, TrendingUp, FileText, AlertCircle, Truck, Sparkles } from 'lucide-react'

type Mov = { amount: number; event_id: string | null; date: string | null }
type Ev = { id: string; season: string | null }

// Stagione sportiva: 1 agosto - 31 luglio
function seasonFromDate(d: string | null): string | null {
  if (!d) return null
  const y = Number(d.slice(0, 4))
  const m = Number(d.slice(5, 7))
  const start = m >= 8 ? y : y - 1
  return start + '-' + String(start + 1).slice(2)
}

export default function DashboardPage() {
  const [email, setEmail] = useState('')
  const [invoices, setInvoices] = useState<Mov[]>([])
  const [manual, setManual] = useState<Mov[]>([])
  const [incomes, setIncomes] = useState<Mov[]>([])
  const [events, setEvents] = useState<Ev[]>([])
  const [numDocs, setNumDocs] = useState(0)
  const [daConfermare, setDaConfermare] = useState(0)
  const [season, setSeason] = useState(seasonFromDate(new Date().toISOString().slice(0, 10)) || 'all')
  const router = useRouter()
  const [query, setQuery] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')

      const [{ data: inv }, { data: manExp }, { data: inc }, { data: evs }, { count: docsCount }, { count: pendingCount }] = await Promise.all([
        supabase.from('invoices').select('total_incl, event_id, invoice_date').eq('status', 'confirmed'),
        supabase.from('manual_expenses').select('amount_incl, event_id, date').eq('status', 'confirmed'),
        supabase.from('income_entries').select('total, event_id, date').eq('status', 'confirmed'),
        supabase.from('events').select('id, season'),
        supabase.from('documents').select('*', { count: 'exact', head: true }),
        supabase.from('documents').select('*', { count: 'exact', head: true }).in('status', ['pending', 'to_confirm']),
      ])

      setInvoices((inv || []).map((i: any) => ({ amount: Number(i.total_incl) || 0, event_id: i.event_id, date: i.invoice_date })))
      setManual((manExp || []).map((i: any) => ({ amount: Number(i.amount_incl) || 0, event_id: i.event_id, date: i.date })))
      setIncomes((inc || []).map((i: any) => ({ amount: Number(i.total) || 0, event_id: i.event_id, date: i.date })))
      setEvents((evs || []) as Ev[])
      setNumDocs(docsCount || 0)
      setDaConfermare(pendingCount || 0)
    }
    load()
  }, [])

  const seasons = useMemo(() => {
    const s = new Set<string>()
    events.forEach(e => { if (e.season) s.add(e.season) })
    ;[...invoices, ...manual, ...incomes].forEach(m => {
      const c = seasonFromDate(m.date)
      if (c) s.add(c)
    })
    return Array.from(s).sort().reverse()
  }, [events, invoices, manual, incomes])

  function movSeason(m: Mov): string | null {
    if (m.event_id) {
      const ev = events.find(e => e.id === m.event_id)
      if (ev?.season) return ev.season
    }
    return seasonFromDate(m.date)
  }

  const filt = (list: Mov[]) => season === 'all' ? list : list.filter(m => movSeason(m) === season)
  const spese = filt(invoices).reduce((s, m) => s + m.amount, 0) + filt(manual).reduce((s, m) => s + m.amount, 0)
  const incassi = filt(incomes).reduce((s, m) => s + m.amount, 0)

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Buongiorno 👋</h1>
        <p className="text-sm text-muted mt-0.5">{email}</p>
      </div>

      <div className="flex gap-2 mb-5">
        <div className="flex-1 flex items-center gap-3 bg-surface border border-line rounded-2xl px-4 py-3.5 shadow-sm transition focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-500/25">
          <Sparkles size={18} className="text-amber-500 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && query.trim()) router.push('/chiedi?q=' + encodeURIComponent(query.trim())) }}
            placeholder="Chiedi qualcosa sui dati... es. quanto spendiamo in birra?"
            className="flex-1 text-sm text-ink bg-transparent placeholder:text-muted focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-4 px-4">
        <button
          onClick={() => setSeason('all')}
          className={season === 'all'
            ? 'px-4 py-2 rounded-full text-sm font-semibold bg-green-600 text-white shadow-sm shadow-green-600/30 flex-shrink-0 transition'
            : 'px-4 py-2 rounded-full text-sm font-medium bg-surface border border-line text-muted hover:text-ink flex-shrink-0 transition'}
        >
          Tutte
        </button>
        {seasons.map(s => (
          <button
            key={s}
            onClick={() => setSeason(s)}
            className={season === s
              ? 'px-4 py-2 rounded-full text-sm font-semibold bg-green-600 text-white shadow-sm shadow-green-600/30 flex-shrink-0 transition'
              : 'px-4 py-2 rounded-full text-sm font-medium bg-surface border border-line text-muted hover:text-ink flex-shrink-0 transition'}
          >
            Stagione {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div onClick={() => router.push('/costi')} className="bg-surface rounded-2xl p-4 border border-line shadow-sm hover:shadow-md hover:border-red-200 dark:hover:border-red-900/60 transition cursor-pointer text-left">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-red-50 dark:bg-red-950/40 rounded-xl flex items-center justify-center">
              <TrendingDown size={17} className="text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-medium text-muted">Spese</span>
          </div>
          <p className="text-2xl font-bold tracking-tight tnum text-red-600 dark:text-red-400">CHF {spese.toLocaleString('it-CH', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted mt-1">{season === 'all' ? 'totale confermate' : 'stagione ' + season}</p>
        </div>

        <div onClick={() => router.push('/incassi')} className="bg-surface rounded-2xl p-4 border border-line shadow-sm hover:shadow-md hover:border-green-200 dark:hover:border-green-900/60 transition cursor-pointer text-left">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-green-50 dark:bg-green-950/40 rounded-xl flex items-center justify-center">
              <TrendingUp size={17} className="text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs font-medium text-muted">Incassi</span>
          </div>
          <p className="text-2xl font-bold tracking-tight tnum text-green-600 dark:text-green-400">CHF {incassi.toLocaleString('it-CH', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted mt-1">{season === 'all' ? 'totale confermati' : 'stagione ' + season}</p>
        </div>

        <div onClick={() => router.push('/documenti')} className="bg-surface rounded-2xl p-4 border border-line shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/60 transition cursor-pointer text-left">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-center">
              <FileText size={17} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-medium text-muted">Documenti</span>
          </div>
          <p className="text-2xl font-bold tracking-tight tnum text-ink">{numDocs}</p>
          <p className="text-xs text-muted mt-1">caricati</p>
        </div>

        <div onClick={() => router.push('/documenti')} className="bg-surface rounded-2xl p-4 border border-line shadow-sm hover:shadow-md hover:border-amber-200 dark:hover:border-amber-900/60 transition cursor-pointer text-left">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center">
              <AlertCircle size={17} className="text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-muted">Da confermare</span>
          </div>
          <p className="text-2xl font-bold tracking-tight tnum text-ink">{daConfermare}</p>
          <p className="text-xs text-muted mt-1">documenti</p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Azioni rapide</h2>
        <div className="grid grid-cols-4 gap-3">
          <button onClick={() => router.push('/incassi/nuovo')} className="bg-green-600 text-white rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-green-700 shadow-sm shadow-green-600/30 transition-colors">
            <TrendingUp size={20} />
            <span className="text-xs font-medium">Incasso</span>
          </button>
          <button onClick={() => router.push('/documenti/nuovo')} className="bg-surface border border-line text-ink rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-page transition-colors">
            <FileText size={20} className="text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium">Documento</span>
          </button>
          <button onClick={() => router.push('/costi/nuovo')} className="bg-surface border border-line text-ink rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-page transition-colors">
            <TrendingDown size={20} className="text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium">Spesa</span>
          </button>
          <button onClick={() => router.push('/fornitori')} className="bg-surface border border-line text-ink rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-page transition-colors">
            <Truck size={20} className="text-muted" />
            <span className="text-xs font-medium">Fornitore</span>
          </button>
        </div>
      </div>

      <div className={`rounded-2xl border p-5 shadow-sm ${incassi - spese >= 0 ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">Saldo{season !== 'all' ? ' ' + season : ''}</span>
          <span className={`text-2xl font-bold tnum ${incassi - spese >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            CHF {(incassi - spese).toLocaleString('it-CH', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  )
}
