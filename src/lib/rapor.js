import { getDb } from './db.js';

export async function getRaporStats(period = 'all') {
  const db = await getDb();
  let dateFilter = '';
  const params = [];

  const now = new Date();
  if (period === 'week') {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    dateFilter = 'AND date_time >= ?';
    params.push(weekStart.toISOString());
  } else if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFilter = 'AND date_time >= ?';
    params.push(monthStart.toISOString());
  } else if (period === '30days') {
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    dateFilter = 'AND date_time >= ?';
    params.push(thirtyDaysAgo.toISOString());
  }

  // Get stats from closed trades (PROFIT, LOSS, BREAKEVEN)
  const stats = await db.get(`
    SELECT 
      COUNT(*) as total_closed,
      SUM(CASE WHEN status = 'PROFIT' THEN 1 ELSE 0 END) as profit_count,
      SUM(CASE WHEN status = 'LOSS' THEN 1 ELSE 0 END) as loss_count,
      SUM(CASE WHEN status = 'PROFIT' THEN COALESCE(manual_pnl, calculated_pnl, 0) ELSE 0 END) as total_profit,
      SUM(CASE WHEN status = 'LOSS' THEN ABS(COALESCE(manual_pnl, calculated_pnl, 0)) ELSE 0 END) as total_loss,
      SUM(CASE WHEN status != 'OPEN' THEN COALESCE(manual_pnl, calculated_pnl, 0) ELSE 0 END) as net_pnl
    FROM transactions
    WHERE status != 'OPEN'
    ${dateFilter}
  `, ...params);

  // Get open trades count
  const openTrades = await db.get(`
    SELECT COUNT(*) as count
    FROM transactions
    WHERE status = 'OPEN'
    ${dateFilter}
  `, ...params);

  // Calculate Win Rate
  const profitCount = stats.profit_count || 0;
  const lossCount = stats.loss_count || 0;
  const totalClosed = profitCount + lossCount;
  const winRate = totalClosed > 0 ? (profitCount / totalClosed) * 100 : 0;

  // Calculate Profit Factor
  const totalProfit = stats.total_profit || 0;
  const totalLoss = stats.total_loss || 0;
  const profitFactor = totalLoss > 0 ? (totalProfit / totalLoss) : (totalProfit > 0 ? Infinity : 0);

  // Calculate Average Win and Loss
  const avgWin = profitCount > 0 ? totalProfit / profitCount : 0;
  const avgLoss = lossCount > 0 ? totalLoss / lossCount : 0;

  // Get evaluated vs unevaluated
  const evaluated = await db.get(`
    SELECT COUNT(*) as count
    FROM evaluations ev
    JOIN transactions t ON ev.transaction_id = t.id
    WHERE t.status IN ('PROFIT', 'LOSS', 'BREAKEVEN')
    ${dateFilter}
  `, ...params);

  const unevaluated = totalClosed - (evaluated.count || 0);

  return {
    winRate,
    totalClosed,
    totalProfit,
    totalLoss,
    netPnL: stats.net_pnl || 0,
    profitFactor: isFinite(profitFactor) ? profitFactor : 0,
    avgWin,
    avgLoss,
    openTrades: openTrades.count || 0,
    evaluated: evaluated.count || 0,
    unevaluated: Math.max(0, unevaluated),
  };
}

