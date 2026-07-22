'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Check } from 'lucide-react'

type Ev = { id: string; name: string }
type Cat = { id: string; name: string }
type Supplier = { id: string; name: string }

export default function NuovoSostoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [events, setEvents] = useState<Ev[]>([])
  const [categories, setCategories] = useState<Cat[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [newSupplierName, setNewSupplierName] = useState('')
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    event_id: '',
    category_id: '',
    supplier_id: '',
    description: '',
    amount_incl: '',
    payment_method: 'contanti',
    notes: '',
  })

  useEffect(() => {
    async function loadData() {
      const [{ data: ev }, { data: cat }, { data: sup }] = await Promise.all([
        supabase.from('events').select('id, name').eq('status', 'active'),
        supabase.from('categories').select('id, name').eq('type', 'expense').order('sort_order'),
        supabase.from('suppliers').select('id, name').order('name'),
      ])
      if (ev) setEvents(ev)
      if (cat) setCategories(cat)
      if (sup) setSuppliers(sup)
    }
    loadData()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Fornitore nuovo: crealo (o riusa se esiste gia con lo stesso nome)
    let supplierId: string | null = form.supplier_id || null
    if (form.supplier_id === '__new__') {
      const nm = newSupplierName.trim()
      if (!nm) { setError('Scrivi il nome del nuovo fornitore'); setLoading(false); return }
      const { data: found } = await supabase.from('suppliers').select('id').ilike('name', nm).limit(1)
      if (found && found[0]) {
        supplierId = found[0].id
      } else {
        const { data: created, error: eSup } = await supabase.from('suppliers').insert({ name: nm }).select('id').single()
        if (eSup || !created) { setError('Errore creazione fornitore: ' + (eSup?.message || '')); setLoading(false); return }
        supplierId = created.id
      }
    }

    const { error: eIns } = await supabase.from('manual_expenses').insert({
      date: form.date,
      event_id: form.event_id || null,
      category_id: form.category_id || null,
      supplier_id: supplierId,
      description: form.description,
      amount_incl: parseFloat(form.amount_incl || '0'),
      payment_method: form.payment_method,
      notes: form.notes || null,
      status: 'confirmed',
      created_by: user?.id,
    })
    if (!eIns) { setSuccess(true); setTimeout(() => router.push('/costi'), 1500) }
    else setError('Errore salvataggio: ' + eIns.message)
    setLoading(false)
  }

  if (success) return (
    <div className="p-4 flex flex-col items-center justify-center min-h-64 gap-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <Check size={32} className="text-green-600" />
      </div>
      <p className="font-semibold text-gray-900">Spesa registrata!</p>
      <p className="text-sm text-gray-500">CHF {parseFloat(form.amount_incl || '0').toFixed(2)}</p>
    </div>
  )

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Nuova spesa</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Data</label>
          <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full text-sm text-gray-900 focus:outline-none" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Descrizione *</label>
          <input type="text" name="description" value={form.description} onChange={handleChange} required placeholder="Es. Friggitrice Carnevale Tesserete" className="w-full text-sm text-gray-900 focus:outline-none" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Importo CHF (IVA incl.) *</label>
          <input type="number" name="amount_incl" value={form.amount_incl} onChange={handleChange} required min="0" step="0.05" placeholder="0.00" className="w-full text-sm text-gray-900 focus:outline-none" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fornitore</label>
          <select name="supplier_id" value={form.supplier_id} onChange={handleChange} className="w-full text-sm text-gray-900 focus:outline-none bg-transparent">
            <option value="">Seleziona fornitore...</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            <option value="__new__">+ Crea nuovo fornitore...</option>
          </select>
          {form.supplier_id === '__new__' && (
            <input
              type="text"
              value={newSupplierName}
              onChange={e => setNewSupplierName(e.target.value)}
              placeholder="Nome del nuovo fornitore"
              className="w-full text-sm text-gray-900 border border-green-300 rounded-xl px-3 py-2 mt-3 focus:outline-none focus:border-green-500"
            />
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categoria</label>
          <select name="category_id" value={form.category_id} onChange={handleChange} className="w-full text-sm text-gray-900 focus:outline-none bg-transparent">
            <option value="">Seleziona categoria...</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Evento</label>
          <select name="event_id" value={form.event_id} onChange={handleChange} className="w-full text-sm text-gray-900 focus:outline-none bg-transparent">
            <option value="">Seleziona evento...</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pagamento</label>
          <select name="payment_method" value={form.payment_method} onChange={handleChange} className="w-full text-sm text-gray-900 focus:outline-none bg-transparent">
            <option value="contanti">Contanti</option>
            <option value="postcard">Postcard</option>
            <option value="mastercard">Mastercard</option>
            <option value="twint">TWINT</option>
            <option value="bonifico">Bonifico</option>
            <option value="altro">Altro</option>
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Note</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="Aggiungi una nota..." className="w-full text-sm text-gray-900 focus:outline-none resize-none" />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

        <button type="submit" disabled={loading || !form.description || !form.amount_incl} className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors">
          {loading ? 'Salvataggio...' : 'Registra spesa'}
        </button>

      </form>
    </div>
  )
}
