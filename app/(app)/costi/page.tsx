'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { TrendingDown, Receipt } from 'lucide-react'

type Cost = {
  id: string
  date: string
  label: string
  sublabel: string
  total: number
  isManual: boolean
}

export default function CostiPage() {
  const [costs, setCosts] = useState<Cost[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: invs }, { data: mans }] = await Promise.all([
        supabase.from('invoices').select('id, invoice_date, invoice_number, total_incl, suppliers(name), events(name)').eq('status', 'confirmed'),
        supabase.from('manual_expenses').select('id, date, description, amount_incl, suppliers(name), events(name)').eq('status', 'confirmed'),
      ])

      const list: Cost[] = []
      for (const i of (invs || []) as any[]) {
        list.push({
          id: i.id,
          date: i.invoice_date,
          label: i.suppliers?.name || 'Fornitore',
          sublabel: `#${i.invoice_number}${i.events?.name ? ' · ' + i.events.name : ''}`,
          total: Number(i.total_incl || 0),
          isManual: false,
        })
      }
      for (const m of (mans || []) as any[]) {
        list.push({
          id: m.id,
          date: m.date,
          label: m.description,
          sublabel: `${m.suppliers?.name || 'Spesa manuale'}${m.events?.name ? ' · ' + m.events.name : ''}`,
          total: Number(m.amount_incl || 0),
          isManual: true,
        })
      }
      list.sort((a, b) => b.date.localeCompare(a.date))
      setCosts(list)
    }
    load()
  }, [])

  const totale = costs.reduce((s, c) => s + c.total, 0)

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Costi</h1>
        <p className="text-sm text-gray-500 mt-1">Totale: CHF {totale.toLocaleString('it-CH', { minimumFractionDigits: 2 })}</p>
      </div>
      <div className="space-y-3">
        {costs.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">Nessuna spesa ancora</p>
          </div>
        )}
        {costs.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.isManual ? 'bg-orange-100' : 'bg-red-100'}`}>
              {c.isManual ? <Receipt size={18} className="text-orange-600" /> : <TrendingDown size={18} className="text-red-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900 truncate">{c.label}</p>
                <p className="text-sm font-bold text-red-600 flex-shrink-0">CHF {c.total.toLocaleString('it-CH', { minimumFractionDigits: 2 })}</p>
              </div>
              <p className="text-xs text-gray-400 mt-1 truncate">{new Date(c.date).toLocaleDateString('it-CH')} · {c.sublabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
