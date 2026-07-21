'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { FileText, AlertCircle, Check, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Doc = {
  id: string
  file_name: string
  status: string
  uploaded_at: string
}

const statusConfig = {
  pending: { label: 'In elaborazione', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
  to_confirm: { label: 'Da confermare', icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
  confirmed: { label: 'Confermato', icon: Check, color: 'text-green-600', bg: 'bg-green-100' },
  error: { label: 'Errore', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
}

export default function DocumentiPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('documents')
        .select('id, file_name, status, uploaded_at')
        .order('uploaded_at', { ascending: false })
      if (data) setDocs(data as Doc[])
    }
    load()
  }, [])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Documenti</h1>
        <p className="text-sm text-gray-500 mt-1">{docs.length} documenti caricati</p>
      </div>
      <div className="space-y-3">
        {docs.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">Nessun documento ancora</p>
          </div>
        )}
        {docs.map(doc => {
          const st = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.pending
          const Icon = st.icon
          return (
            <div key={doc.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/documenti/${doc.id}`)}>
              <div className={`w-10 h-10 ${st.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={st.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{doc.file_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs ${st.color}`}>{st.label}</span>
                  <span className="text-xs text-gray-400">· {new Date(doc.uploaded_at).toLocaleDateString('it-CH')}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
