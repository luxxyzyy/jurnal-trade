import { getDb } from './db.js';
import { randomUUID } from 'crypto';

export async function getOrCreateDefaultAccount() {
  const db = await getDb();
  let account = await db.get('SELECT * FROM accounts LIMIT 1');
  
  if (!account) {
    const id = randomUUID();
    const now = new Date().toISOString();
    await db.run(
      'INSERT INTO accounts (id, name, type, initial_capital, currency, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      id, 'Default Account', 'Standard', 1000, 'USD', now
    );
    account = await db.get('SELECT * FROM accounts WHERE id = ?', id);
    
    // Add initial capital as a cash flow
    await db.run(
      'INSERT INTO cash_flows (id, account_id, type, amount, date_time, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      randomUUID(), id, 'INITIAL', 1000, now, now
    );
  }
  
  return account;
}

export async function addDeposit(accountId, amount, date = null, notes = '') {
  const db = await getDb();
  const id = randomUUID();
  const now = date || new Date().toISOString();
  
  await db.run(
    'INSERT INTO cash_flows (id, account_id, type, amount, fee, date_time, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    id, accountId, 'DEPOSIT', amount, 0, now, notes, now
  );
  
  return await getCashFlowById(id);
}

export async function addWithdrawal(accountId, amount, date = null, notes = '') {
  const db = await getDb();
  const id = randomUUID();
  const now = date || new Date().toISOString();
  
  await db.run(
    'INSERT INTO cash_flows (id, account_id, type, amount, fee, date_time, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    id, accountId, 'WITHDRAWAL', amount, 0, now, notes, now
  );
  
  return await getCashFlowById(id);
}

export async function updateInitialCapital(accountId, amount) {
  const db = await getDb();
  await db.run('UPDATE accounts SET initial_capital = ? WHERE id = ?', amount, accountId);
  return await getOrCreateDefaultAccount();
}

export async function deleteCashFlow(id) {
  const db = await getDb();
  await db.run('DELETE FROM cash_flows WHERE id = ?', id);
}

export async function getInitialTransactions() {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  return await db.all(
    'SELECT id, account_id, type, amount, fee, date_time, notes FROM cash_flows WHERE date(date_time) = ?',
    today
  );
}

export async function getCashFlowById(id) {
  const db = await getDb();
  return await db.get('SELECT * FROM cash_flows WHERE id = ?', id);
}

export async function getAccountBalance(accountId) {
  const db = await getDb();
  const account = await db.get('SELECT * FROM accounts WHERE id = ?', accountId);
  if (!account) return 0;
  
  const cashFlows = await db.all(
    'SELECT SUM(CASE WHEN type = "INITIAL" OR type = "DEPOSIT" THEN amount ELSE -amount END) as net FROM cash_flows WHERE account_id = ?',
    accountId
  );
  
  return account.initial_capital + (cashFlows[0]?.net || 0);
}

export async function getAllCashFlows() {
  const db = await getDb();
  return await db.all(`
    SELECT cf.*, a.name as account_name 
    FROM cash_flows cf 
    JOIN accounts a ON cf.account_id = a.id 
    ORDER BY cf.date_time DESC
  `);
}
