import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../src/lib/init-db';
import { getDb } from '../src/lib/db';
import { createTransaction, getTransactionById, getAllTransactions, updateTransaction, deleteTransaction } from '../src/lib/transactions';
import { createEvaluation, getEvaluationByTransactionId, updateEvaluation, getTransactionLossReasons } from '../src/lib/evaluations';
import { getDashboardStats } from '../src/lib/stats';

describe('Trade Journal & Evaluation Tests', async () => {
  beforeEach(async () => {
    await initDB();
    const db = await getDb();
    await db.run('DELETE FROM evaluation_history');
    await db.run('DELETE FROM transaction_loss_reasons');
    await db.run('DELETE FROM evaluations');
    await db.run('DELETE FROM transactions');
  });

  it('harus membuat transaksi dan menghitung P&L otomatis', async () => {
    const tx = await createTransaction({
      dateTime: '2026-10-26T10:00',
      instrument: 'XAUUSD',
      direction: 'LONG',
      lot: 0.1,
      entryPrice: 2700,
      exitPrice: 2710,
      status: 'PROFIT',
    });

    expect(tx.id).toBeDefined();
    expect(tx.calculatedPnL).toBe(100000); // (2710 - 2700) * 0.1 * 100000
    expect(tx.status).toBe('PROFIT');
  });

  it('harus menyimpan dan memperbarui evaluasi loss', async () => {
    const tx = await createTransaction({
      dateTime: '2026-10-26T11:00',
      instrument: 'XAUUSD',
      direction: 'SHORT',
      lot: 0.05,
      entryPrice: 2700,
      exitPrice: 2715,
      status: 'LOSS',
    });

    const evalData = await createEvaluation({
      transactionId: tx.id,
      type: 'LOSS',
      chronology: 'Entry saat news impulsif',
      mistakes: 'FOMO tanpa konfirmasi',
      lessons: 'Sabar tunggu retracement',
      actionItems: 'Pasang pending order',
      followedPlan: false,
      lossReasonIds: ['lr_EARLY_ENTRY', 'lr_EMOTIONAL'],
    });

    expect(evalData.transactionId).toBe(tx.id);
    expect(evalData.followedPlan).toBe(false);

    const reasons = await getTransactionLossReasons(tx.id);
    expect(reasons.length).toBe(2);

    const updated = await updateEvaluation(tx.id, {
      lessons: 'Pelajaran direvisi: sabar & disiplin plan',
    });
    expect(updated.lessons).toBe('Pelajaran direvisi: sabar & disiplin plan');
  });

  it('harus menghitung statistik dashboard dengan akurat', async () => {
    const tx1 = await createTransaction({
      dateTime: '2026-10-26T10:00',
      instrument: 'XAUUSD',
      direction: 'LONG',
      lot: 0.1,
      entryPrice: 2000,
      exitPrice: 2010,
      status: 'PROFIT',
      manualPnL: 100,
    });

    const tx2 = await createTransaction({
      dateTime: '2026-10-26T11:00',
      instrument: 'XAUUSD',
      direction: 'LONG',
      lot: 0.1,
      entryPrice: 2010,
      exitPrice: 2000,
      status: 'LOSS',
      manualPnL: -50,
    });

    await createEvaluation({
      transactionId: tx2.id,
      type: 'LOSS',
      followedPlan: false,
      lossReasonIds: ['lr_EMOTIONAL'],
    });

    const stats = await getDashboardStats();
    expect(stats.totalTransactions).toBe(2);
    expect(stats.totalProfit).toBe(1);
    expect(stats.totalLoss).toBe(1);
    expect(stats.winRate).toBe(50);
    expect(stats.totalPnL).toBe(50);
    expect(stats.topLossReasons[0].label).toBe('Pengaruh emosi');
  });
});
