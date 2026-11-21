import { database, databaseConfigured } from '../auth/db.js';
import { hashPassword, validPassword } from '../auth/credentials.js';

const LOGIN_ID = 'HN-ADM-001';
const password = process.env.HN_RESET_ADMIN_PASSWORD || '';

async function run() {
  if (!databaseConfigured()) throw Error('DATABASE_URL secret is missing');
  if (!validPassword(password)) throw Error('HN_RESET_ADMIN_PASSWORD must be 12–128 characters');
  const pool = await database();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "SELECT id FROM hn_users WHERE login_id=$1 AND role='admin' AND active=true FOR UPDATE",
      [LOGIN_ID]
    );
    if (result.rowCount !== 1) throw Error('Target active admin not found; nothing changed');
    const hash = await hashPassword(password);
    await client.query(
      "UPDATE hn_users SET password_hash=$1, must_change_password=false, failed_logins=0, locked_until=NULL WHERE id=$2",
      [hash, result.rows[0].id]
    );
    await client.query('DELETE FROM hn_sessions WHERE user_id=$1', [result.rows[0].id]);
    await client.query('COMMIT');
    console.log('Admin password reset successful for ' + LOGIN_ID + '. Existing other accounts and records unchanged.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(error => {
  console.error('Admin reset failed:', error.message);
  process.exitCode = 1;
});
