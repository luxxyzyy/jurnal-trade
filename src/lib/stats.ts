import { getDb } from './db';

export interface DashboardStats {
  totalTransactions: number;
  totalProfit: number;
  totalLoss: number;
  totalPnL: number;
  winRate: number;
  topLossReasons: { label: string; count: number }[];
  performanceByDirection: { direction: string; profit: number; loss: number; winRate: number }[];
  performanceByLot: { lot: number; profit: number; loss: number; count: number }[];
  tradingPlanCompliance: number | null;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();

  const totals = await db.get(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'PROFIT' THEN 1 ELSE 0 END) as profit_count,
      SUM(CASE WHEN status = 'LOSS' THEN 1 ELSE 0 END) as loss_count,
      SUM(COALESCE(manual_pnl, calculated_pnl, 0)) as total_pnl
    FROM transactions
  `);

  const winRate = totals.total > 0 ? (totals.profit_count / totals.total) * 100 : 0;

  const topLossReasons = await db.all(`
    SELECT lr.label, COUNT(*) as count
    FROM transaction_loss_reasons tlr
    JOIN loss_reasons lr ON lr.id = tlr.loss_reason_id
    GROUP BY lr.id, lr.label
    ORDER BY count DESC
    LIMIT 5
  `);

  const directionRows = await db.all(`
    SELECT 
      direction,
      SUM(CASE WHEN status = 'PROFIT' THEN 1 ELSE 0 END) as profit,
      SUM(CASE WHEN status = 'LOSS' THEN 1 ELSE 0 END) as loss,
      COUNT(*) as total
    FROM transactions
    GROUP BY direction
  `);

  const performanceByDirection = directionRows.map(row => ({
    direction: row.direction,
    profit: row.profit,
    loss: row.loss,
    winRate: row.total > 0 ? (row.profit / row.total) * 100 : 0,
  }));

  const performanceByLot = await db.all(`
    SELECT 
      lot,
      SUM(CASE WHEN status = 'PROFIT' THEN 1 ELSE 0 END) as profit,
      SUM(CASE WHEN status = 'LOSS' THEN 1 ELSE 0 END) as loss,
      COUNT(*) as count
    FROM transactions
    GROUP BY lot
    ORDER BY lot
  `);

  const complianceRow = await db.get(`
    SELECT 
      AVG(CASE WHEN followed_plan = 1 THEN 100.0 ELSE 0.0 END) as compliance
    FROM evaluations
    WHERE followed_plan IS NOT NULL
  `);

  const tradingPlanCompliance = complianceRow?.compliance ?? null;

  return {
    totalTransactions: totals.total,
    totalProfit: totals.profit_count,
    totalLoss: totals.loss_count,
    totalPnL: totals.total_pnl,
    winRate,
    topLossReasons,
    performanceByDirection,
    performanceByLot,
    tradingPlanCompliance,
  };
}
