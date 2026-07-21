'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Truck, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Supplier = { id: string; name: string; total: number }

export default function FornitoriPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
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
    load()
  }, [])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Fornitori</h1>
        <p className="text-sm text-gray-500 mt-1">{suppliers.length} fornitori</p>
      </div>
      <div className="space-y-3">
        {suppliers.map(s => (
          <button key={s.id} onClick={() => router.push(`/fornitori/${s.id}`)} className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left">
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
