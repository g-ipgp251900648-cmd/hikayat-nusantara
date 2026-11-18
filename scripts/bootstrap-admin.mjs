import { database, databaseConfigured, migrate } from '../auth/db.js';
import { hashPassword, validLoginId, validName, validPassword } from '../auth/credentials.js';

async function run() {
  if(!databaseConfigured())throw Error('DATABASE_URL belum ditetapkan.');
  const loginId=String(process.env.HN_BOOTSTRAP_ADMIN_ID||'').toUpperCase();
  const password=process.env.HN_BOOTSTRAP_ADMIN_PASSWORD||'';
  const name=String(process.env.HN_BOOTSTRAP_ADMIN_NAME||'Pentadbir').trim();
  const organization=String(process.env.HN_BOOTSTRAP_ORGANIZATION||'Hikayat Nusantara').trim();
  if(!validLoginId(loginId)||!validPassword(password)||!validName(name)||!validName(organization)){
    throw Error('Tetapkan HN_BOOTSTRAP_ADMIN_ID, HN_BOOTSTRAP_ADMIN_PASSWORD (12+ aksara), HN_BOOTSTRAP_ADMIN_NAME dan HN_BOOTSTRAP_ORGANIZATION secara selamat.');
  }
  await migrate();
  const db=await database();
  const client=await db.connect();
  try{
    await client.query('BEGIN');
    const admins=await client.query("SELECT id FROM hn_users WHERE role='admin' LIMIT 1");
    if(admins.rows.length)throw Error('Admin telah wujud. Bootstrap sekali sahaja dibenarkan.');
    const hashed=await hashPassword(password);
    const org=await client.query('INSERT INTO hn_organizations(name) VALUES($1) RETURNING id',[organization]);
    await client.query("INSERT INTO hn_users(organization_id,login_id,display_name,password_hash,role,must_change_password) VALUES($1,$2,$3,$4,'admin',true)",[org.rows[0].id,loginId,name,hashed]);
    await client.query('COMMIT');
    console.log('Akaun Admin pertama diwujudkan:',loginId,'. Tukar kata laluan selepas log masuk.');
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
  finally{client.release();await db.end();}
}
run().catch(error=>{console.error('Bootstrap admin gagal:',error.message);process.exitCode=1;});
