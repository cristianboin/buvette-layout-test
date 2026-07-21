'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, TrendingDown, TrendingUp, FileText, Calendar } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'

type Invoice = { id: string; invoice_number: string; invoice_date: string; total_incl: number; suppliers: { name: string } | null }
type DayRow = { date: string; total: number; parts: { cat: string; tot: number }[] }

export default function EventoDettaglioPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const eventId = params.id as string

  const [name, setName] = useState('')
  const [totSpese, setTotSpese] = useState(0)
  const [totIncassi, setTotIncassi] = useState(0)
  const [speseCat, setSpeseCat] = useState<Record<string, number>>({})
  const [incassiCat, setIncassiCat] = useState<Record<string, number>>({})
  const [incassiGiorno, setIncassiGiorno] = useState<DayRow[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  useEffect(() => {
    async function load() {
      const { data: ev } = await supabase.from('events').select('name').eq('id', eventId).single()
      if (ev) setName(ev.name)

      const { data: invs } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, total_incl, suppliers(name)')
        .eq('event_id', eventId).eq('status', 'confirmed')
        .order('invoice_date', { ascending: false })
      if (invs) {
        setInvoices(invs as unknown as Invoice[])
      }

      const { data: mans } = await supabase.from('manual_expenses').select('amount_incl, description, categories(name)').eq('event_id', eventId).eq('status', 'confirmed')

      const totInv = (invs || []).reduce((s, i) => s + Number(i.total_incl || 0), 0)
      const totMan = (mans || []).reduce((s, m) => s + Number(m.amount_incl || 0), 0)
      setTotSpese(totInv + totMan)

      const { data: items } = await supabase
        .from('invoice_items')
        .select('total_incl, categories(name), invoices!inner(event_id)')
        .eq('invoices.event_id', eventId)
      const sc: Record<string, number> = {}
      for (const item of (items || []) as any[]) {
        const cat = item.categories?.name || 'Senza categoria'
        sc[cat] = (sc[cat] || 0) + Number(item.total_incl || 0)
      }
      for (const m of (mans || []) as any[]) {
        const cat = m.categories?.name || 'Senza categoria'
        sc[cat] = (sc[cat] || 0) + Number(m.amount_incl || 0)
      }
      setSpeseCat(sc)

      const { data: incs } = await supabase
        .from('income_entries')
        .select('total, date, categories(name)')
        .eq('event_id', eventId).eq('status', 'confirmed')
      const ic: Record<string, number> = {}
      let totInc = 0
      const days = new Map<string, Map<string, number>>()
      for (const inc of (incs || []) as any[]) {
        const cat = inc.categories?.name || 'Senza categoria'
        ic[cat] = (ic[cat] || 0) + Number(inc.total || 0)
        totInc += Number(inc.total || 0)
        if (inc.date) {
          const d = days.get(inc.date) || new Map<string, number>()
          d.set(cat, (d.get(cat) || 0) + Number(inc.total || 0))
          days.set(inc.date, d)
        }
      }
      setIncassiCat(ic)
      setTotIncassi(totInc)
      const dayRows: DayRow[] = Array.from(days.entries())
        .map(([date, m]) => {
          const parts = Array.from(m.entries()).map(([cat, tot]) => ({ cat, tot })).sort((a, b) => b.tot - a.tot)
          return { date, total: parts.reduce((s, p) => s + p.tot, 0), parts }
        })
        .sort((a, b) => a.date.localeCompare(b.date))
      setIncassiGiorno(dayRows)
    }
    load()
  }, [eventId])

  const saldo = totIncassi - totSpese
  const fmt = (n: number) => 'CHF ' + n.toLocaleString('it-CH', { minimumFractionDigits: 2 })
  const fmtDay = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('it-CH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{name}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-3 text-center">
          <TrendingUp size={16} className="text-green-600 mx-auto mb-1" />
          <p className="text-xs text-gray-400">Incassi</p>
          <p className="text-sm font-bold text-green-600">CHF {totIncassi.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-3 text-center">
          <TrendingDown size={16} className="text-red-600 mx-auto mb-1" />
          <p className="text-xs text-gray-400">Spese</p>
          <p className="text-sm font-bold text-red-600">CHF {totSpese.toFixed(0)}</p>
        </div>
        <div className={saldo >= 0 ? 'rounded-2xl border p-3 text-center bg-green-50 border-green-200' : 'rounded-2xl border p-3 text-center bg-red-50 border-red-200'}>
          <p className="text-xs text-gray-400 mt-5">Saldo</p>
          <p className={saldo >= 0 ? 'text-sm font-bold text-green-600' : 'text-sm font-bold text-red-600'}>CHF {saldo.toFixed(0)}</p>
        </div>
      </div>

      {incassiGiorno.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Incassi per giorno</h2>
          <div className="space-y-3">
            {incassiGiorno.map(d => (
              <div key={d.date} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <Calendar size={14} className="text-purple-500" />
                    {fmtDay(d.date)}
                  </span>
                  <span className="text-sm font-bold text-green-600">{fmt(d.total)}</span>
                </div>
                <div className="pl-6 space-y-0.5">
                  {d.parts.map(p => (
                    <div key={p.cat} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{p.cat}</span>
                      <span className="text-xs text-gray-500">{fmt(p.tot)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(incassiCat).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Incassi per categoria</h2>
          <div className="space-y-2">
            {Object.entries(incassiCat).sort((a, b) => b[1] - a[1]).map(([cat, tot]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{cat}</span>
                <span className="text-sm font-semibold text-green-600">{fmt(tot)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(speseCat).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Spese per categoria</h2>
          <div className="space-y-2">
            {Object.entries(speseCat).sort((a, b) => b[1] - a[1]).map(([cat, tot]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{cat}</span>
                <span className="text-sm font-semibold text-gray-900">{fmt(tot)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {invoices.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Fatture ({invoices.length})</h2>
          <div className="space-y-3">
            {invoices.map(inv => (
              <div key={inv.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{inv.suppliers?.name}</p>
                  <p className="text-xs text-gray-400">#{inv.invoice_number} · {new Date(inv.invoice_date).toLocaleDateString('it-CH')}</p>
                </div>
                <span className="text-sm font-bold text-gray-900">{fmt(Number(inv.total_incl))}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