export async function getRaporTitles(period = 'all') {
  const db = await getDb();
  let dateFilter = '';
  const params = [];

  const now = new Date();
  if (period === 'week') {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    dateFilter = 'AND t.date_time >= ?';
    params.push(weekStart.toISOString());
  } else if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFilter = 'AND t.date_time >= ?';
    params.push(monthStart.toISOString());
  } else if (period === '30days') {
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    dateFilter = 'AND t.date_time >= ?';
    params.push(thirtyDaysAgo.toISOString());
  }

  // Get loss reasons frequency
  const lossReasons = await db.all(`
    SELECT lr.key as reasonKey, lr.label, COUNT(*) as count
    FROM transaction_loss_reasons tlr
    JOIN loss_reasons lr ON tlr.loss_reason_id = lr.id
    JOIN transactions t ON tlr.transaction_id = t.id
    WHERE t.status = 'LOSS'
    ${dateFilter}
    GROUP BY lr.id, lr.key, lr.label
    ORDER BY count DESC
  `, ...params);

  // Check if we have enough data (minimum 3 evaluated losses)
  const totalEvaluated = lossReasons.reduce((sum, r) => sum + r.count, 0);
  
  if (totalEvaluated < 3) {
    return {
      title: null,
      subtitle: 'Gelar belum terbuka — evaluasi beberapa transaksi lagi',
      reason: null,
      reasonCount: totalEvaluated,
      reasonLabel: null,
      transactions: []
    };
  }

  // Map loss reason keys to titles
  const titleMap = {
    'TIGHT_SL': { title: 'KING SL', subtitle: '"SL menjadi langganan evaluasi."', category: 'Stop Loss' },
    'OVERTRADING': { title: 'KING OVERTRADING', subtitle: '"Terlalu sering trading."', category: 'Overtrading' },
    'EMOTIONAL': { title: 'KING EMOSI', subtitle: '"Keputusan berbasis emosi mendominasi."', category: 'Emosi' },
    'WRONG_TREND': { title: 'KING SALAH BACA TREND', subtitle: '"Membaca trend sering meleset."', category: 'Analisis' },
    'NO_PLAN': { title: 'KING DISIPLIN', subtitle: '"Tidak mengikuti trading plan."', category: 'Disiplin' },
    'EARLY_ENTRY': { title: 'KING FOMO', subtitle: '"Entry terlalu cepat karena FOMO."', category: 'FOMO' },
    'LATE_ENTRY': { title: 'KING LATE ENTRY', subtitle: '"Entry terlambat melewatkan peluang."', category: 'Timing' },
    'POOR_RM': { title: 'KING LOT GEDE', subtitle: '"Risk management buruk, lot terlalu besar."', category: 'Risk Management' },
  };

  // Find the top reason
  const topReason = lossReasons[0];
  const mapping = titleMap[topReason.reasonKey] || { title: `KING ${topReason.reasonKey}`, subtitle: `"${topReason.label}" menjadi pola dominan.`, category: topReason.label };

  return {
    title: mapping.title,
    subtitle: mapping.subtitle,
    reason: `"${topReason.label}" tercatat ${topReason.count} kali.`,
    reasonCount: topReason.count,
    reasonLabel: topReason.label,
    allReasons: lossReasons,
    transactions: await getRelatedTransactions(topReason.reasonKey, period)
  };
}

async function getRelatedTransactions(reasonKey, period) {
  const db = await getDb();
  let dateFilter = '';
  const params = [];

  const now = new Date();
  if (period === 'week') {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    dateFilter = 'AND t.date_time >= ?';
    params.push(weekStart.toISOString());
  } else if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFilter = 'AND t.date_time >= ?';
    params.push(monthStart.toISOString());
  } else if (period === '30days') {
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    dateFilter = 'AND t.date_time >= ?';
    params.push(thirtyDaysAgo.toISOString());
  }

  return await db.all(`
    SELECT t.*, e.chronology, e.mistakes
    FROM transactions t
    JOIN transaction_loss_reasons tlr ON t.id = tlr.transaction_id
    JOIN loss_reasons lr ON tlr.loss_reason_id = lr.id
    LEFT JOIN evaluations e ON t.id = e.transaction_id
    WHERE t.status = 'LOSS' AND lr.key = ?
    ${dateFilter}
    ORDER BY t.date_time DESC
    LIMIT 5
  `, reasonKey, ...params);
}

export async function getTopLossReasons(period = 'all') {
  const db = await getDb();
  let dateFilter = '';
  const params = [];

  const now = new Date();
  if (period === 'week') {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    dateFilter = 'AND t.date_time >= ?';
    params.push(weekStart.toISOString());
  } else if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFilter = 'AND t.date_time >= ?';
    params.push(monthStart.toISOString());
  } else if (period === '30days') {
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    dateFilter = 'AND t.date_time >= ?';
    params.push(thirtyDaysAgo.toISOString());
  }

  return await db.all(`
    SELECT lr.label, lr.key, COUNT(*) as count
    FROM transaction_loss_reasons tlr
    JOIN loss_reasons lr ON tlr.loss_reason_id = lr.id
    JOIN transactions t ON tlr.transaction_id = t.id
    WHERE t.status = 'LOSS'
    ${dateFilter}
    GROUP BY lr.id, lr.label, lr.key
    ORDER BY count DESC
    LIMIT 5
  `, ...params);
}
