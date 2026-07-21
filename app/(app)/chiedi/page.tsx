'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Send, Sparkles } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string }

const ESEMPI = [
  'Quanto spendiamo in birra?',
  'Quale evento ha incassato di piu?',
  'Quanto abbiamo speso da Prodega?',
  'Qual e il saldo del Torneo 2026?',
]

export default function ChiediPage() {
  const supabase = createClient()
  const [dati, setDati] = useState<object | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadData() {
      const [{ data: items }, { data: incs }, { data: mans }, { data: evs }] = await Promise.all([
        supabase.from('invoice_items').select('quantity, total_incl, categories(name), products(canonical_name, subcategory, product_group), invoices(invoice_date, event_id, suppliers(name))'),
        supabase.from('income_entries').select('date, total, cash_amount, card_amount, other_amount, other_method, avversario, notes, event_id, categories(name)').eq('status', 'confirmed'),
        supabase.from('manual_expenses').select('date, description, amount_incl, event_id, categories(name)').eq('status', 'confirmed'),
        supabase.from('events').select('id, name, type, season'),
      ])

      const evById = new Map((evs || []).map((e: { id: string; name: string }) => [e.id, e.name]))

      const agg = new Map<string, { prodotto: string; categoria: string; sottocategoria: string; gruppo: string | null; fornitore: string; anno: string; evento: string; qta: number; totale: number }>()
      for (const it of (items || []) as any[]) {
        const prodotto = it.products?.canonical_name || 'Sconosciuto'
        const anno = it.invoices?.invoice_date ? String(it.invoices.invoice_date).slice(0, 7) : '?'
        const evento = it.invoices?.event_id ? (evById.get(it.invoices.event_id) || '?') : 'Nessun evento'
        const key = prodotto + '|' + anno + '|' + evento
        const cur = agg.get(key) || {
          prodotto,
          categoria: it.categories?.name || 'Senza categoria',
          sottocategoria: it.products?.subcategory || 'Altro',
          gruppo: it.products?.product_group || null,
          fornitore: it.invoices?.suppliers?.name || '?',
          anno, evento, qta: 0, totale: 0,
        }
        cur.qta += Number(it.quantity) || 0
        cur.totale += Number(it.total_incl) || 0
        agg.set(key, cur)
      }

      setDati({
        regola_stagione: 'dal 1 agosto al 31 luglio',
        eventi: (evs || []).map((e: any) => ({ nome: e.name, tipo: e.type, stagione: e.season })),
        acquisti: Array.from(agg.values()).map(a => ({ ...a, totale: Math.round(a.totale * 100) / 100 })),
        incassi: ((incs || []) as any[]).map(i => ({
          data: i.date,
          evento: i.event_id ? (evById.get(i.event_id) || '?') : 'Nessun evento',
          categoria: i.categories?.name || '?',
          totale: Number(i.total) || 0,
          contanti: Number(i.cash_amount) || 0,
          carta: Number(i.card_amount) || 0,
          altro: Number(i.other_amount) || 0,
          metodo_altro: i.other_method,
          avversario: i.avversario,
          note: i.notes,
        })),
        spese_manuali: ((mans || []) as any[]).map(m => ({
          data: m.date,
          descrizione: m.description,
          categoria: m.categories?.name || '?',
          totale: Number(m.amount_incl) || 0,
          evento: m.event_id ? (evById.get(m.event_id) || '?') : 'Nessun evento',
        })),
      })
    }
    loadData()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, loading])

  async function ask(q: string) {
    const question = q.trim()
    if (!question || loading || !dati) return
    setInput('')
    const history = msgs
    setMsgs(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)
    try {
      const res = await fetch('/api/chiedi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history, dati }),
      })
      const json = await res.json()
      const answer = res.ok && json.answer ? json.answer : ('Errore: ' + (json.error || 'risposta non ricevuta'))
      setMsgs(prev => [...prev, { role: 'assistant', content: answer }])
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Errore di rete, riprova.' }])
    }
    setLoading(false)
  }

  return (
    <div className="p-4 max-w-2xl mx-auto flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles size={20} className="text-purple-600" /> Chiedi
        </h1>
        <p className="text-sm text-gray-500 mt-1">Fai una domanda sui dati della buvette</p>
      </div>

      {msgs.length === 0 && (
        <div className="grid grid-cols-1 gap-2 mb-4">
          {ESEMPI.map(e => (
            <button key={e} onClick={() => ask(e)} disabled={!dati} className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 text-left hover:bg-gray-50 disabled:opacity-50 transition-colors">
              {e}
            </button>
          ))}
          {!dati && <p className="text-xs text-gray-400 text-center">Carico i dati...</p>}
        </div>
      )}

      <div className="flex-1 space-y-3 mb-4">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={m.role === 'user'
              ? 'bg-purple-600 text-white rounded-2xl rounded-br-md px-4 py-3 text-sm max-w-[85%]'
              : 'bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-bl-md px-4 py-3 text-sm max-w-[85%] whitespace-pre-wrap'}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-gray-400">
              Sto calcolando...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') ask(input) }}
          placeholder={dati ? 'Es. quanto spendiamo in birra?' : 'Carico i dati...'}
          disabled={!dati || loading}
          className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-purple-400 disabled:opacity-50"
        />
        <button onClick={() => ask(input)} disabled={!dati || loading || !input.trim()} className="bg-purple-600 text-white rounded-2xl px-4 hover:bg-purple-700 disabled:opacity-50 transition-colors">
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
