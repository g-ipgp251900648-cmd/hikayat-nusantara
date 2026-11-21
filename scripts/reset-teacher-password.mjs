import { database, databaseConfigured } from '../auth/db.js';
import { hashPassword, validPassword } from '../auth/credentials.js';

// Target a single teacher account, never the entire teacher role.
const LOGIN_ID = 'HN-G-354C992A7A7A';
const temporary = process.env.HN_RESET_TEACHER_PASSWORD;

async function run() {
  if (!databaseConfigured()) throw Error('Recovery database URL is missing');
  if (!validPassword(temporary)) throw Error('Teacher recovery password must be 12–128 characters');
  const pool = await database();
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      "SELECT id FROM hn_users WHERE login_id=$1 AND role='guru' AND active=true FOR UPDATE",
      [LOGIN_ID]
    );
    if (result.rowCount !== 1) throw Error('Target active teacher account not found; no change made');
    const hash = await hashPassword(temporary);
    await client.query(
      'UPDATE hn_users SET password_hash=$1, must_change_password=true, failed_logins=0, locked_until=NULL WHERE id=$2',
      [hash, result.rows[0].id]
    );
    await client.query('DELETE FROM hn_sessions WHERE user_id=$1', [result.rows[0].id]);
    await client.query('COMMIT');
    console.log('Teacher password recovered for ' + LOGIN_ID + '. A personal password change is required at first login.');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}
run().catch(error => {
  console.error('Teacher recovery failed:', error.message);
  process.exitCode = 1;
});
