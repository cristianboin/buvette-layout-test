'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Calculator, Check, Camera } from 'lucide-react'

type Ev = { id: string; name: string }
type Closure = { id: string; date: string; cash_counted: number; difference: number; responsible: string | null; events: { name: string } | null }

const TAGLI = [
  { v: 200, label: 'CHF 200' },
  { v: 100, label: 'CHF 100' },
  { v: 50, label: 'CHF 50' },
  { v: 20, label: 'CHF 20' },
  { v: 10, label: 'CHF 10' },
  { v: 5, label: 'CHF 5' },
  { v: 2, label: 'CHF 2' },
  { v: 1, label: 'CHF 1' },
  { v: 0.5, label: '50 ct' },
  { v: 0.2, label: '20 ct' },
  { v: 0.1, label: '10 ct' },
  { v: 0.05, label: '5 ct' },
]

const fmt = (n: number) => 'CHF ' + n.toLocaleString('it-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ChiusuraPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<Ev[]>([])
  const [closures, setClosures] = useState<Closure[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [eventId, setEventId] = useState('')
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [pos, setPos] = useState('')
  const [twint, setTwint] = useState('')
  const [responsible, setResponsible] = useState('')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [expCash, setExpCash] = useState(0)
  const [expCard, setExpCard] = useState(0)
  const [expOther, setExpOther] = useState(0)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: ev }, { data: cls }] = await Promise.all([
        supabase.from('events').select('id, name').in('status', ['active', 'closed']).order('name'),
        supabase.from('cash_closures').select('id, date, cash_counted, difference, responsible, events(name)').order('date', { ascending: false }).limit(10),
      ])
      if (ev) setEvents(ev)
      if (cls) setClosures(cls as unknown as Closure[])
    }
    load()
  }, [])

  useEffect(() => {
    async function loadExpected() {
      let q = supabase.from('income_entries').select('cash_amount, card_amount, other_amount').eq('date', date).eq('status', 'confirmed')
      if (eventId) q = q.eq('event_id', eventId)
      const { data } = await q
      const rows = (data || []) as { cash_amount: number; card_amount: number; other_amount: number }[]
      setExpCash(rows.reduce((s, r) => s + Number(r.cash_amount || 0), 0))
      setExpCard(rows.reduce((s, r) => s + Number(r.card_amount || 0), 0))
      setExpOther(rows.reduce((s, r) => s + Number(r.other_amount || 0), 0))
    }
    loadExpected()
  }, [date, eventId])

  const cashCounted = Math.round(TAGLI.reduce((s, t) => s + t.v * (parseInt(counts[String(t.v)] || '0') || 0), 0) * 100) / 100
  const diff = Math.round((cashCounted - expCash) * 100) / 100

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      let photoUrl: string | null = null
      if (photo) {
        const fileName = 'chiusure/' + Date.now() + '-' + photo.name
        const { error: eUp } = await supabase.storage.from('documents').upload(fileName, photo)
        if (!eUp) {
          const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName)
          photoUrl = publicUrl
        }
      }

      const { error: eIns } = await supabase.from('cash_closures').insert({
        date,
        event_id: eventId || null,
        counted: counts,
        cash_counted: cashCounted,
        pos_total: pos ? parseFloat(pos) : null,
        twint_total: twint ? parseFloat(twint) : null,
        expected_cash: expCash,
        expected_card: expCard,
        expected_other: expOther,
        difference: diff,
        responsible: responsible || null,
        notes: notes || null,
        photo_url: photoUrl,
        status: 'closed',
        created_by: user?.id,
      })
      if (eIns) throw new Error(eIns.message)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    }
    setSaving(false)
  }

  if (done) return (
    <div className="p-4 flex flex-col items-center justify-center min-h-64 gap-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <Check size={32} className="text-green-600" />
      </div>
      <p className="font-semibold text-gray-900">Chiusura registrata!</p>
      <p className="text-sm text-gray-500">Contanti: {fmt(cashCounted)} · Differenza: {fmt(diff)}</p>
    </div>
  )

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator size={20} className="text-green-600" /> Chiusura cassa
        </h1>
        <p className="text-sm text-gray-500 mt-1">Conta i contanti e confronta con il registrato</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Data</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Evento</label>
          <select value={eventId} onChange={e => setEventId(e.target.value)} className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-2 py-2 bg-white focus:outline-none">
            <option value="">Tutti / nessuno</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Conta contanti (numero di pezzi)</h2>
        <div className="grid grid-cols-2 gap-2">
          {TAGLI.map(t => {
            const pezzi = parseInt(counts[String(t.v)] || '0') || 0
            return (
              <div key={t.v} className="flex items-center gap-2">
                <span className="text-sm text-gray-700 w-16 flex-shrink-0">{t.label}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={counts[String(t.v)] || ''}
                  onChange={e => setCounts(prev => ({ ...prev, [String(t.v)]: e.target.value }))}
                  placeholder="0"
                  className="w-full text-center text-sm text-gray-900 border border-gray-200 rounded-xl px-2 py-2 focus:outline-none focus:border-green-400"
                />
                <span className="text-xs text-gray-400 w-16 text-right flex-shrink-0">{pezzi > 0 ? fmt(t.v * pezzi) : ''}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <span className="text-sm font-semibold text-gray-900">Totale contanti contati</span>
          <span className="text-lg font-bold text-gray-900">{fmt(cashCounted)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Totale POS / carte</label>
          <input type="number" step="0.05" value={pos} onChange={e => setPos(e.target.value)} placeholder="Dallo scontrino di chiusura" className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Totale Twint</label>
          <input type="number" step="0.05" value={twint} onChange={e => setTwint(e.target.value)} placeholder="0.00" className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Confronto con il registrato</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Contanti registrati in app</span>
            <span className="font-medium text-gray-900">{fmt(expCash)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Contanti contati</span>
            <span className="font-medium text-gray-900">{fmt(cashCounted)}</span>
          </div>
          <div className={'flex items-center justify-between rounded-xl px-3 py-2 ' + (Math.abs(diff) < 0.05 ? 'bg-green-50' : 'bg-red-50')}>
            <span className={'font-semibold ' + (Math.abs(diff) < 0.05 ? 'text-green-700' : 'text-red-700')}>Differenza di cassa</span>
            <span className={'font-bold ' + (Math.abs(diff) < 0.05 ? 'text-green-700' : 'text-red-700')}>{diff > 0 ? '+' : ''}{fmt(diff)}</span>
          </div>
          {(expCard > 0 || expOther > 0) && (
            <p className="text-xs text-gray-400 pt-1">Registrati: carta {fmt(expCard)} · Twint/altro {fmt(expOther)}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Responsabile</label>
          <input type="text" value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Chi ha contato la cassa" className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Note</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Facoltative" className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <Camera size={16} className="text-gray-400" />
          <span>{photo ? photo.name : 'Foto scontrino chiusura (facoltativa)'}</span>
          <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)} className="hidden" />
        </label>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl mb-4">{error}</p>}

      <button onClick={handleSave} disabled={saving || cashCounted === 0} className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors mb-6">
        {saving ? 'Salvataggio...' : 'Registra chiusura'}
      </button>

      {closures.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Ultime chiusure</h2>
          <div className="space-y-2">
            {closures.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">{new Date(c.date).toLocaleDateString('it-CH')}{c.events?.name ? ' · ' + c.events.name : ''}</p>
                  <p className="text-xs text-gray-400">{c.responsible || ''}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{fmt(Number(c.cash_counted || 0))}</p>
                  <p className={'text-xs ' + (Math.abs(Number(c.difference || 0)) < 0.05 ? 'text-green-600' : 'text-red-600')}>{Number(c.difference || 0) > 0 ? '+' : ''}{fmt(Number(c.difference || 0))}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
