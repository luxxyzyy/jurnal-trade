import { getDashboardStats } from '@/lib/stats';
import { initDB } from '@/lib/init-db';

export async function GET() {
  await initDB();
  try {
    const stats = await getDashboardStats();
    return Response.json(stats, { status: 200 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
