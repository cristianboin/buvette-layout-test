'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { TrendingDown, TrendingUp, BarChart2 } from 'lucide-react'

export default function ReportPage() {
  const [totaleSpese, setTotaleSpese] = useState(0)
  const [totaleIncassi, setTotaleIncassi] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: inv }, { data: inc }] = await Promise.all([
        supabase.from('invoices').select('total_incl').eq('status', 'confirmed'),
        supabase.from('income_entries').select('total').eq('status', 'confirmed'),
      ])
      if (inv) setTotaleSpese(inv.reduce((s, i) => s + (i.total_incl || 0), 0))
      if (inc) setTotaleIncassi(inc.reduce((s, i) => s + (i.total || 0), 0))
    }
    load()
  }, [])

  const saldo = totaleIncassi - totaleSpese

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Report</h1>
      </div>
      <div className="space-y-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <TrendingUp size={18} className="text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Totale incassi</p>
            <p className="text-xl font-bold text-green-600">CHF {totaleIncassi.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <TrendingDown size={18} className="text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Totale spese</p>
            <p className="text-xl font-bold text-red-600">CHF {totaleSpese.toFixed(2)}</p>
          </div>
        </div>
        <div className={`rounded-2xl border p-4 flex items-center gap-4 ${saldo >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${saldo >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            <BarChart2 size={18} className={saldo >= 0 ? 'text-green-600' : 'text-red-600'} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Saldo</p>
            <p className={`text-xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>CHF {saldo.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
