import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Jurnal Trade & Loss Review',
  description: 'Aplikasi Trade Journal dan evaluasi transaksi trading',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-indigo-600">TradeJournal</span>
          </div>
          <nav className="flex space-x-6 text-sm font-medium">
            <a href="/" className="hover:text-indigo-600">Dashboard</a>
            <a href="/transactions" className="hover:text-indigo-600">Riwayat Transaksi</a>
            <a href="/transactions/new" className="hover:text-indigo-600">Tambah Transaksi</a>
          </nav>
        </header>
        <main className="max-w-7xl mx-auto p-6">
          {children}
        </main>
      </body>
    </html>
  )
}
