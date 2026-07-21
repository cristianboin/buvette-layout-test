'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Upload, Check, Sparkles } from 'lucide-react'

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.onerror = () => reject(new Error('Lettura file fallita'))
    r.readAsDataURL(file)
  })
}

export default function NuovoDocumentoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<'idle' | 'upload' | 'reading'>('idle')
  const [success, setSuccess] = useState(false)
  const [extracted, setExtracted] = useState<boolean | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setPhase('upload')
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Non autenticato'); setPhase('idle'); return }

    const ext = file.name.split('.').pop()?.toLowerCase()
    const fileType = ext === 'pdf' ? 'pdf' : 'image'
    const fileName = user.id + '/' + Date.now() + '-' + file.name

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file)

    if (uploadError) { setError('Errore upload: ' + uploadError.message); setPhase('idle'); return }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName)

    const { data: docRow, error: dbError } = await supabase.from('documents').insert({
      file_url: publicUrl,
      file_name: file.name,
      file_type: fileType,
      status: 'pending',
      uploaded_by: user.id,
    }).select('id').single()

    if (dbError || !docRow) { setError('Errore salvataggio: ' + (dbError?.message || '')); setPhase('idle'); return }

    // Lettura automatica con AI (se il file non e troppo grande)
    if (file.size <= 4 * 1024 * 1024) {
      setPhase('reading')
      try {
        const base64 = await toBase64(file)
        const mediaType = file.type || (fileType === 'pdf' ? 'application/pdf' : 'image/jpeg')
        const { data: cats } = await supabase.from('categories').select('name, type')
        const expenseCats = (cats || []).filter(c => c.type === 'expense')
        const catNames = (expenseCats.length > 0 ? expenseCats : (cats || [])).map(c => c.name)

        const res = await fetch('/api/estrai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileBase64: base64, mediaType, categories: catNames }),
        })
        const json = await res.json()
        if (res.ok && json.data) {
          const tipoMap: Record<string, string> = { fattura: 'invoice', ricevuta: 'receipt', altro: 'other' }
          const { error: updError } = await supabase.from('documents').update({
            extraction_data: json.data,
            detected_type: tipoMap[json.data.tipo] || 'other',
            status: 'to_confirm',
          }).eq('id', docRow.id)
          setExtracted(!updError)
        } else {
          setExtracted(false)
        }
      } catch {
        setExtracted(false)
      }
    } else {
      setExtracted(false)
    }

    setSuccess(true)
    setTimeout(() => router.push('/documenti'), 2500)
  }

  if (success) return (
    <div className="p-4 flex flex-col items-center justify-center min-h-64 gap-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <Check size={32} className="text-green-600" />
      </div>
      <p className="font-semibold text-gray-900">Documento caricato!</p>
      {extracted === true && (
        <p className="text-sm text-green-600 flex items-center gap-1"><Sparkles size={14} /> Letto automaticamente: in coda da confermare</p>
      )}
      {extracted === false && (
        <p className="text-sm text-gray-500">Lettura automatica non riuscita: resta in attesa</p>
      )}
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
          <div className={'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ' + (file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400')}>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <Upload size={32} className={'mx-auto mb-3 ' + (file ? 'text-green-600' : 'text-gray-400')} />
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
          disabled={!file || phase !== 'idle'}
          className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {phase === 'upload' ? 'Caricamento...' : phase === 'reading' ? 'Lettura automatica in corso...' : 'Carica documento'}
        </button>
      </form>
    </div>
  )
}
