'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { TrendingUp } from 'lucide-react'

type Entry = {
  id: string
  date: string
  total: number
  notes: string
  categories: { name: string } | null
  events: { name: string } | null
}

export default function IncassiPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('income_entries')
        .select('id, date, total, notes, categories(name), events(name)')
        .order('date', { ascending: false })
if (data) setEntries(data as unknown as Entry[])
    }
    load()
  }, [])

  const totale = entries.reduce((sum, e) => sum + (e.total || 0), 0)

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Incassi</h1>
        <p className="text-sm text-gray-500 mt-1">Totale: CHF {totale.toFixed(2)}</p>
      </div>
      <div className="space-y-3">
        {entries.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">Nessun incasso ancora</p>
          </div>
        )}
        {entries.map(entry => (
          <div key={entry.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp size={18} className="text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{entry.categories?.name || 'Incasso'}</p>
                <p className="text-sm font-bold text-green-600">CHF {entry.total?.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString('it-CH')}</p>
                {entry.events?.name && <span className="text-xs text-gray-400">· {entry.events.name}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
