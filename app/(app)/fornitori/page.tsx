'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Truck } from 'lucide-react'

type Supplier = { id: string; name: string; vat_number: string; address: string }

export default function FornitoriPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('suppliers').select('id, name, vat_number, address').order('name')
      if (data) setSuppliers(data)
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
          <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Truck size={18} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{s.name}</p>
              {s.vat_number && <p className="text-xs text-gray-400 mt-0.5">IVA: {s.vat_number}</p>}
              {s.address && <p className="text-xs text-gray-400">{s.address}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
