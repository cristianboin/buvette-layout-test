'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { TrendingDown, TrendingUp, FileText, AlertCircle } from 'lucide-react'

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
  const [season, setSeason] = useState('all')
  const router = useRouter()
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
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Buongiorno 👋</h1>
        <p className="text-sm text-gray-500 mt-1">{email}</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button onClick={() => setSeason('all')} className={season === 'all' ? 'px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white flex-shrink-0' : 'px-4 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-600 flex-shrink-0'}>
          Tutte
        </button>
        {seasons.map(s => (
          <button key={s} onClick={() => setSeason(s)} className={season === s ? 'px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white flex-shrink-0' : 'px-4 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-600 flex-shrink-0'}>
          Stagione {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown size={16} className="text-red-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Spese</span>
          </div>
          <p className="text-xl font-bold text-gray-900">CHF {spese.toLocaleString('it-CH', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400 mt-1">{season === 'all' ? 'totale confermate' : 'stagione ' + season}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Incassi</span>
          </div>
          <p className="text-xl font-bold text-gray-900">CHF {incassi.toLocaleString('it-CH', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400 mt-1">{season === 'all' ? 'totale confermati' : 'stagione ' + season}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Documenti</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{numDocs}</p>
          <p className="text-xs text-gray-400 mt-1">caricati</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={16} className="text-orange-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Da confermare</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{daConfermare}</p>
          <p className="text-xs text-gray-400 mt-1">documenti</p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Azioni rapide</h2>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => router.push('/incassi/nuovo')} className="bg-green-600 text-white rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-green-700 transition-colors">
            <TrendingUp size={20} />
            <span className="text-xs font-medium">Incasso</span>
          </button>
          <button onClick={() => router.push('/documenti/nuovo')} className="bg-white border border-gray-200 text-gray-700 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors">
            <FileText size={20} />
            <span className="text-xs font-medium">Documento</span>
          </button>
          <button onClick={() => router.push('/costi/nuovo')} className="bg-white border border-gray-200 text-gray-700 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors">
            <TrendingDown size={20} />
            <span className="text-xs font-medium">Spesa</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Saldo{season !== 'all' ? ' ' + season : ''}</span>
          <span className={incassi - spese >= 0 ? 'text-lg font-bold text-green-600' : 'text-lg font-bold text-red-600'}>
            CHF {(incassi - spese).toLocaleString('it-CH', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  )
}
