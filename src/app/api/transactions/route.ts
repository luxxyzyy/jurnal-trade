import { createTransaction, getAllTransactions } from '@/lib/transactions';
import { initDB } from '@/lib/init-db';

export async function POST(request: Request) {
  await initDB();
  try {
    const body = await request.json();
    const transaction = await createTransaction(body);
    return Response.json(transaction, { status: 201 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  await initDB();
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');
    const direction = url.searchParams.get('direction');
    const instrument = url.searchParams.get('instrument');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const filters = {
      status: status || undefined,
      direction: direction || undefined,
      instrument: instrument || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    const result = await getAllTransactions(limit, offset, filters);
    return Response.json(result, { status: 200 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
