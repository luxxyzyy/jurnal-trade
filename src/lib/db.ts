import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbPath = path.join(process.cwd(), 'trade.db');

export async function getDb() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
}
