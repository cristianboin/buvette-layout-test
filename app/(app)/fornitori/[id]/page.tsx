'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'

type Invoice = {
  id: string
  invoice_number: string
  invoice_date: string
  total_incl: number
}
type Item = {
  original_desc: string
  quantity: number
  unit: string
  total_incl: number
  categories: { name: string } | null
}
type CatRow = { name: string; total: number; subs: { name: string; total: number }[] }

export default function FornitoreDettaglioPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [catRows, setCatRows] = useState<CatRow[]>([])
  const [openCat, setOpenCat] = useState<string | null>(null)
  const [openInvoice, setOpenInvoice] = useState<string | null>(null)
  const [items, setItems] = useState<Record<string, Item[]>>({})

  const supplierId = params.id as string

  useEffect(() => {
    async function load() {
      const { data: sup } = await supabase.from('suppliers').select('name').eq('id', supplierId).single()
      if (sup) setName(sup.name)

      const { data: invs } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, total_incl')
        .eq('supplier_id', supplierId)
        .eq('status', 'confirmed')
        .order('invoice_date', { ascending: false })
      if (invs) setInvoices(invs)

      const { data: allItems } = await supabase
        .from('invoice_items')
        .select('total_incl, categories(name), products(subcategory), invoices!inner(supplier_id)')
        .eq('invoices.supplier_id', supplierId)

      const map = new Map<string, { total: number; subs: Map<string, number> }>()
      for (const item of (allItems || []) as any[]) {
        const catName = item.categories?.name || 'Senza categoria'
        const subName = item.products?.subcategory || 'Altro'
        const cur = map.get(catName) || { total: 0, subs: new Map<string, number>() }
        cur.total += Number(item.total_incl || 0)
        cur.subs.set(subName, (cur.subs.get(subName) || 0) + Number(item.total_incl || 0))
        map.set(catName, cur)
      }
      const rows: CatRow[] = Array.from(map.entries())
        .map(([nm, v]) => ({
          name: nm,
          total: v.total,
          subs: Array.from(v.subs.entries()).map(([sn, st]) => ({ name: sn, total: st })).sort((a, b) => b.total - a.total),
        }))
        .sort((a, b) => b.total - a.total)
      setCatRows(rows)
    }
    load()
  }, [supplierId])

  async function toggleInvoice(invId: string) {
    if (openInvoice === invId) { setOpenInvoice(null); return }
    setOpenInvoice(invId)
    if (!items[invId]) {
      const { data } = await supabase
        .from('invoice_items')
        .select('original_desc, quantity, unit, total_incl, categories(name)')
        .eq('invoice_id', invId)
        .order('line_number')
      if (data) setItems(prev => ({ ...prev, [invId]: data as unknown as Item[] }))
    }
  }

  const total = invoices.reduce((s, i) => s + Number(i.total_incl || 0), 0)
  const fmt = (n: number) => 'CHF ' + n.toLocaleString('it-CH', { minimumFractionDigits: 2 })

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{name}</h1>
          <p className="text-sm text-gray-500">Totale: {fmt(total)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Per categoria</h2>
        <div className="space-y-1">
          {catRows.map(cat => (
            <div key={cat.name}>
              <button onClick={() => setOpenCat(openCat === cat.name ? null : cat.name)} className="w-full flex items-center justify-between py-1.5 text-left">
                <span className="flex items-center gap-1.5 text-sm text-gray-700">
                  {openCat === cat.name ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                  {cat.name}
                </span>
                <span className="text-sm font-semibold text-gray-900">{fmt(cat.total)}</span>
              </button>
              {openCat === cat.name && (
                <div className="pl-6 pb-2 space-y-1">
                  {cat.subs.map(s => (
                    <div key={s.name} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{s.name}</span>
                      <span className="text-xs font-medium text-gray-600">{fmt(s.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Fatture ({invoices.length})</h2>
      <div className="space-y-3">
        {invoices.map(inv => (
          <div key={inv.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <button onClick={() => toggleInvoice(inv.id)} className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">#{inv.invoice_number}</p>
                <p className="text-xs text-gray-400">{new Date(inv.invoice_date).toLocaleDateString('it-CH')}</p>
              </div>
              <span className="text-sm font-bold text-gray-900">{fmt(Number(inv.total_incl))}</span>
              {openInvoice === inv.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {openInvoice === inv.id && items[inv.id] && (
              <div className="border-t border-gray-100 px-4 py-3 space-y-2 bg-gray-50">
                {items[inv.id].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 truncate">{item.original_desc}</p>
                      <p className="text-gray-400">{item.quantity} {item.unit} · {item.categories?.name}</p>
                    </div>
                    <span className="font-medium text-gray-900 ml-2">CHF {Number(item.total_incl).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
