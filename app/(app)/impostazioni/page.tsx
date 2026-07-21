'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { User, Shield } from 'lucide-react'

type Profile = { full_name: string; role: string; email: string }

export default function ImpostazioniPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
      if (data) setProfile({ ...data, email: user.email ?? '' })
    }
    load()
  }, [])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Impostazioni</h1>
      </div>
      <div className="space-y-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <User size={18} className="text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{profile?.full_name || '—'}</p>
            <p className="text-xs text-gray-400">{profile?.email}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Ruolo</p>
            <p className="text-xs text-gray-400">{profile?.role === 'admin' ? 'Amministratore' : 'Membro'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
