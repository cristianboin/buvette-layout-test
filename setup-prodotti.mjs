import fs from 'fs'

const candidates = ['app/(app)/prodotti/page.tsx']

const path = candidates.find(p => fs.existsSync(p))
if (!path) {
  console.error('ERRORE: non trovo la pagina prodotti')
  process.exit(1)
}

const content = `'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Package } from 'lucide-react'

type Row = {
  quantity: number
  total_incl: number
  category_id: string | null
  product_id: string | null
  products: { canonical_name: string; default_unit: string | null } | null
  invoices: { invoice_date: string; event_id: string | null } | null
}
type Cat = { id: string; name: string }
type Ev = { id: string; name: string }

export default function ProdottiPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [cats, setCats] = useState<Cat[]>([])
  const [events, setEvents] = useState<Ev[]>([])
  const [year, setYear] = useState('all')
  const [cat, setCat] = useState('all')
  const [ev, setEv] = useState('all')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [ri, rc, re] = await Promise.all([
        supabase.from('invoice_items').select('quantity, total_incl, category_id, product_id, products(canonical_name, default_unit), invoices(invoice_date, event_id)'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('events').select('id, name').order('name'),
      ])
      if (ri.data) setRows(ri.data as unknown as Row[])
      if (rc.data) setCats(rc.data as unknown as Cat[])
      if (re.data) setEvents(re.data as unknown as Ev[])
      setLoading(false)
    }
    load()
  }, [])

  const years = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => { if (r.invoices?.invoice_date) s.add(r.invoices.invoice_date.slice(0, 4)) })
    return Array.from(s).sort().reverse()
  }, [rows])

  const list = useMemo(() => {
    const map = new Map<string, { name: string; unit: string; catName: string; qty: number; total: number }>()
    rows.forEach(r => {
      if (!r.products) return
      if (year !== 'all' && r.invoices?.invoice_date?.slice(0, 4) !== year) return
      if (cat !== 'all' && r.category_id !== cat) return
      if (ev !== 'all' && r.invoices?.event_id !== ev) return
      const key = r.product_id || r.products.canonical_name
      const cur = map.get(key) || {
        name: r.products.canonical_name,
        unit: r.products.default_unit || '',
        catName: cats.find(c => c.id === r.category_id)?.name || '',
        qty: 0,
        total: 0,
      }
      cur.qty += Number(r.quantity) || 0
      cur.total += Number(r.total_incl) || 0
      map.set(key, cur)
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [rows, year, cat, ev, cats])

  const totalSpend = list.reduce((s, p) => s + p.total, 0)
  const fmtQty = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1)
  const fmtChf = (n: number) => 'CHF ' + n.toLocaleString('it-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Prodotti</h1>
        <p className="text-sm text-gray-500 mt-1">{list.length} prodotti · {fmtChf(totalSpend)} spesa totale</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <select value={year} onChange={e => setYear(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700">
          <option value="all">Tutti gli anni</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={cat} onChange={e => setCat(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700">
          <option value="all">Tutte le categorie</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={ev} onChange={e => setEv(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700">
          <option value="all">Tutti gli eventi</option>
          {events.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">Caricamento...</p>
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">Nessun prodotto con questi filtri</p>
          </div>
        )}
        {list.map((p, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package size={18} className="text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.catName}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-gray-900">{fmtQty(p.qty)}{p.unit ? ' ' + p.unit : ' pz'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{fmtChf(p.total)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
`

fs.writeFileSync(path, content)
console.log('Pagina prodotti aggiornata:', path)
