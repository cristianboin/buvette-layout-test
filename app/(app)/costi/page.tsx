'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { TrendingDown, Receipt, ChevronDown, ChevronUp } from 'lucide-react'

type Cost = {
  id: string
  date: string
  label: string
  sublabel: string
  total: number
  isManual: boolean
  detail?: string | null
}
type Item = { original_desc: string; quantity: number; unit: string | null; total_incl: number }

function seasonFromDate(d: string | null): string | null {
  if (!d) return null
  const y = Number(d.slice(0, 4))
  const m = Number(d.slice(5, 7))
  const start = m >= 8 ? y : y - 1
  return start + '-' + String(start + 1).slice(2)
}

export default function CostiPage() {
  const [costs, setCosts] = useState<Cost[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [items, setItems] = useState<Record<string, Item[]>>({})
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: invs }, { data: mans }] = await Promise.all([
        supabase.from('invoices').select('id, invoice_date, invoice_number, total_incl, suppliers(name), events(name)').eq('status', 'confirmed'),
        supabase.from('manual_expenses').select('id, date, description, amount_incl, payment_method, notes, suppliers(name), events(name), categories(name)').eq('status', 'confirmed'),
      ])
      const list: Cost[] = []
      for (const i of (invs || []) as any[]) {
        list.push({
          id: i.id,
          date: i.invoice_date,
          label: i.suppliers?.name || 'Fornitore',
          sublabel: '#' + i.invoice_number + (i.events?.name ? ' · ' + i.events.name : ''),
          total: Number(i.total_incl || 0),
          isManual: false,
        })
      }
      for (const m of (mans || []) as any[]) {
        const parts = []
        if (m.categories?.name) parts.push('Categoria: ' + m.categories.name)
        if (m.payment_method) parts.push('Pagamento: ' + m.payment_method)
        if (m.notes) parts.push('Note: ' + m.notes)
        list.push({
          id: m.id,
          date: m.date,
          label: m.description,
          sublabel: (m.suppliers?.name || 'Spesa manuale') + (m.events?.name ? ' · ' + m.events.name : ''),
          total: Number(m.amount_incl || 0),
          isManual: true,
          detail: parts.length > 0 ? parts.join(' · ') : 'Nessun dettaglio aggiuntivo',
        })
      }
      list.sort((a, b) => b.date.localeCompare(a.date))
      setCosts(list)
    }
    load()
  }, [])

  async function toggle(c: Cost) {
    if (open === c.id) { setOpen(null); return }
    setOpen(c.id)
    if (!c.isManual && !items[c.id]) {
      const { data } = await supabase
        .from('invoice_items')
        .select('original_desc, quantity, unit, total_incl')
        .eq('invoice_id', c.id)
        .order('line_number')
      if (data) setItems(prev => ({ ...prev, [c.id]: data as unknown as Item[] }))
    }
  }

  const fmt = (n: number) => 'CHF ' + n.toLocaleString('it-CH', { minimumFractionDigits: 2 })
  const totale = costs.reduce((s, c) => s + c.total, 0)
  const curSeason = seasonFromDate(new Date().toISOString().slice(0, 10))
  const totSeason = costs.filter(c => seasonFromDate(c.date) === curSeason).reduce((s, c) => s + c.total, 0)
  const totFatture = costs.filter(c => !c.isManual).reduce((s, c) => s + c.total, 0)
  const totManuali = costs.filter(c => c.isManual).reduce((s, c) => s + c.total, 0)

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Costi</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-400">Stagione {curSeason}</p>
            <p className="text-lg font-bold text-gray-900">{fmt(totSeason)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Totale storico</p>
            <p className="text-lg font-bold text-gray-900">{fmt(totale)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span>Fatture: {fmt(totFatture)}</span>
          <span>Spese manuali: {fmt(totManuali)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {costs.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">Nessuna spesa ancora</p>
          </div>
        )}
        {costs.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <button onClick={() => toggle(c)} className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors">
              <div className={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ' + (c.isManual ? 'bg-orange-100' : 'bg-red-100')}>
                {c.isManual ? <Receipt size={18} className="text-orange-600" /> : <TrendingDown size={18} className="text-red-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.label}</p>
                  <p className="text-sm font-bold text-red-600 flex-shrink-0">{fmt(c.total)}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1 truncate">{new Date(c.date).toLocaleDateString('it-CH')} · {c.sublabel}</p>
              </div>
              {open === c.id ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
            </button>
            {open === c.id && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                {c.isManual ? (
                  <p className="text-xs text-gray-600">{c.detail}</p>
                ) : items[c.id] ? (
                  <div className="space-y-2">
                    {items[c.id].map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-700 truncate">{it.original_desc}</p>
                          <p className="text-gray-400">{it.quantity}{it.unit ? ' ' + it.unit : ''}</p>
                        </div>
                        <span className="font-medium text-gray-900 ml-2">CHF {Number(it.total_incl).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Carico le righe...</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
