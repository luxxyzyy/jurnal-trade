import { getDb } from './db';
import { Transaction, CreateTransactionInput } from '@/types';
import { randomUUID } from 'crypto';

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const db = await getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const calculatedPnL =
    input.exitPrice && input.manualPnL === undefined
      ? input.direction === 'LONG'
        ? (input.exitPrice - input.entryPrice) * input.lot * 100000
        : (input.entryPrice - input.exitPrice) * input.lot * 100000
      : undefined;

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

  return (await getTransactionById(id))!;
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const db = await getDb();
  const row = await db.get('SELECT * FROM transactions WHERE id = ?', id);
  return row ? mapRowToTransaction(row) : null;
}

export async function getAllTransactions(
  limit = 100,
  offset = 0,
  filters?: {
    status?: string;
    direction?: string;
    instrument?: string;
    strategyId?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ transactions: Transaction[]; total: number }> {
  const db = await getDb();
  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params: any[] = [];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.direction) {
    query += ' AND direction = ?';
    params.push(filters.direction);
  }
  if (filters?.instrument) {
    query += ' AND instrument = ?';
    params.push(filters.instrument);
  }
  if (filters?.strategyId) {
    query += ' AND strategy_id = ?';
    params.push(filters.strategyId);
  }
  if (filters?.startDate) {
    query += ' AND date_time >= ?';
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    query += ' AND date_time <= ?';
    params.push(filters.endDate);
  }

  const { count } = await db.get(`SELECT COUNT(*) as count FROM (${query})`, ...params);

  query += ' ORDER BY date_time DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = await db.all(query, ...params);

  return {
    transactions: rows.map(mapRowToTransaction),
    total: count,
  };
}

export async function updateTransaction(id: string, updates: Partial<CreateTransactionInput>): Promise<Transaction> {
  const current = await getTransactionById(id);
  if (!current) throw new Error('Transaction not found');

  const db = await getDb();
  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbKey} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return current;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await db.run(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, ...values);

  return (await getTransactionById(id))!;
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM transactions WHERE id = ?', id);
}

function mapRowToTransaction(row: any): Transaction {
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
  };
}
