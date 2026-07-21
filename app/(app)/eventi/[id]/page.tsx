'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, TrendingDown, TrendingUp, FileText } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'

type Invoice = { id: string; invoice_number: string; invoice_date: string; total_incl: number; suppliers: { name: string } | null }

export default function EventoDettaglioPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const eventId = params.id as string

  const [name, setName] = useState('')
  const [totSpese, setTotSpese] = useState(0)
  const [totIncassi, setTotIncassi] = useState(0)
  const [speseCat, setSpeseCat] = useState<Record<string, number>>({})
  const [incassiCat, setIncassiCat] = useState<Record<string, number>>({})
  const [invoices, setInvoices] = useState<Invoice[]>([])

  useEffect(() => {
    async function load() {
      const { data: ev } = await supabase.from('events').select('name').eq('id', eventId).single()
      if (ev) setName(ev.name)

      const { data: invs } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, total_incl, suppliers(name)')
        .eq('event_id', eventId).eq('status', 'confirmed')
        .order('invoice_date', { ascending: false })
      if (invs) {
        setInvoices(invs as unknown as Invoice[])
      }

      const { data: mans } = await supabase.from('manual_expenses').select('amount_incl, description, categories(name)').eq('event_id', eventId).eq('status', 'confirmed')

      const totInv = (invs || []).reduce((s, i) => s + Number(i.total_incl || 0), 0)
      const totMan = (mans || []).reduce((s, m) => s + Number(m.amount_incl || 0), 0)
      setTotSpese(totInv + totMan)

      const { data: items } = await supabase
        .from('invoice_items')
        .select('total_incl, categories(name), invoices!inner(event_id)')
        .eq('invoices.event_id', eventId)
      const sc: Record<string, number> = {}
      for (const item of (items || []) as any[]) {
        const cat = item.categories?.name || 'Senza categoria'
        sc[cat] = (sc[cat] || 0) + Number(item.total_incl || 0)
      }
      for (const m of (mans || []) as any[]) {
        const cat = m.categories?.name || 'Senza categoria'
        sc[cat] = (sc[cat] || 0) + Number(m.amount_incl || 0)
      }
      setSpeseCat(sc)

      const { data: incs } = await supabase
        .from('income_entries')
        .select('total, categories(name)')
        .eq('event_id', eventId).eq('status', 'confirmed')
      const ic: Record<string, number> = {}
      let totInc = 0
      for (const inc of (incs || []) as any[]) {
        const cat = inc.categories?.name || 'Senza categoria'
        ic[cat] = (ic[cat] || 0) + Number(inc.total || 0)
        totInc += Number(inc.total || 0)
      }
      setIncassiCat(ic)
      setTotIncassi(totInc)
    }
    load()
  }, [eventId])

  const saldo = totIncassi - totSpese

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{name}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-3 text-center">
          <TrendingUp size={16} className="text-green-600 mx-auto mb-1" />
          <p className="text-xs text-gray-400">Incassi</p>
          <p className="text-sm font-bold text-green-600">CHF {totIncassi.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-3 text-center">
          <TrendingDown size={16} className="text-red-600 mx-auto mb-1" />
          <p className="text-xs text-gray-400">Spese</p>
          <p className="text-sm font-bold text-red-600">CHF {totSpese.toFixed(0)}</p>
        </div>
        <div className={`rounded-2xl border p-3 text-center ${saldo >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs text-gray-400 mt-5">Saldo</p>
          <p className={`text-sm font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>CHF {saldo.toFixed(0)}</p>
        </div>
      </div>

      {Object.keys(incassiCat).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Incassi per categoria</h2>
          <div className="space-y-2">
            {Object.entries(incassiCat).sort((a, b) => b[1] - a[1]).map(([cat, tot]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{cat}</span>
                <span className="text-sm font-semibold text-green-600">CHF {tot.toLocaleString('it-CH', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(speseCat).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Spese per categoria</h2>
          <div className="space-y-2">
            {Object.entries(speseCat).sort((a, b) => b[1] - a[1]).map(([cat, tot]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{cat}</span>
                <span className="text-sm font-semibold text-gray-900">CHF {tot.toLocaleString('it-CH', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {invoices.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Fatture ({invoices.length})</h2>
          <div className="space-y-3">
            {invoices.map(inv => (
              <div key={inv.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{inv.suppliers?.name}</p>
                  <p className="text-xs text-gray-400">#{inv.invoice_number} · {new Date(inv.invoice_date).toLocaleDateString('it-CH')}</p>
                </div>
                <span className="text-sm font-bold text-gray-900">CHF {Number(inv.total_incl).toLocaleString('it-CH', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
