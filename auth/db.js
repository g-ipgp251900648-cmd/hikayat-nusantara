import { readFile } from 'node:fs/promises';

let poolPromise;
export function databaseConfigured() { return Boolean(process.env.DATABASE_URL); }

export async function database() {
  if (!databaseConfigured()) return null;
  if (!poolPromise) {
    poolPromise = import('pg').then(({ default: pg }) => new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 6, idleTimeoutMillis: 15000, connectionTimeoutMillis: 5000
    })).catch(error => { poolPromise = undefined; throw error; });
  }
  return poolPromise;
}
export async function migrate() {
  const pool = await database();
  if (!pool) throw Error('DATABASE_URL is missing');
  const schema = await readFile(new URL('schema.sql',import.meta.url),'utf8');
  await pool.query(schema);
}
export async function audit(db,user,action,resourceType,resourceId,outcome='success') {
  await db.query(
    'INSERT INTO hn_audit(organization_id,actor_id,action,resource_type,resource_id,outcome) VALUES($1,$2,$3,$4,$5,$6)',
    [user.organization_id,user.id,action,resourceType,String(resourceId||''),outcome]
  );
}
