import fs from 'fs'

const path = 'app/(app)/documenti/[id]/page.tsx'
let src = fs.readFileSync(path, 'utf8')

const anchorFn = '  async function handleDelete() {'
if (!src.includes(anchorFn)) { console.error('ERRORE: aggancio funzione non trovato'); process.exit(1) }
src = src.replace(anchorFn, `  async function handleExtract() {
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

` + anchorFn)

const anchorBtn = `        <button onClick={handleDelete} disabled={saving}`
if (!src.includes(anchorBtn)) { console.error('ERRORE: aggancio pulsante non trovato'); process.exit(1) }
src = src.replace(anchorBtn, `        {status === 'pending' && (
          <button onClick={handleExtract} disabled={saving} className="flex items-center gap-1 bg-purple-600 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors">
            <Sparkles size={14} /> {saving ? 'Leggo...' : 'Leggi con AI'}
          </button>
        )}
` + anchorBtn)

fs.writeFileSync(path, src)
console.log('Pulsante Leggi con AI nel dettaglio documento')
