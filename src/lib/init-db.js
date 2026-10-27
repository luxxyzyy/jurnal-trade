import { getDb } from './db.js';

export async function initDB() {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS trading_plans (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      broker TEXT,
      type TEXT,
      initial_capital REAL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cash_flows (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('INITIAL', 'DEPOSIT', 'WITHDRAWAL')),
      amount REAL NOT NULL,
      fee REAL DEFAULT 0,
      date_time DATETIME NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date_time DATETIME NOT NULL,
      instrument TEXT NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('LONG', 'SHORT')),
      lot REAL NOT NULL,
      entry_price REAL NOT NULL,
      exit_price REAL,
      stop_loss REAL,
      take_profit REAL,
      status TEXT NOT NULL CHECK(status IN ('OPEN', 'PROFIT', 'LOSS', 'BREAKEVEN')),
      manual_pnl REAL,
      calculated_pnl REAL,
      strategy_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (strategy_id) REFERENCES trading_plans(id)
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      transaction_id TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('PROFIT', 'LOSS', 'DRAFT')),
      chronology TEXT,
      mistakes TEXT,
      correct_actions TEXT,
      lessons TEXT,
      action_items TEXT,
      followed_plan INTEGER,
      entry_matches_setup INTEGER,
      proper_risk_management INTEGER,
      emotional_decision INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS loss_reasons (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transaction_loss_reasons (
      transaction_id TEXT NOT NULL,
      loss_reason_id TEXT NOT NULL,
      PRIMARY KEY (transaction_id, loss_reason_id),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (loss_reason_id) REFERENCES loss_reasons(id)
    );
  `);

  const reasonsExist = await db.get('SELECT COUNT(*) as count FROM loss_reasons');
  if (reasonsExist.count === 0) {
    const reasons = [
      ['EARLY_ENTRY', 'Entry terlalu cepat'],
      ['LATE_ENTRY', 'Entry terlambat'],
      ['WRONG_TREND', 'Salah membaca trend'],
      ['TIGHT_SL', 'Stop Loss terlalu ketat'],
      ['NO_PLAN', 'Tidak mengikuti trading plan'],
      ['OVERTRADING', 'Overtrading'],
      ['EMOTIONAL', 'Pengaruh emosi'],
      ['NEWS', 'News impact'],
      ['POOR_RM', 'Risk management buruk'],
      ['OTHER', 'Lainnya'],
    ];

    for (const [key, label] of reasons) {
      await db.run('INSERT INTO loss_reasons (id, key, label) VALUES (?, ?, ?)', [`lr_${key}`, key, label]);
    }
  }
}
