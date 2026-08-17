import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

let _sql = null;

export function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url || url.includes('USER:PASSWORD') || url.includes('HOST')) {
    const err = new Error(
      'DATABASE_URL is not configured. Copy server/.env.example to server/.env and paste your Neon connection string.'
    );
    err.code = 'NO_DATABASE_URL';
    throw err;
  }
  _sql = neon(url);
  return _sql;
}

/** Tagged-template proxy so existing `sql\`...\`` calls keep working */
export const sql = (strings, ...values) => getSql()(strings, ...values);
