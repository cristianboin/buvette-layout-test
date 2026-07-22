'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Check } from 'lucide-react'

type Ev = { id: string; name: string; type: string }
type Cat = { id: string; name: string }

function currentSeason(): string {
  const now = new Date()
  const start = now.getMonth() + 1 >= 8 ? now.getFullYear() : now.getFullYear() - 1
  return start + '-' + String(start + 1).slice(2)
}

export default function NuovoIncassoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [events, setEvents] = useState<Ev[]>([])
  const [categories, setCategories] = useState<Cat[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [eventId, setEventId] = useState('')
  const [avversario, setAvversario] = useState('')
  const [newEventName, setNewEventName] = useState('')
  const [newEventType, setNewEventType] = useState('feste')
  const [notes, setNotes] = useState('')
  const [amounts, setAmounts] = useState<Record<string, { cash: string; card: string }>>({})

  useEffect(() => {
    async function loadData() {
      const [{ data: ev }, { data: cat }] = await Promise.all([
        supabase.from('events').select('id, name, type').in('status', ['active', 'closed']).order('name'),
        supabase.from('categories').select('id, name').eq('type', 'income').order('sort_order'),
      ])
      if (ev) setEvents(ev)
      if (cat) setCategories(cat)
    }
    loadData()
  }, [])

  const selectedEvent = events.find(e => e.id === eventId)
  const isNewEvent = eventId === '__new__'
  const isCampionato = selectedEvent?.type === 'campionato'

  const visibleCategories = isCampionato
    ? categories.filter(c => ['Buvette', 'Griglia / Cucina', 'Entrate campo'].includes(c.name))
    : categories

  function setAmount(catId: string, field: 'cash' | 'card', value: string) {
    setAmounts(prev => ({
      ...prev,
      [catId]: { ...(prev[catId] || { cash: '', card: '' }), [field]: value }
    }))
  }

  const totalGeneral = Object.values(amounts).reduce((sum, a) => 
    sum + parseFloat(a.cash || '0') + parseFloat(a.card || '0'), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    let realEventId: string | null = eventId || null
    if (eventId === '__new__') {
      const nm = newEventName.trim()
      if (!nm) { setLoading(false); return }
      const { data: created, error: eEv } = await supabase.from('events').insert({
        name: nm,
        type: newEventType,
        season: currentSeason(),
        status: 'active',
      }).select('id').single()
      if (eEv || !created) { setLoading(false); return }
      realEventId = created.id
    }

    const rows = Object.entries(amounts)
      .filter(([, a]) => parseFloat(a.cash || '0') + parseFloat(a.card || '0') > 0)
      .map(([catId, a]) => ({
        date,
        event_id: realEventId,
        category_id: catId,
        cash_amount: parseFloat(a.cash || '0'),
        card_amount: parseFloat(a.card || '0'),
        other_amount: 0,
        total: parseFloat(a.cash || '0') + parseFloat(a.card || '0'),
        avversario: avversario || null,
        notes: notes || null,
        status: 'confirmed',
        created_by: user?.id,
        confirmed_by: user?.id,
        confirmed_at: new Date().toISOString(),
      }))

    if (rows.length === 0) { setLoading(false); return }

    const { error } = await supabase.from('income_entries').insert(rows)
    if (!error) { setSuccess(true); setTimeout(() => router.push('/incassi'), 1500) }
    setLoading(false)
  }

  if (success) return (
    <div className="p-4 flex flex-col items-center justify-center min-h-64 gap-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <Check size={32} className="text-green-600" />
      </div>
      <p className="font-semibold text-gray-900">Incassi registrati!</p>
      <p className="text-sm text-gray-500">CHF {totalGeneral.toFixed(2)}</p>
    </div>
  )

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Nuovo incasso</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Data</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full text-sm text-gray-900 focus:outline-none" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Evento *</label>
          <select value={eventId} onChange={e => setEventId(e.target.value)} required className="w-full text-sm text-gray-900 focus:outline-none bg-transparent">
            <option value="">Seleziona evento...</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            <option value="__new__">+ Crea nuovo evento...</option>
          </select>
          {eventId === '__new__' && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <input
                type="text"
                value={newEventName}
                onChange={e => setNewEventName(e.target.value)}
                placeholder="Nome nuovo evento"
                className="text-sm text-gray-900 border border-green-300 rounded-xl px-3 py-2 focus:outline-none focus:border-green-500"
              />
              <select value={newEventType} onChange={e => setNewEventType(e.target.value)} className="text-sm text-gray-900 border border-green-300 rounded-xl px-2 py-2 bg-white focus:outline-none">
                <option value="feste">Feste</option>
                <option value="torneo">Torneo</option>
                <option value="campionato">Campionato</option>
                <option value="generale">Generale</option>
              </select>
            </div>
          )}
        </div>

        {isCampionato && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Avversario</label>
            <input type="text" value={avversario} onChange={e => setAvversario(e.target.value)} placeholder="Es. FC Lugano" className="w-full text-sm text-gray-900 focus:outline-none" />
          </div>
        )}

        {eventId && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Importi per categoria (CHF)</label>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-400 pb-1 border-b border-gray-100">
                <span>Categoria</span>
                <span className="text-right">Contanti</span>
                <span className="text-right">Carta/TWINT</span>
              </div>
              {visibleCategories.map(cat => (
                <div key={cat.id} className="grid grid-cols-3 gap-2 items-center">
                  <span className="text-sm text-gray-700">{cat.name}</span>
                  <input
                    type="number"
                    value={amounts[cat.id]?.cash || ''}
                    onChange={e => setAmount(cat.id, 'cash', e.target.value)}
                    min="0" step="0.05" placeholder="0.00"
                    className="text-right text-sm text-gray-900 focus:outline-none border-b border-gray-200 pb-1"
                  />
                  <input
                    type="number"
                    value={amounts[cat.id]?.card || ''}
                    onChange={e => setAmount(cat.id, 'card', e.target.value)}
                    min="0" step="0.05" placeholder="0.00"
                    className="text-right text-sm text-gray-900 focus:outline-none border-b border-gray-200 pb-1"
                  />
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Totale</span>
                <span className="text-lg font-bold text-green-600">CHF {totalGeneral.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Note</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Aggiungi una nota..." className="w-full text-sm text-gray-900 focus:outline-none resize-none" />
        </div>

        <button type="submit" disabled={loading || totalGeneral === 0} className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors">
          {loading ? 'Salvataggio...' : `Registra CHF ${totalGeneral.toFixed(2)}`}
        </button>
      </form>
    </div>
  )
}
