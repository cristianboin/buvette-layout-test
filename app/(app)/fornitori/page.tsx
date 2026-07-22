'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Truck, ChevronRight, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Supplier = { id: string; name: string; total: number }

export default function FornitoriPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fName, setFName] = useState('')
  const [fVat, setFVat] = useState('')
  const [fAddress, setFAddress] = useState('')
  const [fNotes, setFNotes] = useState('')
  const supabase = createClient()
  const router = useRouter()

  async function load() {
    const { data: sups } = await supabase.from('suppliers').select('id, name').order('name')
    const { data: invs } = await supabase.from('invoices').select('supplier_id, total_incl').eq('status', 'confirmed')
    const { data: mans } = await supabase.from('manual_expenses').select('supplier_id, amount_incl').eq('status', 'confirmed')
    if (!sups) return
    const totals: Record<string, number> = {}
    for (const i of invs || []) {
      if (i.supplier_id) totals[i.supplier_id] = (totals[i.supplier_id] || 0) + Number(i.total_incl || 0)
    }
    for (const m of mans || []) {
      if (m.supplier_id) totals[m.supplier_id] = (totals[m.supplier_id] || 0) + Number(m.amount_incl || 0)
    }
    setSuppliers(sups.map(s => ({ ...s, total: totals[s.id] || 0 })).sort((a, b) => b.total - a.total))
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const nm = fName.trim()
    if (!nm) return
    setSaving(true)
    const { data: found } = await supabase.from('suppliers').select('id').ilike('name', nm).limit(1)
    if (found && found[0]) {
      setError('Esiste gia un fornitore con questo nome')
      setSaving(false)
      return
    }
    const { error: eIns } = await supabase.from('suppliers').insert({
      name: nm,
      vat_number: fVat || null,
      address: fAddress || null,
      notes: fNotes || null,
    })
    setSaving(false)
    if (eIns) { setError('Errore: ' + eIns.message); return }
    setShowForm(false)
    setFName(''); setFVat(''); setFAddress(''); setFNotes('')
    load()
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fornitori</h1>
          <p className="text-sm text-gray-500 mt-1">{suppliers.length} fornitori</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 bg-gray-900 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
          <Plus size={16} /> Nuovo
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Nuovo fornitore</h2>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nome *</label>
              <input type="text" value={fName} onChange={e => setFName(e.target.value)} required placeholder="Es. Panetteria Rossi" className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Partita IVA</label>
                <input type="text" value={fVat} onChange={e => setFVat(e.target.value)} placeholder="Facoltativa" className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Indirizzo</label>
                <input type="text" value={fAddress} onChange={e => setFAddress(e.target.value)} placeholder="Facoltativo" className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Note</label>
              <input type="text" value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Facoltative" className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
            <button type="submit" disabled={saving || !fName.trim()} className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {saving ? 'Creazione...' : 'Crea fornitore'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {suppliers.map(s => (
          <button key={s.id} onClick={() => router.push('/fornitori/' + s.id)} className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Truck size={18} className="text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{s.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Totale speso: CHF {s.total.toLocaleString('it-CH', { minimumFractionDigits: 2 })}</p>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  )
}
