'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ChevronRight, ChevronLeft, Package, Layers } from 'lucide-react'

type Row = {
  quantity: number
  total_incl: number
  category_id: string | null
  product_id: string | null
  products: { canonical_name: string; default_unit: string | null; subcategory: string | null; product_group: string | null } | null
  invoices: { invoice_date: string; event_id: string | null } | null
}
type Cat = { id: string; name: string }
type Ev = { id: string; name: string }

const fmtChf = (n: number) => 'CHF ' + n.toLocaleString('it-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtQty = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1)

export default function ProdottiPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [cats, setCats] = useState<Cat[]>([])
  const [events, setEvents] = useState<Ev[]>([])
  const [year, setYear] = useState('all')
  const [ev, setEv] = useState('all')
  const [selCat, setSelCat] = useState<string | null>(null)
  const [selSub, setSelSub] = useState<string | null>(null)
  const [selGrp, setSelGrp] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [ri, rc, re] = await Promise.all([
        supabase.from('invoice_items').select('quantity, total_incl, category_id, product_id, products(canonical_name, default_unit, subcategory, product_group), invoices(invoice_date, event_id)'),
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

  const baseRows = useMemo(() => rows.filter(r => {
    if (!r.products) return false
    if (year !== 'all' && r.invoices?.invoice_date?.slice(0, 4) !== year) return false
    if (ev !== 'all' && r.invoices?.event_id !== ev) return false
    return true
  }), [rows, year, ev])

  const catRows = useMemo(() => baseRows.filter(r => !selCat || r.category_id === selCat), [baseRows, selCat])
  const subRows = useMemo(() => catRows.filter(r => !selSub || (r.products!.subcategory || 'Altro') === selSub), [catRows, selSub])
  const grpRows = useMemo(() => subRows.filter(r => !selGrp || r.products!.product_group === selGrp), [subRows, selGrp])

  // Livello 1: categorie
  const catList = useMemo(() => {
    const m = new Map<string, { name: string; total: number; n: Set<string> }>()
    baseRows.forEach(r => {
      const key = r.category_id || 'none'
      const cur = m.get(key) || { name: cats.find(c => c.id === r.category_id)?.name || 'Senza categoria', total: 0, n: new Set<string>() }
      cur.total += Number(r.total_incl) || 0
      cur.n.add(r.product_id || r.products!.canonical_name)
      m.set(key, cur)
    })
    return Array.from(m.entries()).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.total - a.total)
  }, [baseRows, cats])

  // Livello 2: sottocategorie
  const subList = useMemo(() => {
    const m = new Map<string, { total: number; n: Set<string> }>()
    catRows.forEach(r => {
      const key = r.products!.subcategory || 'Altro'
      const cur = m.get(key) || { total: 0, n: new Set<string>() }
      cur.total += Number(r.total_incl) || 0
      cur.n.add(r.product_id || r.products!.canonical_name)
      m.set(key, cur)
    })
    return Array.from(m.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total)
  }, [catRows])

  // Livello 3: gruppi + prodotti singoli
  const grpList = useMemo(() => {
    const m = new Map<string, { type: 'group' | 'product'; name: string; unit: string; qty: number; total: number; n: Set<string> }>()
    subRows.forEach(r => {
      const g = r.products!.product_group
      const key = g ? 'g:' + g : 'p:' + (r.product_id || r.products!.canonical_name)
      const cur = m.get(key) || { type: g ? 'group' as const : 'product' as const, name: g || r.products!.canonical_name, unit: r.products!.default_unit || '', qty: 0, total: 0, n: new Set<string>() }
      cur.qty += Number(r.quantity) || 0
      cur.total += Number(r.total_incl) || 0
      cur.n.add(r.product_id || r.products!.canonical_name)
      m.set(key, cur)
    })
    return Array.from(m.values()).sort((a, b) => b.total - a.total)
  }, [subRows])

  // Livello 4: prodotti dentro un gruppo
  const prodList = useMemo(() => {
    const m = new Map<string, { name: string; unit: string; qty: number; total: number }>()
    grpRows.forEach(r => {
      const key = r.product_id || r.products!.canonical_name
      const cur = m.get(key) || { name: r.products!.canonical_name, unit: r.products!.default_unit || '', qty: 0, total: 0 }
      cur.qty += Number(r.quantity) || 0
      cur.total += Number(r.total_incl) || 0
      m.set(key, cur)
    })
    return Array.from(m.values()).sort((a, b) => b.total - a.total)
  }, [grpRows])

  const level = selGrp ? 4 : selSub ? 3 : selCat ? 2 : 1
  const curTotal = (level === 1 ? baseRows : level === 2 ? catRows : level === 3 ? subRows : grpRows).reduce((s, r) => s + (Number(r.total_incl) || 0), 0)
  const catName = selCat ? (cats.find(c => c.id === selCat)?.name || '') : ''

  function goBack() {
    if (selGrp) setSelGrp(null)
    else if (selSub) setSelSub(null)
    else if (selCat) setSelCat(null)
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Prodotti</h1>
        <p className="text-sm text-gray-500 mt-1">{fmtChf(curTotal)}{level === 1 ? ' spesa totale' : ''}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <select value={year} onChange={e => setYear(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700">
          <option value="all">Tutti gli anni</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={ev} onChange={e => setEv(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700">
          <option value="all">Tutti gli eventi</option>
          {events.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </div>

      {level > 1 && (
        <button onClick={goBack} className="flex items-center gap-1 text-sm text-purple-600 font-medium mb-3">
          <ChevronLeft size={16} /> Indietro
        </button>
      )}
      {level > 1 && (
        <p className="text-xs text-gray-400 mb-3">
          {catName}{selSub ? ' › ' + selSub : ''}{selGrp ? ' › ' + selGrp : ''}
        </p>
      )}

      {loading && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">Caricamento...</p>
        </div>
      )}

      {!loading && level === 1 && (
        <div className="space-y-2">
          {catList.map(c => (
            <button key={c.id} onClick={() => c.id !== 'none' && setSelCat(c.id)} className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Layers size={18} className="text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.n.size} prodotti</p>
              </div>
              <p className="text-sm font-semibold text-gray-900 flex-shrink-0">{fmtChf(c.total)}</p>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {!loading && level === 2 && (
        <div className="space-y-2">
          {subList.map(s => (
            <button key={s.name} onClick={() => setSelSub(s.name)} className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Layers size={18} className="text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.n.size} prodotti</p>
              </div>
              <p className="text-sm font-semibold text-gray-900 flex-shrink-0">{fmtChf(s.total)}</p>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {!loading && level === 3 && (
        <div className="space-y-2">
          {grpList.map((g, i) => (
            g.type === 'group' ? (
              <button key={i} onClick={() => setSelGrp(g.name)} className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 text-left">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Layers size={18} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{g.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{g.n.size} varianti · {fmtQty(g.qty)} pz</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 flex-shrink-0">{fmtChf(g.total)}</p>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </button>
            ) : (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package size={18} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{g.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtQty(g.qty)}{g.unit ? ' ' + g.unit : ' pz'}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 flex-shrink-0">{fmtChf(g.total)}</p>
              </div>
            )
          ))}
        </div>
      )}

      {!loading && level === 4 && (
        <div className="space-y-2">
          {prodList.map((p, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package size={18} className="text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtQty(p.qty)}{p.unit ? ' ' + p.unit : ' pz'}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900 flex-shrink-0">{fmtChf(p.total)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
