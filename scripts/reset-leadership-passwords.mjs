import { database, databaseConfigured } from '../auth/db.js';
import { hashPassword, validPassword } from '../auth/credentials.js';

// One-time, exact-ID recovery for the two school leadership accounts only.
const targets = [
  { loginId: 'HN-GK-68550022C7C1', role: 'gkmp', password: process.env.HN_RESET_GKMP_PASSWORD },
  { loginId: 'HN-KP-1E21C60FC5B4', role: 'panitia', password: process.env.HN_RESET_KPBM_PASSWORD },
];

async function run() {
  if (!databaseConfigured()) throw Error('HN_RECOVERY_DATABASE_URL is not configured');
  if (targets.some(target => !validPassword(target.password))) {
    throw Error('Both recovery passwords must be 12–128 characters');
  }
  if (targets[0].password === targets[1].password) {
    throw Error('Use different passwords for GKMP and KPBM');
  }
  const pool = await database();
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const users = [];
    for (const target of targets) {
      const result = await client.query(
        'SELECT id FROM hn_users WHERE login_id=$1 AND role=$2 AND active=true FOR UPDATE',
        [target.loginId, target.role]
      );
      if (result.rowCount !== 1) throw Error('One leadership account is missing/inactive or has the wrong role. Nothing changed.');
      users.push(result.rows[0].id);
    }
    for (let index = 0; index < targets.length; index++) {
      const hashed = await hashPassword(targets[index].password);
      await client.query(
        'UPDATE hn_users SET password_hash=$1, must_change_password=true, failed_logins=0, locked_until=NULL WHERE id=$2',
        [hashed, users[index]]
      );
      await client.query('DELETE FROM hn_sessions WHERE user_id=$1', [users[index]]);
    }
    await client.query('COMMIT');
    console.log('Both leadership account credentials reset successfully. First login requires a personal password change.');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

run().catch(error => {
  console.error('Leadership password reset failed:', error.message);
  process.exitCode = 1;
});
