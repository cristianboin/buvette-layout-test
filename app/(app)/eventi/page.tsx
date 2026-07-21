'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Calendar } from 'lucide-react'

type Event = { id: string; name: string; type: string; season: string; status: string }

const typeLabel: Record<string, string> = {
  campionato: 'Campionato',
  torneo: 'Torneo',
  feste: 'Feste',
  generale: 'Generale',
}

export default function EventiPage() {
  const [events, setEvents] = useState<Event[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('events').select('id, name, type, season, status').order('season', { ascending: false })
      if (data) setEvents(data)
    }
    load()
  }, [])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Eventi</h1>
      </div>
      <div className="space-y-3">
        {events.map(ev => (
          <div key={ev.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Calendar size={18} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{ev.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ev.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {ev.status === 'active' ? 'Attivo' : 'Chiuso'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{typeLabel[ev.type]} · {ev.season}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
