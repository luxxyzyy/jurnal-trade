'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTransactionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    dateTime: new Date().toISOString().slice(0, 16),
    instrument: 'XAUUSD',
    direction: 'LONG' as 'LONG' | 'SHORT',
    lot: '0.01',
    entryPrice: '',
    exitPrice: '',
    stopLoss: '',
    takeProfit: '',
    status: 'OPEN' as 'OPEN' | 'PROFIT' | 'LOSS' | 'BREAKEVEN',
    manualPnL: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        dateTime: formData.dateTime,
        instrument: formData.instrument,
        direction: formData.direction,
        lot: parseFloat(formData.lot),
        entryPrice: parseFloat(formData.entryPrice),
        exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : undefined,
        stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : undefined,
        takeProfit: formData.takeProfit ? parseFloat(formData.takeProfit) : undefined,
        status: formData.status,
        manualPnL: formData.manualPnL ? parseFloat(formData.manualPnL) : undefined,
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/transactions/${data.id}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Tambah Transaksi</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal & Waktu</label>
            <input
              type="datetime-local"
              value={formData.dateTime}
              onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Instrumen</label>
            <input
              type="text"
              value={formData.instrument}
              onChange={(e) => setFormData({ ...formData, instrument: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="XAUUSD"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Arah Posisi</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, direction: 'LONG' })}
                className={`flex-1 py-2 px-4 rounded-md font-medium ${
                  formData.direction === 'LONG'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                LONG
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, direction: 'SHORT' })}
                className={`flex-1 py-2 px-4 rounded-md font-medium ${
                  formData.direction === 'SHORT'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                SHORT
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lot</label>
            <input
              type="number"
              step="0.01"
              value={formData.lot}
              onChange={(e) => setFormData({ ...formData, lot: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Harga Entry</label>
            <input
              type="number"
              step="0.00001"
              value={formData.entryPrice}
              onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Harga Exit</label>
            <input
              type="number"
              step="0.00001"
              value={formData.exitPrice}
              onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stop Loss</label>
            <input
              type="number"
              step="0.00001"
              value={formData.stopLoss}
              onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Take Profit</label>
            <input
              type="number"
              step="0.00001"
              value={formData.takeProfit}
              onChange={(e) => setFormData({ ...formData, takeProfit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="OPEN">Open</option>
              <option value="PROFIT">Profit</option>
              <option value="LOSS">Loss</option>
              <option value="BREAKEVEN">Breakeven</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Manual P&L (opsional)</label>
            <input
              type="number"
              step="0.01"
              value={formData.manualPnL}
              onChange={(e) => setFormData({ ...formData, manualPnL: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Kosongkan untuk kalkulasi otomatis"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-300"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
