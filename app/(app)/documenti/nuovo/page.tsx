'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Upload, Check } from 'lucide-react'

export default function NuovoDocumentoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Non autenticato'); setLoading(false); return }

    const ext = file.name.split('.').pop()?.toLowerCase()
    const fileType = ext === 'pdf' ? 'pdf' : 'image'
    const fileName = `${user.id}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file)

    if (uploadError) { setError('Errore upload: ' + uploadError.message); setLoading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName)

    const { error: dbError } = await supabase.from('documents').insert({
      file_url: publicUrl,
      file_name: file.name,
      file_type: fileType,
      status: 'pending',
      uploaded_by: user.id,
    })

    if (dbError) { setError('Errore salvataggio: ' + dbError.message); setLoading(false); return }

    setSuccess(true)
    setTimeout(() => router.push('/documenti'), 1500)
  }

  if (success) return (
    <div className="p-4 flex flex-col items-center justify-center min-h-64 gap-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <Check size={32} className="text-green-600" />
      </div>
      <p className="font-semibold text-gray-900">Documento caricato!</p>
      <p className="text-sm text-gray-500">In elaborazione...</p>
    </div>
  )

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Carica documento</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <div className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <Upload size={32} className={`mx-auto mb-3 ${file ? 'text-green-600' : 'text-gray-400'}`} />
            {file ? (
              <div>
                <p className="font-semibold text-green-700 text-sm">{file.name}</p>
                <p className="text-xs text-green-600 mt-1">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-gray-700 text-sm">Tocca per selezionare</p>
                <p className="text-xs text-gray-400 mt-1">PDF o immagine (JPG, PNG)</p>
              </div>
            )}
          </div>
        </label>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
        )}

        <button
          type="submit"
          disabled={!file || loading}
          className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Caricamento...' : 'Carica documento'}
        </button>
      </form>
    </div>
  )
}
