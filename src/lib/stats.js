import { getDb } from './db.js';
import { getOrCreateDefaultAccount, getAccountBalance } from './cash-flow.js';

export async function getDashboardStats() {
  const db = await getDb();

  // Aggregate only CLOSED trades (PROFIT, LOSS, BREAKEVEN). OPEN trades are excluded from P&L and win rate.
  const totals = await db.get(`
    SELECT 
      COUNT(*) as total_closed,
      SUM(CASE WHEN status = 'PROFIT' THEN 1 ELSE 0 END) as profit_count,
      SUM(CASE WHEN status = 'LOSS' THEN 1 ELSE 0 END) as loss_count,
      SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open_count,
      SUM(COALESCE(manual_pnl, calculated_pnl, 0)) as total_pnl
    FROM transactions
    WHERE status != 'OPEN'
  `);

  // Get cash flow stats
  const cashFlowStats = await db.get(`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END), 0) as total_deposits,
      COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END), 0) as total_withdrawals
    FROM cash_flows
  `);

  // Get account info
  const account = await getOrCreateDefaultAccount();
  const balance = await getAccountBalance(account.id);
  
  // Calculate net P&L (only from closed trades)
  const netPnL = totals.total_pnl || 0;
  const winRate = totals.total_closed > 0 ? (totals.profit_count / totals.total_closed) * 100 : 0;

  const topLossReasons = await db.all(`
    SELECT lr.label, COUNT(*) as count
    FROM transaction_loss_reasons tlr
    JOIN loss_reasons lr ON lr.id = tlr.loss_reason_id
    GROUP BY lr.id, lr.label
    ORDER BY count DESC
    LIMIT 5
  `);

  return {
    totalClosedTrades: totals.total_closed,
    totalOpenTrades: totals.open_count,
    totalProfit: totals.profit_count,
    totalLoss: totals.loss_count,
    totalPnL: netPnL,
    winRate,
    topLossReasons,
    accountName: account.name,
    initialCapital: account.initial_capital,
    totalDeposits: cashFlowStats.total_deposits,
    totalWithdrawals: cashFlowStats.total_withdrawals,
    balance,
  };
}

export async function getRecentTransactions(limit = 10) {
  const db = await getDb();
  return await db.all(
    `SELECT * FROM transactions ORDER BY date_time DESC LIMIT ?`,
    limit
  );
}
