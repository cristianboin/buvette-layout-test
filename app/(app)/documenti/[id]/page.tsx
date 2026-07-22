'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Check, FileText, Sparkles, Trash2 } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'

type Cat = { id: string; name: string }
type Ev = { id: string; name: string }
type Riga = { descrizione: string; quantita: number; unita: string | null; prezzo_unitario: number | null; totale: number; categoria: string | null }

export default function DocumentoDettaglioPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const docId = params.id as string

  const [fileName, setFileName] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [status, setStatus] = useState('')
  const [cats, setCats] = useState<Cat[]>([])
  const [events, setEvents] = useState<Ev[]>([])
  const [fornitore, setFornitore] = useState('')
  const [numero, setNumero] = useState('')
  const [dataFat, setDataFat] = useState('')
  const [subtot, setSubtot] = useState('')
  const [iva, setIva] = useState('')
  const [totale, setTotale] = useState('')
  const [eventId, setEventId] = useState('')
  const [righe, setRighe] = useState<Riga[]>([])
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: doc }, { data: rc }, { data: re }] = await Promise.all([
        supabase.from('documents').select('file_name, file_url, status, extraction_data').eq('id', docId).single(),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('events').select('id, name').in('status', ['active', 'closed', 'planned']).order('name'),
      ])
      if (rc) setCats(rc)
      if (re) setEvents(re)
      if (doc) {
        setFileName(doc.file_name || '')
        setFileUrl(doc.file_url || '')
        setStatus(doc.status || '')
        const ex = doc.extraction_data as {
          fornitore?: string; numero_fattura?: string; data?: string;
          subtotale_excl?: number; iva?: number; totale_incl?: number; righe?: Riga[]
        } | null
        if (ex) {
          setFornitore(ex.fornitore || '')
          setNumero(ex.numero_fattura || '')
          setDataFat(ex.data || '')
          setSubtot(ex.subtotale_excl != null ? String(ex.subtotale_excl) : '')
          setIva(ex.iva != null ? String(ex.iva) : '')
          setTotale(ex.totale_incl != null ? String(ex.totale_incl) : '')
          setRighe(Array.isArray(ex.righe) ? ex.righe : [])
        }
      }
    }
    load()
  }, [docId])

  function setRiga(i: number, field: keyof Riga, value: string) {
    setRighe(prev => prev.map((r, idx) => {
      if (idx !== i) return r
      if (field === 'quantita' || field === 'totale') return { ...r, [field]: parseFloat(value) || 0 }
      return { ...r, [field]: value }
    }))
  }

  const catIdByName = (nm: string | null) => cats.find(c => c.name === nm)?.id || null
  const sommaRighe = righe.reduce((s, r) => s + (Number(r.totale) || 0), 0)

  async function handleExtract() {
    setError('')
    setSaving(true)
    try {
      const resp = await fetch(fileUrl)
      const blob = await resp.blob()
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result).split(',')[1])
        r.onerror = () => reject(new Error('lettura file fallita'))
        r.readAsDataURL(blob)
      })
      const ext = fileName.split('.').pop()?.toLowerCase()
      const mediaType = ext === 'pdf' ? 'application/pdf' : (blob.type || 'image/jpeg')
      const { data: cats2 } = await supabase.from('categories').select('name, type')
      const expenseCats = (cats2 || []).filter(c => c.type === 'expense')
      const catNames = (expenseCats.length > 0 ? expenseCats : (cats2 || [])).map(c => c.name)
      const res = await fetch('/api/estrai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, mediaType, categories: catNames }),
      })
      const json = await res.json()
      if (!res.ok || !json.data) throw new Error(json.error || 'lettura non riuscita')
      const tipoMap: Record<string, string> = { fattura: 'invoice', ricevuta: 'receipt', altro: 'other' }
      const { error: eUpd } = await supabase.from('documents').update({
        extraction_data: json.data,
        detected_type: tipoMap[json.data.tipo] || 'other',
        status: 'to_confirm',
      }).eq('id', docId)
      if (eUpd) throw new Error(eUpd.message)
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore lettura AI')
    }
    setSaving(false)
  }

  async function handleDelete() {
    const msg = status === 'confirmed'
      ? 'Documento confermato: la fattura creata restera nel database, verra eliminato solo il file. Continuare?'
      : 'Eliminare questo documento? L\'operazione non si puo annullare.'
    if (!window.confirm(msg)) return
    setSaving(true)
    const marker = '/documents/'
    const idx = fileUrl.indexOf(marker)
    if (idx !== -1) {
      const storagePath = decodeURIComponent(fileUrl.slice(idx + marker.length))
      await supabase.storage.from('documents').remove([storagePath])
    }
    const { error: eDel } = await supabase.from('documents').delete().eq('id', docId)
    setSaving(false)
    if (eDel) { setError('Impossibile eliminare: ' + eDel.message); return }
    router.push('/documenti')
  }

  async function handleConfirm() {
    setError('')
    if (!fornitore.trim()) { setError('Manca il fornitore'); return }
    if (!dataFat) { setError('Manca la data'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Fornitore: trova o crea
      const { data: supFound } = await supabase.from('suppliers').select('id').ilike('name', fornitore.trim()).limit(1)
      let supplierId = supFound && supFound[0]?.id
      if (!supplierId) {
        const { data: supNew, error: e1 } = await supabase.from('suppliers').insert({ name: fornitore.trim() }).select('id').single()
        if (e1 || !supNew) throw new Error('creazione fornitore: ' + (e1?.message || ''))
        supplierId = supNew.id
      }

      // 2. Fattura
      const { data: inv, error: e2 } = await supabase.from('invoices').insert({
        document_id: docId,
        supplier_id: supplierId,
        event_id: eventId || null,
        invoice_number: numero || null,
        invoice_date: dataFat,
        subtotal_excl: subtot ? parseFloat(subtot) : null,
        vat_amount: iva ? parseFloat(iva) : null,
        total_incl: totale ? parseFloat(totale) : sommaRighe,
        status: 'confirmed',
        created_by: user?.id,
        confirmed_by: user?.id,
        confirmed_at: new Date().toISOString(),
      }).select('id').single()
      if (e2 || !inv) throw new Error('creazione fattura: ' + (e2?.message || ''))

      // 3. Prodotti: trova o crea, poi righe
      const { data: prods } = await supabase.from('products').select('id, canonical_name')
      const prodMap = new Map((prods || []).map(p => [p.canonical_name.toLowerCase(), p.id]))

      const rows = []
      for (let i = 0; i < righe.length; i++) {
        const r = righe[i]
        const catId = catIdByName(r.categoria)
        let prodId = prodMap.get(r.descrizione.toLowerCase()) || null
        if (!prodId && r.descrizione.trim()) {
          const { data: pNew } = await supabase.from('products').insert({
            canonical_name: r.descrizione.trim(),
            category_id: catId,
            default_unit: r.unita || null,
          }).select('id').single()
          if (pNew) { prodId = pNew.id; prodMap.set(r.descrizione.toLowerCase(), pNew.id) }
        }
        rows.push({
          invoice_id: inv.id,
          line_number: i + 1,
          original_desc: r.descrizione,
          product_id: prodId,
          quantity: r.quantita || 0,
          unit: r.unita || null,
          unit_price: r.prezzo_unitario ?? null,
          total_incl: r.totale || 0,
          category_id: catId,
        })
      }
      if (rows.length > 0) {
        const { error: e3 } = await supabase.from('invoice_items').insert(rows)
        if (e3) throw new Error('righe fattura: ' + e3.message)
      }

      // 4. Documento confermato
      await supabase.from('documents').update({ status: 'confirmed' }).eq('id', docId)

      setDone(true)
      setTimeout(() => router.push('/costi'), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    }
    setSaving(false)
  }

  if (done) return (
    <div className="p-4 flex flex-col items-center justify-center min-h-64 gap-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <Check size={32} className="text-green-600" />
      </div>
      <p className="font-semibold text-gray-900">Fattura registrata!</p>
    </div>
  )

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{fileName}</h1>
          {status === 'to_confirm' && <p className="text-xs text-purple-600 flex items-center gap-1"><Sparkles size={12} /> Letto dall'AI: controlla e conferma</p>}
          {status === 'confirmed' && <p className="text-xs text-green-600">Confermato</p>}
        </div>
        {fileUrl && (
          <a href={fileUrl} target="_blank" rel="noreferrer" className="p-2 rounded-xl hover:bg-gray-100">
            <FileText size={18} className="text-blue-600" />
          </a>
        )}
        {status === 'pending' && (
          <button onClick={handleExtract} disabled={saving} className="flex items-center gap-1 bg-purple-600 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors">
            <Sparkles size={14} /> {saving ? 'Leggo...' : 'Leggi con AI'}
          </button>
        )}
        <button onClick={handleDelete} disabled={saving} className="p-2 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors" title="Elimina documento">
          <Trash2 size={18} className="text-red-500" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fornitore *</label>
          <input type="text" value={fornitore} onChange={e => setFornitore(e.target.value)} className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Numero</label>
            <input type="text" value={numero} onChange={e => setNumero(e.target.value)} className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Data *</label>
            <input type="date" value={dataFat} onChange={e => setDataFat(e.target.value)} className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Netto</label>
            <input type="number" step="0.01" value={subtot} onChange={e => setSubtot(e.target.value)} className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">IVA</label>
            <input type="number" step="0.01" value={iva} onChange={e => setIva(e.target.value)} className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Totale</label>
            <input type="number" step="0.01" value={totale} onChange={e => setTotale(e.target.value)} className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Evento</label>
          <select value={eventId} onChange={e => setEventId(e.target.value)} className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none">
            <option value="">Nessun evento</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Righe ({righe.length}) · somma CHF {sommaRighe.toFixed(2)}</h2>
        <div className="space-y-3">
          {righe.map((r, i) => (
            <div key={i} className="border-b border-gray-100 pb-3 last:border-0">
              <input type="text" value={r.descrizione} onChange={e => setRiga(i, 'descrizione', e.target.value)} className="w-full text-sm font-medium text-gray-900 focus:outline-none mb-1" />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" step="0.001" value={r.quantita} onChange={e => setRiga(i, 'quantita', e.target.value)} className="text-xs text-gray-700 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" placeholder="Qta" />
                <input type="number" step="0.01" value={r.totale} onChange={e => setRiga(i, 'totale', e.target.value)} className="text-xs text-gray-700 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" placeholder="Totale" />
                <select value={r.categoria || ''} onChange={e => setRiga(i, 'categoria', e.target.value)} className="text-xs text-gray-700 border border-gray-200 rounded-lg px-1 py-1 bg-white focus:outline-none">
                  <option value="">Categoria...</option>
                  {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
          ))}
          {righe.length === 0 && <p className="text-sm text-gray-400">Nessuna riga estratta</p>}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl mb-4">{error}</p>}

      {status !== 'confirmed' && (
        <button onClick={handleConfirm} disabled={saving} className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors">
          {saving ? 'Registrazione...' : 'Conferma e crea fattura'}
        </button>
      )}
    </div>
  )
}
