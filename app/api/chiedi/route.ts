import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { question, history, dati } = await req.json()
    if (!question) return NextResponse.json({ error: 'Domanda mancante' }, { status: 400 })
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Chiave API non configurata' }, { status: 500 })

    const system = "Sei l'assistente dati della buvette dell'FC Ceresio (Svizzera). Rispondi in italiano, in modo chiaro e conciso, basandoti ESCLUSIVAMENTE sui dati JSON forniti qui sotto. Importi in CHF con due decimali. La stagione sportiva va dal 1 agosto al 31 luglio (es. stagione 2025-26 = dal 2025-08-01 al 2026-07-31). Quando utile, suddividi le cifre per evento, stagione o categoria. Se un dato non e nei dati forniti, dillo onestamente senza inventare. DATI: " + JSON.stringify(dati)

    const messages = [
      ...(Array.isArray(history) ? history : []),
      { role: 'user', content: question },
    ]

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system,
        messages,
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      return NextResponse.json({ error: 'Errore API: ' + errText.slice(0, 300) }, { status: 500 })
    }

    const data = await resp.json()
    const text = (data.content || [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')

    return NextResponse.json({ answer: text })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'sconosciuto'
    return NextResponse.json({ error: 'Errore: ' + msg }, { status: 500 })
  }
}
