import { createServer } from 'http';
import { parse } from 'url';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './src/lib/init-db.js';
import { getDashboardStats, getRecentTransactions } from './src/lib/stats.js';
import { getAllTransactions, createTransaction, updateTransaction, deleteTransaction, getTransactionWithEvaluation } from './src/lib/transactions.js';
import { getLossReasons, createEvaluation, updateEvaluation, getEvaluationByTransactionId, getTransactionLossReasons } from './src/lib/evaluations.js';
import { getRaporStats, getRaporTitles, getTopLossReasons } from './src/lib/rapor.js';
import { getEconomicCalendar } from './src/lib/calendar.js';
import { 
  getOrCreateDefaultAccount, 
  addDeposit, 
  addWithdrawal, 
  updateInitialCapital, 
  deleteCashFlow,
  getAllCashFlows 
} from './src/lib/cash-flow.js';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = 3000;

async function startServer() {
  await initDB();
  
  createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname, query } = parsedUrl;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      if (pathname === '/' || pathname === '/index.html') {
        const html = readFileSync(join(__dirname, 'public', 'index.html'), 'utf-8');
        res.setHeader('Content-Type', 'text/html');
        res.end(html);
      } else if (pathname === '/api/dashboard' && req.method === 'GET') {
        const stats = await getDashboardStats();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(stats));
      } else if (pathname === '/api/transactions' && req.method === 'GET') {
        const result = await getAllTransactions();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
      } else if (pathname === '/api/transactions' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const data = JSON.parse(body);
          const tx = await createTransaction(data);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 201;
          res.end(JSON.stringify(tx));
        });
      } else if (pathname.startsWith('/api/transactions/') && req.method === 'PUT') {
        const id = pathname.split('/').pop();
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const data = JSON.parse(body);
          const tx = await import('./src/lib/transactions.js').then(m => m.updateTransaction(id, data));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(tx));
        });
      } else if (pathname.startsWith('/api/transactions/') && req.method === 'DELETE') {
        const id = pathname.split('/').pop();
        if (!id) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Transaction id is required' }));
        } else {
          const changes = await deleteTransaction(id);
          res.statusCode = changes ? 200 : 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(changes ? { success: true } : { error: 'Transaction not found' }));
        }
      } else if (pathname === '/api/calendar' && req.method === 'GET') {
        const events = await getEconomicCalendar();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(events || []));
      } else if (pathname === '/api/loss-reasons' && req.method === 'GET') {
        const reasons = await getLossReasons();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(reasons));
      } else if (pathname === '/api/evaluations' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const data = JSON.parse(body);
          const eval_result = await createEvaluation(data);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 201;
          res.end(JSON.stringify(eval_result));
        });
      } else if (pathname.startsWith('/api/evaluations/') && req.method === 'PUT') {
        const txId = pathname.split('/').pop();
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const data = JSON.parse(body);
          const eval_result = await updateEvaluation(txId, data);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(eval_result));
        });
      } else if (pathname.startsWith('/api/evaluations/') && req.method === 'GET') {
        const txId = pathname.split('/').pop();
        const evaluation = await getEvaluationByTransactionId(txId);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(evaluation));
      } else if (pathname.startsWith('/api/transactions/') && req.method === 'GET') {
        const txId = pathname.split('/').pop();
        const tx = await getTransactionWithEvaluation(txId);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(tx || { error: 'Transaction not found' }));
      } else if (pathname === '/api/rapor/stats' && req.method === 'GET') {
        const period = query.period || 'all';
        const stats = await getRaporStats(period);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(stats));
      } else if (pathname === '/api/rapor/titles' && req.method === 'GET') {
        const period = query.period || 'all';
        const titles = await getRaporTitles(period);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(titles));
      } else if (pathname === '/api/rapor/loss-reasons' && req.method === 'GET') {
        const period = query.period || 'all';
        const reasons = await getTopLossReasons(period);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(reasons));
      } else if (pathname === '/api/cash-flows' && req.method === 'GET') {
        const flows = await getAllCashFlows();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(flows));
      } else if (pathname === '/api/cash-flows' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const data = JSON.parse(body);
          const account = await getOrCreateDefaultAccount();
          let result;
          
          if (data.type === 'DEPOSIT') {
            result = await addDeposit(account.id, data.amount, data.date, data.notes);
          } else if (data.type === 'WITHDRAWAL') {
            result = await addWithdrawal(account.id, data.amount, data.date, data.notes);
          } else if (data.type === 'INITIAL') {
            result = await updateInitialCapital(account.id, data.amount);
          }
          
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 201;
          res.end(JSON.stringify(result));
        });
      } else if (pathname.startsWith('/api/cash-flows/') && req.method === 'DELETE') {
        const id = pathname.split('/').pop();
        await deleteCashFlow(id);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } else if (pathname === '/api/export' && req.method === 'GET') {
        const buffer = await generateExcelExport();
        const filename = `Trade_Journal_${new Date().toISOString().slice(0,10)}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.end(buffer);
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    } catch (err) {
      console.error('Server error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message }));
    }
  }).listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

async function generateExcelExport() {
  const db = await import('./src/lib/db.js').then(m => m.getDb());
  const workbook = new ExcelJS.Workbook();
  
  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Value', key: 'value', width: 20 }
  ];
  
  const stats = await getDashboardStats();
  const summaryData = [
    { metric: 'Total Closed Trades', value: stats.totalClosedTrades },
    { metric: 'Total Open Trades', value: stats.totalOpenTrades },
    { metric: 'Win Rate', value: stats.winRate.toFixed(2) + '%' },
    { metric: 'Total Profit', value: stats.totalProfit },
    { metric: 'Total Loss', value: stats.totalLoss },
    { metric: 'Net P&L', value: stats.totalPnL.toFixed(2) },
    { metric: 'Initial Capital', value: stats.initialCapital },
    { metric: 'Total Deposits', value: stats.totalDeposits },
    { metric: 'Total Withdrawals', value: stats.totalWithdrawals },
    { metric: 'Current Balance', value: stats.balance.toFixed(2) },
  ];
  
  summarySheet.addRows(summaryData);
  
  // Sheet 2: Transactions
  const txSheet = workbook.addWorksheet('Transactions');
  txSheet.columns = [
    { header: 'Date Time', key: 'dateTime', width: 20 },
    { header: 'Instrument', key: 'instrument', width: 15 },
    { header: 'Direction', key: 'direction', width: 10 },
    { header: 'Lot', key: 'lot', width: 10 },
    { header: 'Entry Price', key: 'entryPrice', width: 15 },
    { header: 'Exit Price', key: 'exitPrice', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Manual P&L', key: 'manualPnL', width: 15 },
    { header: 'Calculated P&L', key: 'calculatedPnL', width: 15 },
  ];
  
  const transactions = await getAllTransactions(1000);
  transactions.transactions.forEach(tx => {
    txSheet.addRow({
      dateTime: tx.dateTime,
      instrument: tx.instrument,
      direction: tx.direction,
      lot: tx.lot,
      entryPrice: tx.entryPrice,
      exitPrice: tx.exitPrice || '',
      status: tx.status,
      manualPnL: tx.manualPnL || '',
      calculatedPnL: tx.calculatedPnL || '',
    });
  });
  
  // Sheet 3: Loss Review
  const lossSheet = workbook.addWorksheet('Loss Review');
  lossSheet.columns = [
    { header: 'Transaction ID', key: 'txId', width: 20 },
    { header: 'Instrument', key: 'instrument', width: 15 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Loss Amount', key: 'lossAmount', width: 15 },
    { header: 'Reasons', key: 'reasons', width: 30 },
    { header: 'Mistakes', key: 'mistakes', width: 40 },
    { header: 'Lessons', key: 'lessons', width: 40 },
    { header: 'Action Items', key: 'actionItems', width: 40 },
  ];
  
  for (const tx of transactions.transactions) {
    if (tx.status === 'LOSS') {
      const evalData = await getEvaluationByTransactionId(tx.id);
      if (evalData) {
        const reasons = await import('./src/lib/evaluations.js').then(m => m.getTransactionLossReasons(tx.id));
        lossSheet.addRow({
          txId: tx.id.slice(0, 8),
          instrument: tx.instrument,
          date: tx.dateTime,
          lossAmount: tx.manualPnL || tx.calculatedPnL || 0,
          reasons: reasons.map(r => r.label).join(', '),
          mistakes: evalData.mistakes || '',
          lessons: evalData.lessons || '',
          actionItems: evalData.actionItems || '',
        });
      }
    }
  }
  
  // Sheet 4: Cash Flow
  const cashSheet = workbook.addWorksheet('Cash Flow');
  cashSheet.columns = [
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Fee', key: 'fee', width: 10 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];
  
  const cashFlows = await getAllCashFlows();
  cashFlows.forEach(cf => {
    cashSheet.addRow({
      date: cf.date_time,
      type: cf.type,
      amount: cf.amount,
      fee: cf.fee || 0,
      notes: cf.notes || '',
    });
  });
  
  return await workbook.xlsx.writeBuffer();
}

startServer();
