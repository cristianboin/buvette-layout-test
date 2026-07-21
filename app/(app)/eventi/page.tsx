'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Calendar, ChevronRight, Plus, X } from 'lucide-react'
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

// Stagione sportiva: 1 agosto - 31 luglio
function currentSeason(): string {
  const now = new Date()
  const start = now.getMonth() + 1 >= 8 ? now.getFullYear() : now.getFullYear() - 1
  return start + '-' + String(start + 1).slice(2)
}
function nextSeason(s: string): string {
  const start = Number(s.slice(0, 4)) + 1
  return start + '-' + String(start + 1).slice(2)
}

export default function EventiPage() {
  const [events, setEvents] = useState<Ev[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fName, setFName] = useState('')
  const [fType, setFType] = useState('feste')
  const [fSeason, setFSeason] = useState(currentSeason())
  const [fStatus, setFStatus] = useState('planned')
  const [fStart, setFStart] = useState('')
  const [fEnd, setFEnd] = useState('')
  const [fNotes, setFNotes] = useState('')
  const supabase = createClient()
  const router = useRouter()

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

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!fName.trim()) return
    setSaving(true)
    const { error } = await supabase.from('events').insert({
      name: fName.trim(),
      type: fType,
      season: fSeason,
      status: fStatus,
      start_date: fStart || null,
      end_date: fEnd || null,
      notes: fNotes || null,
    })
    setSaving(false)
    if (!error) {
      setShowForm(false)
      setFName(''); setFStart(''); setFEnd(''); setFNotes('')
      load()
    } else {
      alert('Errore: ' + error.message)
    }
  }

  const seasonOptions = Array.from(new Set([currentSeason(), nextSeason(currentSeason()), ...events.map(e => e.season).filter(Boolean)])).sort().reverse()

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Eventi</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Nuovo evento
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Nuovo evento</h2>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nome *</label>
              <input type="text" value={fName} onChange={e => setFName(e.target.value)} required placeholder="Es. Torneo 2028" className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tipo</label>
                <select value={fType} onChange={e => setFType(e.target.value)} className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-2 py-2 bg-white focus:outline-none">
                  <option value="campionato">Campionato</option>
                  <option value="torneo">Torneo</option>
                  <option value="feste">Feste</option>
                  <option value="generale">Generale</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Stagione</label>
                <select value={fSeason} onChange={e => setFSeason(e.target.value)} className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-2 py-2 bg-white focus:outline-none">
                  {seasonOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Stato</label>
                <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-2 py-2 bg-white focus:outline-none">
                  <option value="planned">Pianificato</option>
                  <option value="active">Attivo</option>
                  <option value="closed">Chiuso</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Data inizio</label>
                <input type="date" value={fStart} onChange={e => setFStart(e.target.value)} className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Data fine</label>
                <input type="date" value={fEnd} onChange={e => setFEnd(e.target.value)} className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Note</label>
              <input type="text" value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Facoltative" className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
            </div>
            <button type="submit" disabled={saving || !fName.trim()} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creazione...' : 'Crea evento'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {events.map(ev => {
          const st = statusLabel[ev.status] || statusLabel.closed
          return (
            <button key={ev.id} onClick={() => router.push('/eventi/' + ev.id)} className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{ev.name}</p>
                  <span className={'text-xs px-2 py-0.5 rounded-full flex-shrink-0 ' + st.cls}>{st.label}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {typeLabel[ev.type] || ev.type}{ev.season ? ' · Stagione ' + ev.season : ''} · Spese CHF {ev.spese.toFixed(0)} · Incassi CHF {ev.incassi.toFixed(0)}
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
