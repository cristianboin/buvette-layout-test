import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Buvette FC Ceresio',
  description: 'Gestione buvette FC Ceresio',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
