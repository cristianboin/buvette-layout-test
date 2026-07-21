'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { TrendingDown } from 'lucide-react'

type Invoice = {
  id: string
  invoice_date: string
  invoice_number: string
  total_incl: number
  status: string
  suppliers: { name: string } | null
  events: { name: string } | null
}

export default function CostiPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_date, invoice_number, total_incl, status, suppliers(name), events(name)')
        .order('invoice_date', { ascending: false })
      if (data) setInvoices(data as Invoice[])
    }
    load()
  }, [])

  const totale = invoices.reduce((sum, i) => sum + (i.total_incl || 0), 0)

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Costi</h1>
        <p className="text-sm text-gray-500 mt-1">Totale: CHF {totale.toFixed(2)}</p>
      </div>
      <div className="space-y-3">
        {invoices.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">Nessuna fattura ancora</p>
          </div>
        )}
        {invoices.map(inv => (
          <div key={inv.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingDown size={18} className="text-red-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{inv.suppliers?.name || 'Fornitore'}</p>
                <p className="text-sm font-bold text-red-600">CHF {inv.total_incl?.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-400">{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('it-CH') : '—'}</p>
                {inv.invoice_number && <span className="text-xs text-gray-400">· #{inv.invoice_number}</span>}
                {inv.events?.name && <span className="text-xs text-gray-400">· {inv.events.name}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
