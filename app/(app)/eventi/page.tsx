'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Calendar, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Ev = { id: string; name: string; type: string; season: string; status: string; spese: number; incassi: number }

const typeLabel: Record<string, string> = {
  campionato: 'Campionato', torneo: 'Torneo', feste: 'Feste', generale: 'Generale',
}
const statusLabel: Record<string, { label: string; cls: string }> = {
  active: { label: 'Attivo', cls: 'bg-green-100 text-green-700' },
  closed: { label: 'Chiuso', cls: 'bg-gray-100 text-gray-600' },
  planned: { label: 'Pianificato', cls: 'bg-blue-100 text-blue-700' },
}

export default function EventiPage() {
  const [events, setEvents] = useState<Ev[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: evs } = await supabase.from('events').select('id, name, type, season, status').order('season', { ascending: false })
      const { data: invs } = await supabase.from('invoices').select('event_id, total_incl').eq('status', 'confirmed')
      const { data: mans } = await supabase.from('manual_expenses').select('event_id, amount_incl').eq('status', 'confirmed')
      const { data: incs } = await supabase.from('income_entries').select('event_id, total').eq('status', 'confirmed')
      if (!evs) return
      const spese: Record<string, number> = {}
      const incassi: Record<string, number> = {}
      for (const i of invs || []) if (i.event_id) spese[i.event_id] = (spese[i.event_id] || 0) + Number(i.total_incl || 0)
      for (const m of mans || []) if (m.event_id) spese[m.event_id] = (spese[m.event_id] || 0) + Number(m.amount_incl || 0)
      for (const inc of incs || []) if (inc.event_id) incassi[inc.event_id] = (incassi[inc.event_id] || 0) + Number(inc.total || 0)
      setEvents(evs.map(e => ({ ...e, spese: spese[e.id] || 0, incassi: incassi[e.id] || 0 })))
    }
    load()
  }, [])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Eventi</h1>
      </div>
      <div className="space-y-3">
        {events.map(ev => {
          const st = statusLabel[ev.status] || statusLabel.closed
          return (
            <button key={ev.id} onClick={() => router.push(`/eventi/${ev.id}`)} className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{ev.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${st.cls}`}>{st.label}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Spese CHF {ev.spese.toFixed(0)} · Incassi CHF {ev.incassi.toFixed(0)}
                </p>
              </div>
              <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
