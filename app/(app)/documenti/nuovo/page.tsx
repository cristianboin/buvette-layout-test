'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Upload, Check, Sparkles, Clock, CircleAlert as AlertCircle } from 'lucide-react'

type FileState = {
  file: File
  status: 'in_coda' | 'caricamento' | 'lettura' | 'fatto' | 'senza_ai' | 'errore'
  message?: string
}

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
  const [files, setFiles] = useState<FileState[]>([])
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [uploaded, setUploaded] = useState(false)

  function onPick(list: FileList | null) {
    if (!list) return
    setFiles(Array.from(list).map(f => ({ file: f, status: 'in_coda' as const })))
    setFinished(false)
    setUploaded(false)
  }

  function setState(i: number, status: FileState['status'], message?: string) {
    setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status, message } : f))
  }

  async function processAll(e: React.FormEvent) {
    e.preventDefault()
    if (files.length === 0 || running) return
    setRunning(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setRunning(false); return }

    const { data: cats } = await supabase.from('categories').select('name, type')
    const expenseCats = (cats || []).filter(c => c.type === 'expense')
    const catNames = (expenseCats.length > 0 ? expenseCats : (cats || [])).map(c => c.name)

    // FASE 1: carica tutti i file (veloce, poi sono al sicuro)
    const docIds: (string | null)[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i].file
      docIds.push(null)
      try {
        setState(i, 'caricamento')
        const ext = file.name.split('.').pop()?.toLowerCase()
        const fileType = ext === 'pdf' ? 'pdf' : 'image'
        const fileName = user.id + '/' + Date.now() + '-' + file.name

        const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file)
        if (uploadError) { setState(i, 'errore', uploadError.message); continue }

        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName)
        const { data: docRow, error: dbError } = await supabase.from('documents').insert({
          file_url: publicUrl,
          file_name: file.name,
          file_type: fileType,
          status: 'pending',
          uploaded_by: user.id,
        }).select('id').single()
        if (dbError || !docRow) { setState(i, 'errore', dbError?.message || 'salvataggio fallito'); continue }
        docIds[i] = docRow.id
        setState(i, 'in_coda', 'Salvato, in attesa di lettura')
      } catch (err) {
        setState(i, 'errore', err instanceof Error ? err.message : 'errore imprevisto')
      }
    }
    setUploaded(true)

    // FASE 2: letture AI in sequenza
    for (let i = 0; i < files.length; i++) {
      const file = files[i].file
      const docId = docIds[i]
      if (!docId) continue
      try {
        if (file.size > 4 * 1024 * 1024) { setState(i, 'senza_ai', 'File troppo grande per la lettura AI'); continue }

        setState(i, 'lettura')
        const base64 = await toBase64(file)
        const ext = file.name.split('.').pop()?.toLowerCase()
        const mediaType = file.type || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg')
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
          }).eq('id', docId)
          if (updError) setState(i, 'senza_ai', 'Letto ma non salvato: ' + updError.message)
          else setState(i, 'fatto')
        } else {
          setState(i, 'senza_ai', json.error || 'Lettura AI non riuscita')
        }
      } catch (err) {
        setState(i, 'errore', err instanceof Error ? err.message : 'errore imprevisto')
      }
    }
    setRunning(false)
    setFinished(true)
  }

  const icons = {
    in_coda: { icon: Clock, cls: 'text-gray-400' },
    caricamento: { icon: Upload, cls: 'text-blue-500' },
    lettura: { icon: Sparkles, cls: 'text-purple-500' },
    fatto: { icon: Check, cls: 'text-green-600' },
    senza_ai: { icon: AlertCircle, cls: 'text-orange-500' },
    errore: { icon: AlertCircle, cls: 'text-red-500' },
  }
  const labels = {
    in_coda: 'In coda',
    caricamento: 'Caricamento...',
    lettura: 'Lettura AI in corso...',
    fatto: 'Letto: da confermare',
    senza_ai: 'Caricato senza lettura',
    errore: 'Errore',
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Carica documenti</h1>
      </div>

      <form onSubmit={processAll} className="space-y-4">
        <label className="block">
          <div className={'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ' + (files.length > 0 ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400')}>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={e => onPick(e.target.files)}
              className="hidden"
              disabled={running}
            />
            <Upload size={32} className={'mx-auto mb-3 ' + (files.length > 0 ? 'text-green-600' : 'text-gray-400')} />
            {files.length > 0 ? (
              <p className="font-semibold text-green-700 text-sm">{files.length} file selezionati</p>
            ) : (
              <div>
                <p className="font-semibold text-gray-700 text-sm">Tocca per selezionare uno o piu file</p>
                <p className="text-xs text-gray-400 mt-1">PDF o immagini (JPG, PNG)</p>
              </div>
            )}
          </div>
        </label>

        {files.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {files.map((f, i) => {
              const ic = icons[f.status]
              const Icon = ic.icon
              return (
                <div key={i} className="p-3 flex items-center gap-3">
                  <Icon size={18} className={ic.cls + (f.status === 'lettura' ? ' animate-pulse' : '')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{f.file.name}</p>
                    <p className={'text-xs ' + ic.cls}>{labels[f.status]}{f.message ? ' · ' + f.message : ''}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{(f.file.size / 1024).toFixed(0)} KB</span>
                </div>
              )
            })}
          </div>
        )}

        {!finished ? (
          <button
            type="submit"
            disabled={files.length === 0 || running}
            className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {running && uploaded ? 'File salvati! Letture AI in corso... (puoi anche uscire: i non letti restano In attesa)' : running ? 'Caricamento file...' : 'Carica ' + (files.length || '') + (files.length === 1 ? ' documento' : ' documenti')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push('/documenti')}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-semibold text-sm hover:bg-gray-800 transition-colors"
          >
            Vai ai documenti da confermare
          </button>
        )}
      </form>
    </div>
  )
}
