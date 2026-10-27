'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-6 text-center">Memuat dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Ringkasan performa trading Anda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Transaksi</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTransactions}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Win Rate</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.winRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Profit</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalProfit}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Loss</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{stats.totalLoss}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Total P&L</h2>
        <p className={`text-4xl font-bold ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ${stats.totalPnL.toFixed(2)}
        </p>
      </div>

      {stats.topLossReasons.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Penyebab Loss Paling Sering</h2>
          <div className="space-y-3">
            {stats.topLossReasons.map((reason: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-gray-700">{reason.label}</span>
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  {reason.count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.performanceByDirection.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Performa Berdasarkan Arah</h2>
          <div className="space-y-3">
            {stats.performanceByDirection.map((perf: any, idx: number) => (
              <div key={idx} className="border-b pb-3 last:border-0">
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-semibold ${perf.direction === 'LONG' ? 'text-green-600' : 'text-red-600'}`}>
                    {perf.direction}
                  </span>
                  <span className="text-gray-600 text-sm">Win Rate: {perf.winRate.toFixed(1)}%</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">Profit: {perf.profit}</span>
                  <span className="text-red-600">Loss: {perf.loss}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.tradingPlanCompliance !== null && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Kepatuhan Trading Plan</h2>
          <p className="text-3xl font-bold text-indigo-600">{stats.tradingPlanCompliance.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 mt-1">Berdasarkan evaluasi yang telah diisi</p>
        </div>
      )}

      {stats.performanceByLot.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Performa Berdasarkan Lot</h2>
          <p className="text-xs text-gray-500 mb-3">Jumlah sampel ditampilkan untuk menghindari kesimpulan yang menyesatkan</p>
          <div className="space-y-2">
            {stats.performanceByLot.map((perf: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                <span className="font-medium">Lot {perf.lot}</span>
                <div className="flex gap-3">
                  <span className="text-green-600">P: {perf.profit}</span>
                  <span className="text-red-600">L: {perf.loss}</span>
                  <span className="text-gray-500">({perf.count} sampel)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
