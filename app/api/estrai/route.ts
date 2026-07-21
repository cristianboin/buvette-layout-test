import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { fileBase64, mediaType, categories } = await req.json()
    if (!fileBase64 || !mediaType) {
      return NextResponse.json({ error: 'File mancante' }, { status: 400 })
    }
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Chiave API non configurata' }, { status: 500 })
    }

    const catList = Array.isArray(categories) && categories.length > 0 ? categories.join(', ') : ''
    const prompt = 'Analizza questo documento (fattura o ricevuta di un fornitore svizzero). Estrai i dati e rispondi SOLO con un oggetto JSON valido, senza alcun testo prima o dopo. Struttura: {"tipo": "fattura" oppure "ricevuta" oppure "altro", "fornitore": testo, "numero_fattura": testo o null, "data": "YYYY-MM-DD" o null, "subtotale_excl": numero o null, "iva": numero o null, "totale_incl": numero o null, "righe": [{"descrizione": testo, "quantita": numero, "unita": testo o null, "prezzo_unitario": numero o null, "totale": numero, "categoria": testo o null}]}. '
      + (catList ? 'Per il campo categoria di ogni riga scegli la piu adatta tra queste, usando il nome esatto: ' + catList + '. ' : '')
      + 'Usa il punto come separatore decimale. Includi tutte le righe del documento. Se un dato non e presente usa null.'

    const content = [
      mediaType === 'application/pdf'
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } }
        : { type: 'image', source: { type: 'base64', media_type: mediaType, data: fileBase64 } },
      { type: 'text', text: prompt },
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
        max_tokens: 4000,
        messages: [{ role: 'user', content }],
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

    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return NextResponse.json({ error: 'Risposta non interpretabile' }, { status: 500 })
    }
    let parsed
    try {
      parsed = JSON.parse(text.slice(start, end + 1))
    } catch {
      return NextResponse.json({ error: 'JSON non valido nella risposta' }, { status: 500 })
    }
    return NextResponse.json({ data: parsed })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'sconosciuto'
    return NextResponse.json({ error: 'Errore: ' + msg }, { status: 500 })
  }
}
