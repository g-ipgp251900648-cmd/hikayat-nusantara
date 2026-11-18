import { migrate, database } from '../auth/db.js';
migrate().then(async () => {
  console.log('Skema pangkalan data Hikayat Nusantara tersedia.');
  const db=await database();
  await db.end();
}).catch(error => {
  console.error('Migrasi gagal:',error.code||error.message);
  process.exitCode=1;
});
