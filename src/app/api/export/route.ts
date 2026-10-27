import ExcelJS from 'exceljs';
import { getAllTransactions } from '@/lib/transactions';
import { getEvaluationByTransactionId, getTransactionLossReasons } from '@/lib/evaluations';
import { initDB } from '@/lib/init-db';

export async function GET() {
  await initDB();
  try {
    const { transactions } = await getAllTransactions(1000);
    const workbook = new ExcelJS.Workbook();
    
    // Transactions Sheet
    const tSheet = workbook.addWorksheet('Transactions');
    tSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Waktu', key: 'dateTime', width: 20 },
      { header: 'Instrumen', key: 'instrument', width: 15 },
      { header: 'Arah', key: 'direction', width: 10 },
      { header: 'Lot', key: 'lot', width: 10 },
      { header: 'Entry', key: 'entryPrice', width: 15 },
      { header: 'Exit', key: 'exitPrice', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'P&L', key: 'pnl', width: 15 },
    ];

    // Evaluations Sheet
    const eSheet = workbook.addWorksheet('Evaluations');
    eSheet.columns = [
      { header: 'Transaction ID', key: 'tId', width: 15 },
      { header: 'Penyebab Loss', key: 'reasons', width: 30 },
      { header: 'Pelajaran', key: 'lessons', width: 40 },
      { header: 'Aksi Konkret', key: 'actions', width: 40 },
    ];

    for (const t of transactions) {
      tSheet.addRow({
        id: t.id.slice(0, 8),
        dateTime: t.dateTime,
        instrument: t.instrument,
        direction: t.direction,
        lot: t.lot,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        status: t.status,
        pnl: t.manualPnL ?? t.calculatedPnL,
      });

      const evalData = await getEvaluationByTransactionId(t.id);
      if (evalData) {
        const reasons = (await getTransactionLossReasons(t.id)).map((r: any) => r.label).join(', ');
        eSheet.addRow({
          tId: t.id.slice(0, 8),
          reasons: reasons,
          lessons: evalData.lessons,
          actions: evalData.actionItems,
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="TradeJournal_Export.xlsx"',
      },
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
