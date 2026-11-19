import { database, databaseConfigured, audit } from './db.js';
import { hashPassword, verifyPassword, validLoginId, validPassword, validName, temporaryPassword, uniqueId, sessionToken, tokenHash } from './credentials.js';

const COOKIE_NAME='hn_session';
const EIGHT_HOURS=8*60*60;
const attempts=new Map();
const adminRoles=new Set(['admin','gkmp','panitia']);
const canAdmin = role => adminRoles.has(role);
function json(response,status,data,extra={}) {
  response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});
  response.end(JSON.stringify(data));
}
function reject(response,status,code) {json(response,status,{ok:false,error:code});}
function cookie(request,token,maxAge) {
  const secure=process.env.NODE_ENV==='production' ? '; Secure' : '';
  return COOKIE_NAME+'='+token+'; HttpOnly; SameSite=Lax; Path=/; Max-Age='+maxAge+secure;
}
function getCookie(request) {
  const cookies=String(request.headers.cookie||'').split(';');
  const item=cookies.find(c=>c.trim().startsWith(COOKIE_NAME+'='));
  const token=item?.trim().slice((COOKIE_NAME+'=').length);
  return typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token)?token:null;
}
function isSameOrigin(request) {
  const origin=request.headers.origin;
  const host=request.headers.host;
  if(!origin || !host) return false;
  try {
    const parsed=new URL(origin);
    if(parsed.host!==host)return false;
    return parsed.protocol===(process.env.NODE_ENV==='production'?'https:':'http:');
  } catch {return false;}
}
async function readBody(request,limit=16384) {
  let size=0;const chunks=[];
  for await(const chunk of request) {
    size+=chunk.length;
    if(size>limit) {const e=Error('Body too large');e.status=413;throw e;}
    chunks.push(chunk);
  }
  let result;
  try {result=JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch {const e=Error('Invalid JSON');e.status=400;throw e;}
  if(!result||typeof result!=='object'||Array.isArray(result)){
    const e=Error('JSON object required');e.status=400;throw e;
  }
  return result;
}
function rateLimit(key){
  const now=Date.now();
  if(attempts.size>5000)for(const [k,v] of attempts)if(v.until<=now)attempts.delete(k);
  let state=attempts.get(key);
  if(!state||state.until<=now)state={count:0,until:now+15*60*1000};
  state.count++;
  attempts.set(key,state);
  return state.count<=12;
}
async function findSession(db,request) {
  const token=getCookie(request);
  if(!token)return null;
  const result=await db.query(
    "SELECT u.id,u.organization_id,u.login_id,u.display_name,u.role,u.active,u.must_change_password FROM hn_sessions s JOIN hn_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true",
    [tokenHash(token)]
  );
  return result.rows[0]||null;
}
function publicUser(u){
  return {id:u.id,loginId:u.login_id,name:u.display_name,role:u.role,mustChangePassword:u.must_change_password};
}
async function requireUser(db,req,res,role=null){
  const user=await findSession(db,req);
  if(!user){reject(res,401,'LOGIN_REQUIRED');return null;}
  if(user.must_change_password){reject(res,403,'PASSWORD_CHANGE_REQUIRED');return null;}
  if(role&&user.role!==role){reject(res,403,'FORBIDDEN');return null;}
  return user;
}
async function auditEvent(db,user,action,type,id){
  await audit(db,user,action,type,id);
}
function uuid(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function cleanName(value){return typeof value==='string'?value.trim():'';}

export async function authorizeMissionRequest(request) {
  if(!databaseConfigured())return false;
  try {
    const db=await database();
    const user=await findSession(db,request);
    return Boolean(user&&user.role==='murid'&&!user.must_change_password);
  }catch {return false;}
}

export async function handleApi(request,response,pathname) {
  if(!pathname.startsWith('/api/'))return false;
  // The existing Misi 4 upload endpoints are intentionally disabled until private object storage is ready.
  if(pathname.startsWith('/api/misi4/'))return false;
  if(!databaseConfigured()) {
    if(pathname==='/api/auth/status'&&request.method==='GET')json(response,200,{configured:false});
    else reject(response,503,'DATABASE_NOT_CONFIGURED');
    return true;
  }
  if(request.method!=='GET'&&request.method!=='POST'&&request.method!=='PUT') {
    reject(response,405,'METHOD_NOT_ALLOWED');return true;
  }
  if(request.method!=='GET'&&!isSameOrigin(request)){
    reject(response,403,'ORIGIN_NOT_ALLOWED');return true;
  }
  let db;
  try {db=await database();}
  catch(error) {
    // Log only the standardized category; never print database URLs, passwords
    // or raw error messages to shared hosting logs.
    const rawCode = error?.code || error?.name;
    const safeCode = typeof rawCode==='string' && /^[A-Za-z][A-Za-z0-9_]{1,63}$/.test(rawCode)
      ? rawCode : 'UNKNOWN';
    const missingDependency = safeCode==='ERR_MODULE_NOT_FOUND'
      ? /Cannot find package ['"]pg['"]/.test(String(error?.message||''))
        ? 'PG_PACKAGE_NOT_INSTALLED'
        : 'OTHER_DEPENDENCY_MISSING'
      : 'NOT_APPLICABLE';
    console.error('HN_DB_INITIALIZATION_FAILED:', safeCode, missingDependency);
    reject(response,503,'DATABASE_UNAVAILABLE');return true;
  }
  try {
    const method=request.method;
    if(pathname==='/api/auth/status'&&method==='GET') {
      await db.query('SELECT 1 FROM hn_users LIMIT 1');
      json(response,200,{configured:true});return true;
    }
    if(pathname==='/api/auth/session'&&method==='GET'){
      const u=await findSession(db,request);
      json(response,200,{authenticated:!!u,user:u?publicUser(u):null});return true;
    }
    if(pathname==='/api/auth/login'&&method==='POST'){
      const data=await readBody(request);
      const id=String(data.id||'').toUpperCase();
      const password=data.password;
      if(!validLoginId(id)||typeof password!=='string'||password.length>128||!password){
        reject(response,400,'INVALID_CREDENTIALS');return true;
      }
      const ip=String(request.headers['x-forwarded-for']||request.socket.remoteAddress||'unknown').split(',')[0].trim().slice(0,80);
      if(!rateLimit(ip)){reject(response,429,'TOO_MANY_ATTEMPTS');return true;}
      const users=await db.query('SELECT * FROM hn_users WHERE login_id=$1',[id]);
      const user=users.rows[0];
      const locked=user?.locked_until&&new Date(user.locked_until)>new Date();
      const good=!locked&&user?.active&&await verifyPassword(password,user.password_hash);
      if(!good){
        if(user&&!locked)await db.query(
          "UPDATE hn_users SET failed_logins=failed_logins+1,locked_until=CASE WHEN failed_logins>=4 THEN now()+interval '15 minutes' ELSE locked_until END WHERE id=$1",
          [user.id]
        );
        reject(response,401,'INVALID_CREDENTIALS');return true;
      }
      const token=sessionToken();
      const hash=tokenHash(token);
      await db.query('DELETE FROM hn_sessions WHERE user_id=$1 AND expires_at<now()',[user.id]);
      await db.query('INSERT INTO hn_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval \'8 hours\')',[hash,user.id]);
      await db.query('UPDATE hn_users SET failed_logins=0,locked_until=NULL WHERE id=$1',[user.id]);
      await auditEvent(db,user,'login','session',user.id);
      json(response,200,{ok:true,user:publicUser(user)},{'Set-Cookie':cookie(request,token,EIGHT_HOURS)});
      return true;
    }
    if(pathname==='/api/auth/logout'&&method==='POST'){
      const token=getCookie(request);
      if(token)await db.query('DELETE FROM hn_sessions WHERE token_hash=$1',[tokenHash(token)]);
      json(response,200,{ok:true},{'Set-Cookie':cookie(request,'',0)});return true;
    }
    if(pathname==='/api/auth/change-password'&&method==='POST'){
      const user=await findSession(db,request);
      if(!user){reject(response,401,'LOGIN_REQUIRED');return true;}
      const body=await readBody(request);
      if(!validPassword(body.newPassword)||body.newPassword===body.currentPassword){reject(response,400,'PASSWORD_POLICY');return true;}
      const r=await db.query('SELECT password_hash FROM hn_users WHERE id=$1',[user.id]);
      if(!r.rows[0]||!await verifyPassword(body.currentPassword,r.rows[0].password_hash)){
        reject(response,401,'INVALID_CREDENTIALS');return true;
      }
      const hashed=await hashPassword(body.newPassword);
      await db.query('UPDATE hn_users SET password_hash=$1,must_change_password=false,failed_logins=0 WHERE id=$2',[hashed,user.id]);
      await db.query('DELETE FROM hn_sessions WHERE user_id=$1 AND token_hash<>$2',[user.id,tokenHash(getCookie(request))]);
      await auditEvent(db,user,'change_password','user',user.id);
      json(response,200,{ok:true});return true;
    }
    const user=await requireUser(db,request,response);
    if(!user)return true;

    if(pathname==='/api/admin/overview'&&method==='GET'){
      if(!canAdmin(user.role)){reject(response,403,'FORBIDDEN');return true;}
      const r=await db.query("SELECT (SELECT count(*)::int FROM hn_users WHERE organization_id=$1 AND role='guru' AND active) AS teachers,(SELECT count(*)::int FROM hn_users WHERE organization_id=$1 AND role='murid' AND active) AS students,(SELECT count(*)::int FROM hn_classes WHERE organization_id=$1) AS classes",[user.organization_id]);
      json(response,200,{ok:true,stats:r.rows[0]});return true;
    }
    if(pathname==='/api/admin/teachers'&&canAdmin(user.role)){
      if(method==='GET'){
        const r=await db.query("SELECT id,login_id,display_name,active,created_at FROM hn_users WHERE organization_id=$1 AND role='guru' ORDER BY created_at DESC LIMIT 300",[user.organization_id]);
        json(response,200,{ok:true,teachers:r.rows});return true;
      }
      if(method==='POST'){
        const body=await readBody(request);
        const name=cleanName(body.name);
        if(!validName(name)){reject(response,400,'INVALID_NAME');return true;}
        const id=uniqueId('teacher'),password=temporaryPassword(),hashed=await hashPassword(password);
        const r=await db.query("INSERT INTO hn_users(organization_id,login_id,display_name,password_hash,role) VALUES($1,$2,$3,$4,'guru') RETURNING id,login_id,display_name",[user.organization_id,id,name,hashed]);
        await auditEvent(db,user,'create_teacher','user',r.rows[0].id);
        json(response,201,{ok:true,teacher:r.rows[0],temporaryPassword:password});return true;
      }
    }
    if(pathname==='/api/admin/leaders'&&canAdmin(user.role)){
      if(method==='GET'){
        const r=await db.query(
          "SELECT id,login_id,display_name,role,active,created_at FROM hn_users WHERE organization_id=$1 AND role IN ('gkmp','panitia') ORDER BY role,created_at DESC LIMIT 20",
          [user.organization_id]
        );
        json(response,200,{ok:true,leaders:r.rows});return true;
      }
      if(method==='POST'){
        const body=await readBody(request);
        const name=cleanName(body.name),role=body.role;
        if(!validName(name)||!['gkmp','panitia'].includes(role)){
          reject(response,400,'INVALID_LEADERSHIP_ACCOUNT');return true;
        }
        const id=uniqueId(role),password=temporaryPassword(),hashed=await hashPassword(password);
        let result;
        try {
          result=await db.query(
            'INSERT INTO hn_users(organization_id,login_id,display_name,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING id,login_id,display_name,role',
            [user.organization_id,id,name,hashed,role]
          );
        } catch(error) {
          if(error?.code==='23505'){reject(response,409,'LEADERSHIP_POSITION_OCCUPIED');return true;}
          throw error;
        }
        await auditEvent(db,user,'create_bm_leader','user',result.rows[0].id);
        json(response,201,{ok:true,leader:result.rows[0],temporaryPassword:password});return true;
      }
    }
    if(pathname==='/api/admin/students'&&method==='GET'&&canAdmin(user.role)){
      const r=await db.query(
        "SELECT u.id,u.login_id,u.display_name,u.active,u.created_at,COALESCE(string_agg(DISTINCT c.name,', ' ORDER BY c.name),'Tiada kelas') AS class_names,(SELECT count(*)::int FROM hn_mission_progress mp WHERE mp.student_id=u.id) AS progress_count FROM hn_users u LEFT JOIN hn_class_members cm ON cm.student_id=u.id LEFT JOIN hn_classes c ON c.id=cm.class_id AND c.organization_id=u.organization_id WHERE u.organization_id=$1 AND u.role='murid' GROUP BY u.id ORDER BY u.created_at DESC LIMIT 400",
        [user.organization_id]
      );
      json(response,200,{ok:true,students:r.rows});return true;
    }
    if(pathname==='/api/admin/classes'&&method==='GET'&&canAdmin(user.role)){
      const r=await db.query(
        "SELECT c.id,c.name,c.school_year,c.teacher_id,u.display_name AS teacher_name,count(cm.student_id)::int AS students FROM hn_classes c JOIN hn_users u ON u.id=c.teacher_id LEFT JOIN hn_class_members cm ON cm.class_id=c.id WHERE c.organization_id=$1 GROUP BY c.id,u.display_name ORDER BY c.created_at DESC LIMIT 400",
        [user.organization_id]
      );
      json(response,200,{ok:true,classes:r.rows});return true;
    }
    if(pathname==='/api/admin/users/status'&&method==='POST'&&canAdmin(user.role)){
      const body=await readBody(request);
      if(!uuid(body.userId)||typeof body.active!=='boolean'){
        reject(response,400,'INVALID_ACCOUNT_STATUS');return true;
      }
      const client=await db.connect();
      try {
        await client.query('BEGIN');
        const target=await client.query(
          "SELECT id,role,active FROM hn_users WHERE id=$1 AND organization_id=$2 AND role IN ('guru','murid') FOR UPDATE",
          [body.userId,user.organization_id]
        );
        if(!target.rows.length){
          await client.query('ROLLBACK');reject(response,404,'ACCOUNT_NOT_FOUND');return true;
        }
        if(target.rows[0].active!==body.active){
          await client.query('UPDATE hn_users SET active=$1 WHERE id=$2',[body.active,body.userId]);
          // End all browser sessions immediately when account access is changed.
          await client.query('DELETE FROM hn_sessions WHERE user_id=$1',[body.userId]);
          await auditEvent(client,user,body.active?'reactivate_account':'deactivate_account','user',body.userId);
        }
        await client.query('COMMIT');
        json(response,200,{ok:true,active:body.active});return true;
      }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
      finally{client.release();}
    }
    if(pathname==='/api/admin/users/delete'&&method==='POST'&&canAdmin(user.role)){
      const body=await readBody(request);
      if(!uuid(body.userId)||!validLoginId(body.confirmationId)){
        reject(response,400,'INVALID_DELETE_CONFIRMATION');return true;
      }
      const client=await db.connect();
      try {
        await client.query('BEGIN');
        const r=await client.query(
          "SELECT id,login_id,role,active FROM hn_users WHERE id=$1 AND organization_id=$2 AND role IN ('guru','murid') FOR UPDATE",
          [body.userId,user.organization_id]
        );
        const target=r.rows[0];
        if(!target){await client.query('ROLLBACK');reject(response,404,'ACCOUNT_NOT_FOUND');return true;}
        if(target.active){await client.query('ROLLBACK');reject(response,409,'DEACTIVATE_ACCOUNT_FIRST');return true;}
        if(body.confirmationId!==target.login_id){
          await client.query('ROLLBACK');reject(response,400,'INVALID_DELETE_CONFIRMATION');return true;
        }
        if(target.role==='guru'){
          const classes=await client.query('SELECT count(*)::int AS count FROM hn_classes WHERE teacher_id=$1',[target.id]);
          if(classes.rows[0].count>0){
            await client.query('ROLLBACK');reject(response,409,'TRANSFER_TEACHER_CLASSES_FIRST');return true;
          }
        }
        // Student-linked memberships, drafts and sessions cascade on deletion.
        // Historical audit entries are retained with NULL actor_id (schema migration).
        await client.query('DELETE FROM hn_users WHERE id=$1',[target.id]);
        await auditEvent(client,user,'permanently_delete_'+target.role,'user',target.id);
        await client.query('COMMIT');
        json(response,200,{ok:true,deleted:true});return true;
      }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
      finally{client.release();}
    }
    if(pathname==='/api/admin/classes/transfer'&&method==='POST'&&canAdmin(user.role)){
      const body=await readBody(request);
      if(!uuid(body.classId)||!uuid(body.teacherId)){
        reject(response,400,'INVALID_CLASS_TRANSFER');return true;
      }
      const client=await db.connect();
      try {
        await client.query('BEGIN');
        const cls=await client.query('SELECT id,teacher_id FROM hn_classes WHERE id=$1 AND organization_id=$2 FOR UPDATE',
          [body.classId,user.organization_id]);
        const teacher=await client.query(
          "SELECT id FROM hn_users WHERE id=$1 AND organization_id=$2 AND role='guru' AND active=true",
          [body.teacherId,user.organization_id]
        );
        if(!cls.rows.length||!teacher.rows.length){
          await client.query('ROLLBACK');reject(response,404,'CLASS_OR_TEACHER_NOT_FOUND');return true;
        }
        if(cls.rows[0].teacher_id!==body.teacherId){
          try{await client.query('UPDATE hn_classes SET teacher_id=$1 WHERE id=$2',[body.teacherId,body.classId]);}
          catch(error){
            if(error?.code==='23505'){
              await client.query('ROLLBACK');reject(response,409,'CLASS_NAME_CONFLICT');return true;
            }
            throw error;
          }
          await auditEvent(client,user,'transfer_class','class',body.classId);
        }
        await client.query('COMMIT');
        json(response,200,{ok:true});return true;
      }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
      finally{client.release();}
    }
    // A class can be deleted only by its teacher or the school's Admin team.
    // A populated class must have its roster transferred first, preserving
    // pupil accounts and mission progress.
    if(pathname==='/api/classes/delete'&&method==='POST'&&
       (canAdmin(user.role)||user.role==='guru')){
      const body=await readBody(request);
      const classId=body.classId;
      const destinationClassId=body.destinationClassId;
      if(!uuid(classId)||typeof body.confirmationName!=='string'||
         body.confirmationName.length>100||
         (destinationClassId!==undefined&&!uuid(destinationClassId))){
        reject(response,400,'INVALID_CLASS_DELETE_REQUEST');return true;
      }
      const client=await db.connect();
      try {
        await client.query('BEGIN');
        const source=await client.query(
          "SELECT id,name,teacher_id FROM hn_classes WHERE id=$1 AND organization_id=$2 FOR UPDATE",
          [classId,user.organization_id]
        );
        const cls=source.rows[0];
        if(!cls||(user.role==='guru'&&cls.teacher_id!==user.id)){
          await client.query('ROLLBACK');reject(response,404,'CLASS_NOT_FOUND');return true;
        }
        if(body.confirmationName!==cls.name){
          await client.query('ROLLBACK');reject(response,400,'CLASS_NAME_CONFIRMATION_REQUIRED');return true;
        }
        const count=await client.query(
          'SELECT count(*)::int AS total FROM hn_class_members WHERE class_id=$1',[classId]
        );
        const members=count.rows[0].total;
        if(members>0){
          if(!destinationClassId||destinationClassId===classId){
            await client.query('ROLLBACK');reject(response,409,'CLASS_HAS_STUDENTS');return true;
          }
          const target=await client.query(
            "SELECT c.id FROM hn_classes c JOIN hn_users u ON u.id=c.teacher_id WHERE c.id=$1 AND c.organization_id=$2 AND c.id<>$3 AND u.active=true AND ($4::boolean OR c.teacher_id=$5) FOR UPDATE OF c",
            [destinationClassId,user.organization_id,classId,canAdmin(user.role),user.id]
          );
          if(!target.rows.length){
            await client.query('ROLLBACK');reject(response,404,'DESTINATION_CLASS_NOT_FOUND');return true;
          }
          await client.query(
            'INSERT INTO hn_class_members(class_id,student_id) SELECT $1,student_id FROM hn_class_members WHERE class_id=$2 ON CONFLICT DO NOTHING',
            [destinationClassId,classId]
          );
        }
        const result=await client.query(
          'DELETE FROM hn_classes WHERE id=$1 AND organization_id=$2',
          [classId,user.organization_id]
        );
        if(result.rowCount!==1){
          await client.query('ROLLBACK');reject(response,409,'CLASS_DELETE_CONFLICT');return true;
        }
        await auditEvent(client,user,'delete_class','class',classId);
        await client.query('COMMIT');
        json(response,200,{ok:true,deleted:true,movedStudents:members});return true;
      }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
      finally{client.release();}
    }
    if(pathname==='/api/teacher/classes'&&user.role==='guru'){
      if(method==='GET'){
        const r=await db.query("SELECT c.id,c.name,c.school_year,count(cm.student_id)::int AS students FROM hn_classes c LEFT JOIN hn_class_members cm ON cm.class_id=c.id WHERE c.organization_id=$1 AND c.teacher_id=$2 GROUP BY c.id ORDER BY c.created_at DESC",[user.organization_id,user.id]);
        json(response,200,{ok:true,classes:r.rows});return true;
      }
      if(method==='POST'){
        const body=await readBody(request),name=cleanName(body.name),year=Number(body.schoolYear);
        if(!validName(name)||!Number.isInteger(year)||year<2020||year>2100){reject(response,400,'INVALID_CLASS');return true;}
        const r=await db.query('INSERT INTO hn_classes(organization_id,teacher_id,name,school_year) VALUES($1,$2,$3,$4) RETURNING id,name,school_year',[user.organization_id,user.id,name,year]);
        await auditEvent(db,user,'create_class','class',r.rows[0].id);
        json(response,201,{ok:true,class:r.rows[0]});return true;
      }
    }
    // Private, transactional CSV enrollment. Student names are supplied by the
    // authenticated teacher through the browser; never commit school rosters.
    // Teacher may reissue one-time credentials ONLY for still-unclaimed pupil
    // accounts in a class they own. Accounts which already changed passwords
    // are never reset by this recovery workflow.
    if(pathname==='/api/teacher/students/reissue-temporary'&&
       user.role==='guru'&&method==='POST'){
      const body=await readBody(request);
      if(!uuid(body.classId)||typeof body.confirmationName!=='string'||
         body.confirmationName.length>100){
        reject(response,400,'INVALID_REISSUE_REQUEST');return true;
      }
      const client=await db.connect();
      let credentials=[],unaffected=0;
      try {
        await client.query('BEGIN');
        const cls=await client.query(
          'SELECT id,name FROM hn_classes WHERE id=$1 AND teacher_id=$2 AND organization_id=$3 FOR UPDATE',
          [body.classId,user.id,user.organization_id]
        );
        if(!cls.rows.length){
          await client.query('ROLLBACK');reject(response,404,'CLASS_NOT_FOUND');return true;
        }
        if(cls.rows[0].name!==body.confirmationName){
          await client.query('ROLLBACK');reject(response,400,'CLASS_NAME_CONFIRMATION_REQUIRED');return true;
        }
        const pupils=await client.query(
          "SELECT u.id,u.login_id,u.display_name,u.must_change_password,u.active FROM hn_users u JOIN hn_class_members cm ON cm.student_id=u.id WHERE cm.class_id=$1 AND u.organization_id=$2 AND u.role='murid' ORDER BY u.login_id FOR UPDATE OF u",
          [body.classId,user.organization_id]
        );
        if(pupils.rows.length>50){
          await client.query('ROLLBACK');reject(response,409,'CLASS_TOO_LARGE_FOR_REISSUE');return true;
        }
        unaffected=pupils.rows.filter(p=>!p.must_change_password||!p.active).length;
        for(const pupil of pupils.rows){
          if(!pupil.must_change_password||!pupil.active)continue;
          const password=temporaryPassword();
          const hashed=await hashPassword(password);
          await client.query(
            'UPDATE hn_users SET password_hash=$1,failed_logins=0,locked_until=NULL WHERE id=$2',
            [hashed,pupil.id]
          );
          await client.query('DELETE FROM hn_sessions WHERE user_id=$1',[pupil.id]);
          credentials.push({loginId:pupil.login_id,name:pupil.display_name,temporaryPassword:password});
        }
        await auditEvent(client,user,'reissue_initial_pupil_passwords','class',body.classId);
        await client.query('COMMIT');
      }catch(error){
        credentials=[];
        await client.query('ROLLBACK').catch(()=>{});
        throw error;
      }finally{client.release();}
      json(response,200,{ok:true,reissued:credentials.length,unaffected,credentials});return true;
    }
    if(pathname==='/api/teacher/students/bulk'&&user.role==='guru'&&method==='POST'){
      const body=await readBody(request,35000);
      const classId=body.classId;
      const students=body.students;
      if(!uuid(classId)||!Array.isArray(students)||students.length<1||students.length>50){
        reject(response,400,'INVALID_BULK_ROSTER');return true;
      }
      const normalized=students.map(row=>({
        name:cleanName(row?.name),
        loginId:typeof row?.loginId==='string'?row.loginId.trim().toUpperCase():''
      }));
      if(normalized.some(row=>!validName(row.name)||!validLoginId(row.loginId))||
         new Set(normalized.map(row=>row.loginId)).size!==normalized.length){
        reject(response,400,'INVALID_BULK_ROSTER');return true;
      }
      const client=await db.connect();
      let credentials=[];
      try {
        await client.query('BEGIN');
        const ownClass=await client.query(
          'SELECT id FROM hn_classes WHERE id=$1 AND organization_id=$2 AND teacher_id=$3 FOR UPDATE',
          [classId,user.organization_id,user.id]
        );
        if(!ownClass.rows.length){
          await client.query('ROLLBACK');reject(response,404,'CLASS_NOT_FOUND');return true;
        }
        const ids=normalized.map(row=>row.loginId);
        const used=await client.query('SELECT 1 FROM hn_users WHERE login_id=ANY($1::text[]) LIMIT 1',[ids]);
        if(used.rows.length){
          await client.query('ROLLBACK');reject(response,409,'LOGIN_ID_CONFLICT');return true;
        }
        for(const row of normalized){
          // Every pupil gets a different temporary password and must rotate it
          // at first login. No passwords are persisted in plain text.
          const password=temporaryPassword();
          const hashed=await hashPassword(password);
          const created=await client.query(
            "INSERT INTO hn_users(organization_id,login_id,display_name,password_hash,role,must_change_password) VALUES($1,$2,$3,$4,'murid',true) RETURNING id",
            [user.organization_id,row.loginId,row.name,hashed]
          );
          await client.query(
            'INSERT INTO hn_class_members(class_id,student_id) VALUES($1,$2)',
            [classId,created.rows[0].id]
          );
          credentials.push({name:row.name,loginId:row.loginId,temporaryPassword:password});
        }
        await auditEvent(client,user,'bulk_register_students','class',classId);
        await client.query('COMMIT');
      }catch(error){
        await client.query('ROLLBACK').catch(()=>{});
        credentials=[];
        if(error?.code==='23505'){reject(response,409,'LOGIN_ID_CONFLICT');return true;}
        throw error;
      }finally{client.release();}
      json(response,201,{ok:true,created:credentials.length,credentials});return true;
    }
    if(pathname==='/api/teacher/students'&&user.role==='guru'){
      if(method==='GET'){
        const r=await db.query("SELECT DISTINCT u.id,u.login_id,u.display_name,u.active,c.name AS class_name,c.id AS class_id FROM hn_users u JOIN hn_class_members cm ON cm.student_id=u.id JOIN hn_classes c ON c.id=cm.class_id WHERE c.teacher_id=$1 AND c.organization_id=$2 ORDER BY u.display_name LIMIT 400",[user.id,user.organization_id]);
        json(response,200,{ok:true,students:r.rows});return true;
      }
      if(method==='POST'){
        const body=await readBody(request),name=cleanName(body.name),classId=body.classId;
        if(!validName(name)||!uuid(classId)){reject(response,400,'INVALID_STUDENT');return true;}
        const id=uniqueId('student'),password=temporaryPassword(),hashed=await hashPassword(password);
        const client=await db.connect();
        let created;
        try {
          await client.query('BEGIN');
          const cls=await client.query('SELECT id FROM hn_classes WHERE id=$1 AND teacher_id=$2 AND organization_id=$3 FOR UPDATE',[classId,user.id,user.organization_id]);
          if(!cls.rows.length){await client.query('ROLLBACK');reject(response,404,'CLASS_NOT_FOUND');return true;}
          const r=await client.query("INSERT INTO hn_users(organization_id,login_id,display_name,password_hash,role) VALUES($1,$2,$3,$4,'murid') RETURNING id,login_id,display_name",[user.organization_id,id,name,hashed]);
          created=r.rows[0];
          await client.query('INSERT INTO hn_class_members(class_id,student_id) VALUES($1,$2)',[classId,created.id]);
          await client.query('INSERT INTO hn_audit(organization_id,actor_id,action,resource_type,resource_id) VALUES($1,$2,$3,$4,$5)',[user.organization_id,user.id,'create_student','user',created.id]);
          await client.query('COMMIT');
        }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
        json(response,201,{ok:true,student:created,temporaryPassword:password});return true;
      }
    }
    if(pathname==='/api/teacher/overview'&&method==='GET'&&user.role==='guru'){
      const r=await db.query("SELECT (SELECT count(*)::int FROM hn_classes WHERE teacher_id=$1) AS classes,(SELECT count(DISTINCT cm.student_id)::int FROM hn_class_members cm JOIN hn_classes c ON c.id=cm.class_id WHERE c.teacher_id=$1) AS students,(SELECT count(*)::int FROM hn_mission_progress mp JOIN hn_class_members cm ON cm.student_id=mp.student_id JOIN hn_classes c ON c.id=cm.class_id WHERE c.teacher_id=$1) AS recorded_mission_drafts",[user.id]);
      json(response,200,{ok:true,stats:r.rows[0]});return true;
    }
    if(pathname==='/api/teacher/progress'&&method==='GET'&&user.role==='guru'){
      const progress=await db.query(
        "SELECT DISTINCT u.login_id,u.display_name,c.name AS class_name,mp.mission_id,mp.state,mp.updated_at FROM hn_mission_progress mp JOIN hn_class_members cm ON cm.student_id=mp.student_id JOIN hn_classes c ON c.id=cm.class_id JOIN hn_users u ON u.id=mp.student_id WHERE c.teacher_id=$1 AND c.organization_id=$2 ORDER BY mp.updated_at DESC LIMIT 200",
        [user.id,user.organization_id]
      );
      json(response,200,{ok:true,progress:progress.rows});return true;
    }
    if(pathname==='/api/student/progress'&&method==='GET'&&user.role==='murid'){
      const r=await db.query('SELECT mission_id,checkpoint,state,revision,updated_at FROM hn_mission_progress WHERE student_id=$1 ORDER BY mission_id',[user.id]);
      json(response,200,{ok:true,progress:r.rows});return true;
    }
    const save=pathname.match(/^\/api\/student\/progress\/([1-4])$/);
    if(save&&method==='PUT'&&user.role==='murid'){
      const body=await readBody(request,25000);
      const mission=Number(save[1]),expected=Number(body.revision);
      const checkpoint=body.checkpoint;
      if(!Number.isInteger(expected)||expected<0||!checkpoint||Array.isArray(checkpoint)||typeof checkpoint!=='object'||JSON.stringify(checkpoint).length>16000){
        reject(response,400,'INVALID_CHECKPOINT');return true;
      }
      const client=await db.connect();let output;
      try {
        await client.query('BEGIN');
        const old=await client.query('SELECT revision,state FROM hn_mission_progress WHERE student_id=$1 AND mission_id=$2 FOR UPDATE',[user.id,mission]);
        if((old.rows[0]?.revision||0)!==expected){
          await client.query('ROLLBACK');reject(response,409,'CHECKPOINT_CONFLICT');return true;
        }
        if(!old.rows.length){
          const r=await client.query("INSERT INTO hn_mission_progress(student_id,mission_id,checkpoint,state) VALUES($1,$2,$3::jsonb,'draft') RETURNING revision,updated_at",[user.id,mission,JSON.stringify(checkpoint)]);
          output=r.rows[0];
        }else{
          const r=await client.query("UPDATE hn_mission_progress SET checkpoint=$3::jsonb,revision=revision+1,updated_at=now() WHERE student_id=$1 AND mission_id=$2 RETURNING revision,updated_at",[user.id,mission,JSON.stringify(checkpoint)]);
          output=r.rows[0];
        }
        await client.query('COMMIT');
      }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
      json(response,200,{ok:true,missionId:mission,state:'draft',...output});return true;
    }
    reject(response,404,'ENDPOINT_NOT_FOUND');return true;
  } catch(error){
    if(error.status===400||error.status===413){reject(response,error.status,error.status===413?'BODY_TOO_LARGE':'INVALID_JSON');return true;}
    // Avoid leaking DB error messages, SQL fragments, credentials or student records to clients.
    console.error('API request failed:',error.code||'unavailable');
    reject(response,503,'SERVICE_UNAVAILABLE');return true;
  }
}
