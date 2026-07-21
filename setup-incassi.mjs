import fs from 'fs'

const path = 'app/(app)/incassi/nuovo/page.tsx'
let src = fs.readFileSync(path, 'utf8')

const anchor = "const isCampionato = selectedEvent?.type === 'campionato'"
if (!src.includes(anchor)) {
  console.error('ERRORE: punto di aggancio non trovato')
  process.exit(1)
}
src = src.replace(anchor, anchor + `

  const visibleCategories = isCampionato
    ? categories.filter(c => ['Buvette', 'Griglia / Cucina', 'Entrate campo'].includes(c.name))
    : categories`)

if (!src.includes('{categories.map(cat => (')) {
  console.error('ERRORE: blocco categorie non trovato')
  process.exit(1)
}
src = src.replace('{categories.map(cat => (', '{visibleCategories.map(cat => (')

fs.writeFileSync(path, src)
console.log('Fix applicato:', path)
