'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Check } from 'lucide-react'

type Ev = { id: string; name: string }
type Cat = { id: string; name: string }

export default function NuovoIncassoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [events, setEvents] = useState<Ev[]>([])
  const [categories, setCategories] = useState<Cat[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    event_id: '',
    category_id: '',
    cash_amount: '',
    card_amount: '',
    other_amount: '',
    notes: '',
  })

  useEffect(() => {
    async function loadData() {
      const [{ data: ev }, { data: cat }] = await Promise.all([
        supabase.from('events').select('id, name').eq('status', 'active'),
        supabase.from('categories').select('id, name').eq('type', 'income').order('sort_order'),
      ])
      if (ev) setEvents(ev)
      if (cat) setCategories(cat)
    }
    loadData()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const total = parseFloat(form.cash_amount || '0') + parseFloat(form.card_amount || '0') + parseFloat(form.other_amount || '0')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('income_entries').insert({
      date: form.date,
      event_id: form.event_id || null,
      category_id: form.category_id || null,
      cash_amount: parseFloat(form.cash_amount || '0'),
      card_amount: parseFloat(form.card_amount || '0'),
      other_amount: parseFloat(form.other_amount || '0'),
      total,
      notes: form.notes || null,
      status: 'confirmed',
      created_by: user?.id,
      confirmed_by: user?.id,
      confirmed_at: new Date().toISOString(),
    })
    if (!error) { setSuccess(true); setTimeout(() => router.push('/incassi'), 1500) }
    setLoading(false)
  }

  if (success) return (
    <div className="p-4 flex flex-col items-center justify-center min-h-64 gap-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <Check size={32} className="text-green-600" />
      </div>
      <p className="font-semibold text-gray-900">Incasso registrato!</p>
      <p className="text-sm text-gray-500">CHF {total.toFixed(2)}</p>
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
          <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full text-sm text-gray-900 focus:outline-none" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Evento</label>
          <select name="event_id" value={form.event_id} onChange={handleChange} className="w-full text-sm text-gray-900 focus:outline-none bg-transparent">
            <option value="">Seleziona evento...</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categoria</label>
          <select name="category_id" value={form.category_id} onChange={handleChange} className="w-full text-sm text-gray-900 focus:outline-none bg-transparent">
            <option value="">Seleziona categoria...</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Importi (CHF)</label>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Contanti</span>
            <input type="number" name="cash_amount" value={form.cash_amount} onChange={handleChange} min="0" step="0.05" placeholder="0.00" className="w-28 text-right text-sm text-gray-900 focus:outline-none border-b border-gray-200 pb-1" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Carta / TWINT</span>
            <input type="number" name="card_amount" value={form.card_amount} onChange={handleChange} min="0" step="0.05" placeholder="0.00" className="w-28 text-right text-sm text-gray-900 focus:outline-none border-b border-gray-200 pb-1" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Altro</span>
            <input type="number" name="other_amount" value={form.other_amount} onChange={handleChange} min="0" step="0.05" placeholder="0.00" className="w-28 text-right text-sm text-gray-900 focus:outline-none border-b border-gray-200 pb-1" />
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Totale</span>
            <span className="text-lg font-bold text-green-600">CHF {total.toFixed(2)}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Note</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="Aggiungi una nota..." className="w-full text-sm text-gray-900 focus:outline-none resize-none" />
        </div>
        <button type="submit" disabled={loading || total === 0} className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors">
          {loading ? 'Salvataggio...' : `Registra CHF ${total.toFixed(2)}`}
        </button>
      </form>
    </div>
  )
}
