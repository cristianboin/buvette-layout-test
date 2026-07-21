'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Package } from 'lucide-react'

type Product = { id: string; canonical_name: string; default_unit: string; categories: { name: string } | null }

export default function ProdottiPage() {
  const [products, setProducts] = useState<Product[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('products').select('id, canonical_name, default_unit, categories(name)').order('canonical_name')
      if (data) setProducts(data as Product[])
    }
    load()
  }, [])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Prodotti</h1>
        <p className="text-sm text-gray-500 mt-1">{products.length} prodotti</p>
      </div>
      <div className="space-y-3">
        {products.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">Nessun prodotto ancora</p>
          </div>
        )}
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{p.canonical_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.categories?.name}{p.default_unit ? ` · ${p.default_unit}` : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
