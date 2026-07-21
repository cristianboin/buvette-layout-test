'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { TrendingDown, TrendingUp, FileText, AlertCircle } from 'lucide-react'

export default function DashboardPage() {
  const [email, setEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email ?? '')
    }
    getUser()
  }, [])

  return (
    <div className="p-4 max-w-2xl mx-auto">

      {/* Benvenuto */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Buongiorno 👋</h1>
        <p className="text-sm text-gray-500 mt-1">{email}</p>
      </div>

      {/* Cards riassunto */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown size={16} className="text-red-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Spese</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">—</p>
          <p className="text-xs text-gray-400 mt-1">questo mese</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Incassi</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">—</p>
          <p className="text-xs text-gray-400 mt-1">questo mese</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Documenti</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">—</p>
          <p className="text-xs text-gray-400 mt-1">caricati</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={16} className="text-orange-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Da confermare</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">—</p>
          <p className="text-xs text-gray-400 mt-1">documenti</p>
        </div>
      </div>

      {/* Azioni rapide */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Azioni rapide</h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => router.push('/registra')}
            className="bg-green-600 text-white rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-green-700 transition-colors"
          >
            <TrendingUp size={20} />
            <span className="text-xs font-medium">Incasso</span>
          </button>
          <button
            onClick={() => router.push('/documenti/nuovo')}
            className="bg-white border border-gray-200 text-gray-700 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <FileText size={20} />
            <span className="text-xs font-medium">Documento</span>
          </button>
          <button
            onClick={() => router.push('/costi/nuovo')}
            className="bg-white border border-gray-200 text-gray-700 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <TrendingDown size={20} />
            <span className="text-xs font-medium">Spesa</span>
          </button>
        </div>
      </div>

      {/* Ultimi movimenti */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Ultimi movimenti</h2>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">Nessun movimento ancora</p>
        </div>
      </div>

    </div>
  )
}
