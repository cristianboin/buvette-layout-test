'use client'

import { useRouter } from 'next/navigation'
import { TrendingUp, FileUp, TrendingDown, ChevronRight } from 'lucide-react'

const opzioni = [
  {
    href: '/incassi/nuovo',
    icon: TrendingUp,
    label: 'Registra incasso',
    descrizione: 'Buvette, griglia, entrate campo...',
    color: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  {
    href: '/documenti/nuovo',
    icon: FileUp,
    label: 'Carica documento',
    descrizione: 'Fattura, ricevuta, PDF o foto',
    color: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    href: '/costi/nuovo',
    icon: TrendingDown,
    label: 'Spesa manuale',
    descrizione: 'Spesa senza fattura',
    color: 'bg-red-100',
    iconColor: 'text-red-600',
  },
]

export default function RegistraPage() {
  const router = useRouter()

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Registra</h1>
        <p className="text-sm text-gray-500 mt-1">Cosa vuoi registrare?</p>
      </div>

      <div className="space-y-3">
        {opzioni.map((opzione) => (
          <button
            key={opzione.href}
            onClick={() => router.push(opzione.href)}
            className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
          >
            <div className={`w-12 h-12 ${opzione.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <opzione.icon size={22} className={opzione.iconColor} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">{opzione.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{opzione.descrizione}</p>
            </div>
            <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
