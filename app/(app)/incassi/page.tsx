'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'

type Entry = {
  id: string
  date: string
  total: number
  cash_amount: number
  card_amount: number
  other_amount: number
  other_method: string | null
  avversario: string | null
  notes: string | null
  categories: { name: string } | null
  events: { name: string } | null
}

function seasonFromDate(d: string | null): string | null {
  if (!d) return null
  const y = Number(d.slice(0, 4))
  const m = Number(d.slice(5, 7))
  const start = m >= 8 ? y : y - 1
  return start + '-' + String(start + 1).slice(2)
}

export default function IncassiPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('income_entries')
        .select('id, date, total, cash_amount, card_amount, other_amount, other_method, avversario, notes, categories(name), events(name)')
        .order('date', { ascending: false })
      if (data) setEntries(data as unknown as Entry[])
    }
    load()
  }, [])

  const fmt = (n: number) => 'CHF ' + n.toLocaleString('it-CH', { minimumFractionDigits: 2 })
  const totale = entries.reduce((s, e) => s + Number(e.total || 0), 0)
  const curSeason = seasonFromDate(new Date().toISOString().slice(0, 10))
  const seasonEntries = entries.filter(e => seasonFromDate(e.date) === curSeason)
  const totSeason = seasonEntries.reduce((s, e) => s + Number(e.total || 0), 0)
  const totCash = entries.reduce((s, e) => s + Number(e.cash_amount || 0), 0)
  const totCard = entries.reduce((s, e) => s + Number(e.card_amount || 0), 0)
  const totOther = entries.reduce((s, e) => s + Number(e.other_amount || 0), 0)

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Incassi</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-400">Stagione {curSeason}</p>
            <p className="text-lg font-bold text-green-600">{fmt(totSeason)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Totale storico</p>
            <p className="text-lg font-bold text-gray-900">{fmt(totale)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span>Contanti: {fmt(totCash)}</span>
          <span>Carta: {fmt(totCard)}</span>
          <span>Altro: {fmt(totOther)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {entries.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">Nessun incasso ancora</p>
          </div>
        )}
        {entries.map(entry => (
          <div key={entry.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <button onClick={() => setOpen(open === entry.id ? null : entry.id)} className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp size={18} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{entry.categories?.name || 'Incasso'}{entry.avversario ? ' · vs ' + entry.avversario : ''}</p>
                  <p className="text-sm font-bold text-green-600 flex-shrink-0">{fmt(Number(entry.total || 0))}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString('it-CH')}</p>
                  {entry.events?.name && <span className="text-xs text-gray-400">· {entry.events.name}</span>}
                </div>
              </div>
              {open === entry.id ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
            </button>
            {open === entry.id && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Contanti</span>
                  <span className="font-medium text-gray-900">{fmt(Number(entry.cash_amount || 0))}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Carta</span>
                  <span className="font-medium text-gray-900">{fmt(Number(entry.card_amount || 0))}</span>
                </div>
                {Number(entry.other_amount || 0) > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{entry.other_method || 'Altro'}</span>
                    <span className="font-medium text-gray-900">{fmt(Number(entry.other_amount || 0))}</span>
                  </div>
                )}
                {entry.notes && <p className="text-xs text-gray-500 pt-1 border-t border-gray-100">Note: {entry.notes}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
