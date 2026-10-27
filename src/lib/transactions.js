import { getDb } from './db.js';
import { randomUUID } from 'crypto';

// Contract size untuk instrumen umum (dalam unit dasar)
const CONTRACT_SIZES = {
  'XAUUSD': 100,        // 100 troy ounces per kontrak
  'EURUSD': 100000,     // 100,000 unit mata uang
  'GBPUSD': 100000,
  'USDJPY': 100000,
  'US30': 1,            // US30 (Dow Jones) - per poin
  'NAS100': 1,          // NAS100 - per poin
  'SP500': 1,           // SP500 - per poin
  'BTCUSD': 1,          // Bitcoin - per unit
  'ETHUSD': 1,          // Ethereum - per unit
};

function calculatePnL(input) {
  // Jika manual P&L diberikan, gunakan itu (diasumsikan sudah dengan tanda yang benar)
  if (input.manualPnL !== undefined && input.manualPnL !== null) {
    // Pastikan manual P&L untuk LOSS adalah negatif
    if (input.status === 'LOSS' && input.manualPnL > 0) {
      return -Math.abs(input.manualPnL);
    }
    // Untuk PROFIT, pastikan positif
    if (input.status === 'PROFIT' && input.manualPnL < 0) {
      return Math.abs(input.manualPnL);
    }
    return input.manualPnL;
  }

  // Jika exit price tidak ada, tidak bisa kalkulasi otomatis
  if (!input.exitPrice) {
    return null;
  }

  // Get contract size berdasarkan instrumen
  const contractSize = CONTRACT_SIZES[input.instrument] || 100000;
  
  let pnl;
  if (input.direction === 'LONG') {
    pnl = (input.exitPrice - input.entryPrice) * input.lot * contractSize;
  } else { // SHORT
    pnl = (input.entryPrice - input.exitPrice) * input.lot * contractSize;
  }

  // Untuk status BREAKEVEN, paksa menjadi 0 (atau minus biaya jika ada)
  if (input.status === 'BREAKEVEN') {
    pnl = 0;
  }

  // Untuk OPEN, P&L belum terealisasi
  if (input.status === 'OPEN') {
    return null;
  }

  return pnl;
}

export async function createTransaction(input) {
  const db = await getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  // Hitung P&L yang benar
  const calculatedPnL = calculatePnL(input);

  await db.run(
    `INSERT INTO transactions (
      id, date_time, instrument, direction, lot, entry_price, exit_price,
      stop_loss, take_profit, status, manual_pnl, calculated_pnl, strategy_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.dateTime,
    input.instrument,
    input.direction,
    input.lot,
    input.entryPrice,
    input.exitPrice ?? null,
    input.stopLoss ?? null,
    input.takeProfit ?? null,
    input.status,
    input.manualPnL ?? null,
    calculatedPnL ?? null,
    input.strategyId ?? null,
    now,
    now
  );

  return (await getTransactionById(id));
}

export async function updateTransaction(id, updates) {
  const current = await getTransactionById(id);
  if (!current) throw new Error('Transaction not found');

  const db = await getDb();
  const now = new Date().toISOString();
  
  // Merge current with updates to calculate new P&L if needed
  const merged = { ...current, ...updates };
  const calculatedPnL = calculatePnL(merged);

  await db.run(
    `UPDATE transactions SET 
      date_time = ?, instrument = ?, direction = ?, lot = ?, entry_price = ?, 
      exit_price = ?, stop_loss = ?, take_profit = ?, status = ?, 
      manual_pnl = ?, calculated_pnl = ?, updated_at = ? 
     WHERE id = ?`,
    updates.dateTime ?? current.dateTime,
    updates.instrument ?? current.instrument,
    updates.direction ?? current.direction,
    updates.lot ?? current.lot,
    updates.entryPrice ?? current.entryPrice,
    updates.exitPrice !== undefined ? updates.exitPrice : current.exitPrice,
    updates.stopLoss !== undefined ? updates.stopLoss : current.stopLoss,
    updates.takeProfit !== undefined ? updates.takeProfit : current.takeProfit,
    updates.status ?? current.status,
    updates.manualPnL !== undefined ? updates.manualPnL : current.manualPnL,
    calculatedPnL ?? current.calculatedPnL,
    now,
    id
  );

  return await getTransactionById(id);
}

export async function deleteTransaction(id) {
  const db = await getDb();
  if (!id) throw new Error('Transaction id is required');
  // Hapus evaluasi terkait dulu jika ada (karena foreign key cascade atau manual)
  await db.run('DELETE FROM evaluations WHERE transaction_id = ?', id);
  await db.run('DELETE FROM transaction_loss_reasons WHERE transaction_id = ?', id);
  const result = await db.run('DELETE FROM transactions WHERE id = ?', id);
  return result.changes;
}

export async function getAllTransactions(limit = 100, offset = 0, filters = {}) {
  const db = await getDb();
  let query = `
    SELECT t.*, e.chronology, e.lessons, e.mistakes, e.action_items
    FROM transactions t
    LEFT JOIN evaluations e ON t.id = e.transaction_id
    WHERE 1=1
  `;
  const params = [];

  if (filters.status) {
    query += ' AND t.status = ?';
    params.push(filters.status);
  }

  const { count } = await db.get(`SELECT COUNT(*) as count FROM transactions t`, ...params);

  query += ' ORDER BY t.date_time DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = await db.all(query, ...params);

  return {
    transactions: rows.map(mapRowToTransaction),
    total: count,
  };
}

export async function getTransactionById(id) {
  const db = await getDb();
  const row = await db.get('SELECT * FROM transactions WHERE id = ?', id);
  return row ? mapRowToTransaction(row) : null;
}

export async function getTransactionWithEvaluation(id) {
  const db = await getDb();
  const tx = await getTransactionById(id);
  if (!tx) return null;

  // Get evaluation and loss reasons
  const evalRow = await db.get('SELECT * FROM evaluations WHERE transaction_id = ?', id);
  if (evalRow) {
    tx.evaluation = mapRowToEvaluation(evalRow);
  } else {
    tx.evaluation = null;
  }

  return tx;
}

function mapRowToEvaluation(row) {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    type: row.type,
    chronology: row.chronology,
    mistakes: row.mistakes,
    correctActions: row.correct_actions,
    lessons: row.lessons,
    actionItems: row.action_items,
    followedPlan: row.followed_plan === 1 ? true : row.followed_plan === 0 ? false : null,
    entryMatchesSetup: row.entry_matches_setup === 1 ? true : row.entry_matches_setup === 0 ? false : null,
    properRiskManagement: row.proper_risk_management === 1 ? true : row.proper_risk_management === 0 ? false : null,
    emotionalDecision: row.emotional_decision === 1 ? true : row.emotional_decision === 0 ? false : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToTransaction(row) {
  return {
    id: row.id,
    dateTime: row.date_time,
    instrument: row.instrument,
    direction: row.direction,
    lot: row.lot,
    entryPrice: row.entry_price,
    exitPrice: row.exit_price,
    stopLoss: row.stop_loss,
    takeProfit: row.take_profit,
    status: row.status,
    manualPnL: row.manual_pnl,
    calculatedPnL: row.calculated_pnl,
    strategyId: row.strategy_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    chronology: row.chronology || null,
    lessons: row.lessons || null,
    mistakes: row.mistakes || null,
    actionItems: row.action_items || null,
  };
}
