import fs from 'fs'

const path = 'app/(app)/documenti/nuovo/page.tsx'
let src = fs.readFileSync(path, 'utf8')

const oldLoop = `    for (let i = 0; i < files.length; i++) {
      const file = files[i].file
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

        if (file.size > 4 * 1024 * 1024) { setState(i, 'senza_ai', 'File troppo grande per la lettura AI'); continue }

        setState(i, 'lettura')`
const newLoop = `    // FASE 1: carica tutti i file (veloce, poi sono al sicuro)
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

        setState(i, 'lettura')`
if (!src.includes(oldLoop)) { console.error('ERRORE: blocco loop non trovato'); process.exit(1) }
src = src.replace(oldLoop, newLoop)

src = src.replace(
  "          }).eq('id', docRow.id)",
  "          }).eq('id', docId)"
)

src = src.replace(
  "  const [finished, setFinished] = useState(false)",
  "  const [finished, setFinished] = useState(false)\n  const [uploaded, setUploaded] = useState(false)"
)
src = src.replace(
  "    setFiles(Array.from(list).map(f => ({ file: f, status: 'in_coda' as const })))\n    setFinished(false)",
  "    setFiles(Array.from(list).map(f => ({ file: f, status: 'in_coda' as const })))\n    setFinished(false)\n    setUploaded(false)"
)
src = src.replace(
  "            {running ? 'Elaborazione in corso... non chiudere la pagina' : ",
  "            {running && uploaded ? 'File salvati! Letture AI in corso... (puoi anche uscire: i non letti restano In attesa)' : running ? 'Caricamento file...' : "
)

fs.writeFileSync(path, src)
console.log('Multiupload in due fasi attivo')
