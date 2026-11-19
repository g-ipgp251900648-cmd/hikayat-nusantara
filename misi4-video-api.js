import {randomUUID} from 'node:crypto';
import {database, databaseConfigured} from './auth/db.js';
import {findSession} from './auth/api.js';

const MAX_BYTES=2*1024*1024;
const TYPES=new Set(['video/webm','video/mp4']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const settings=()=>({
  url:process.env.GOOGLE_APPS_SCRIPT_URL,
  secret:process.env.RENDER_SHARED_SECRET
});
function validSettings({url,secret}){
  try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='script.google.com'&&u.pathname.endsWith('/exec')&&typeof secret==='string'&&secret.length>=32;}
  catch{return false;}
}
function sameOrigin(req){
  try{const o=new URL(req.headers.origin);return o.host===req.headers.host&&o.protocol===(process.env.NODE_ENV==='production'?'https:':'http:');}
  catch{return false;}
}
async function jsonBody(req){
  let bytes=0;const pieces=[];
  for await(const piece of req){bytes+=piece.length;if(bytes>4096)throw Error('TOO_LARGE');pieces.push(piece);}
  return JSON.parse(Buffer.concat(pieces).toString('utf8'));
}
async function videoBody(req,expected){
  let bytes=0;const pieces=[];
  for await(const piece of req){bytes+=piece.length;if(bytes>MAX_BYTES)throw Error('TOO_LARGE');pieces.push(piece);}
  if(bytes!==expected)throw Error('LENGTH_MISMATCH');
  return Buffer.concat(pieces);
}
async function gas(cfg,data){
  const response=await fetch(cfg.url,{
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({token:cfg.secret,...data}),
    signal:AbortSignal.timeout(110000),
    redirect:'follow'
  });
  if(!response.ok)throw Error('APPS_SCRIPT_HTTP_'+response.status);
  const result=await response.json();
  if(result?.ok!==true)throw Error('APPS_SCRIPT_REJECTED');
  return result;
}
async function enrolled(db,user){
  const q=await db.query('SELECT EXISTS(SELECT 1 FROM hn_class_members cm JOIN hn_classes c ON c.id=cm.class_id WHERE cm.student_id=$1 AND c.organization_id=$2) AS yes',[user.id,user.organization_id]);
  return q.rows[0]?.yes===true;
}
async function teacherHasStudent(db,user,studentId){
  const q=await db.query('SELECT EXISTS(SELECT 1 FROM hn_class_members cm JOIN hn_classes c ON c.id=cm.class_id WHERE cm.student_id=$1 AND c.teacher_id=$2 AND c.organization_id=$3) AS yes',[studentId,user.id,user.organization_id]);
  return q.rows[0]?.yes===true;
}
export async function handleMisi4Video(req,res,path){
  if(!path.startsWith('/api/misi4/'))return false;
  const cfg=settings();
  if(!databaseConfigured()){reply(res,503,{ok:false,error:'DATABASE_NOT_CONFIGURED'});return true;}
  if(!validSettings(cfg)){reply(res,503,{ok:false,error:'GOOGLE_DRIVE_NOT_CONFIGURED'});return true;}
  if(!['GET','POST'].includes(req.method)){reply(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});return true;}
  if(req.method==='POST'&&!sameOrigin(req)){reply(res,403,{ok:false,error:'INVALID_ORIGIN'});return true;}
  try{
    const db=await database(),user=await findSession(db,req);
    if(!user||user.must_change_password){reply(res,401,{ok:false,error:'LOGIN_REQUIRED'});return true;}
    if(path==='/api/misi4/health'&&req.method==='GET'){reply(res,200,{ok:true,storage:{configured:true,driver:'google-drive',maxUploadBytes:MAX_BYTES}});return true;}
    if(path==='/api/misi4/initiate'&&req.method==='POST'){
      if(user.role!=='murid'||!(await enrolled(db,user))){reply(res,403,{ok:false,error:'STUDENT_NOT_ENROLLED'});return true;}
      const data=await jsonBody(req);
      const bytes=Number(data.bytes),mime=data.mime;
      if(!TYPES.has(mime)||!Number.isSafeInteger(bytes)||bytes<1024||bytes>MAX_BYTES){reply(res,400,{ok:false,error:'INVALID_VIDEO_FILE'});return true;}
      const recent=await db.query("SELECT count(*)::int AS n FROM hn_misi4_videos WHERE student_id=$1 AND created_at>now()-interval '10 minutes'",[user.id]);
      if(recent.rows[0].n>=5){reply(res,429,{ok:false,error:'TOO_MANY_UPLOADS'});return true;}
      const id=randomUUID();
      await db.query("INSERT INTO hn_misi4_videos(id,organization_id,student_id,mime_type,expected_bytes,status) VALUES($1,$2,$3,$4,$5,'pending')",[id,user.organization_id,user.id,mime,bytes]);
      reply(res,200,{ok:true,id,uploadUrl:'/api/misi4/upload/'+id,mime,maxBytes:MAX_BYTES});return true;
    }
    if(path.startsWith('/api/misi4/upload/')&&req.method==='POST'){
      if(user.role!=='murid'){reply(res,403,{ok:false,error:'FORBIDDEN'});return true;}
      const id=path.split('/').at(-1);
      if(!UUID.test(id)){reply(res,400,{ok:false,error:'INVALID_ID'});return true;}
      const q=await db.query("SELECT expected_bytes,mime_type,status FROM hn_misi4_videos WHERE id=$1 AND organization_id=$2 AND student_id=$3",[id,user.organization_id,user.id]);
      const item=q.rows[0];
      if(!item||item.status!=='pending'){reply(res,409,{ok:false,error:'UPLOAD_NOT_PENDING'});return true;}
      if(req.headers['content-type']?.split(';')[0]!==item.mime_type){reply(res,400,{ok:false,error:'INVALID_MIME'});return true;}
      const data=await videoBody(req,Number(item.expected_bytes));
      const stored=await gas(cfg,{action:'upload_video',mimeType:item.mime_type,videoBase64:data.toString('base64')});
      if(typeof stored.fileId!=='string'||!/^[A-Za-z0-9_-]{10,200}$/.test(stored.fileId))throw Error('INVALID_DRIVE_RECEIPT');
      const saved=await db.query("UPDATE hn_misi4_videos SET drive_file_id=$1,status='submitted',submitted_at=now() WHERE id=$2 AND student_id=$3 AND organization_id=$4 AND status='pending' RETURNING id",[stored.fileId,id,user.id,user.organization_id]);
      if(!saved.rowCount){reply(res,409,{ok:false,error:'STATE_CONFLICT'});return true;}
      reply(res,200,{ok:true,id,referenceNo:id,status:'Telah Dihantar'});return true;
    }
    if(path==='/api/misi4/state'&&req.method==='GET'&&user.role==='murid'){
      const q=await db.query("SELECT id,id::text AS \"referenceNo\",submitted_at FROM hn_misi4_videos WHERE student_id=$1 AND organization_id=$2 AND status='submitted' ORDER BY submitted_at DESC LIMIT 50",[user.id,user.organization_id]);
      reply(res,200,{ok:true,submissions:q.rows.map(x=>({...x,status:'Telah Dihantar'}))});return true;
    }
    if(path==='/api/misi4/teacher'&&req.method==='GET'&&user.role==='guru'){
      const q=await db.query("SELECT v.id,v.student_id,u.display_name, v.submitted_at,v.mime_type,(SELECT string_agg(DISTINCT c.name, ', ') FROM hn_class_members cm JOIN hn_classes c ON c.id=cm.class_id WHERE cm.student_id=v.student_id AND c.teacher_id=$1 AND c.organization_id=$2) AS class_name FROM hn_misi4_videos v JOIN hn_users u ON u.id=v.student_id WHERE v.organization_id=$2 AND v.status='submitted' AND v.drive_file_id IS NOT NULL AND EXISTS(SELECT 1 FROM hn_class_members cm JOIN hn_classes c ON c.id=cm.class_id WHERE cm.student_id=v.student_id AND c.teacher_id=$1 AND c.organization_id=$2) ORDER BY v.submitted_at DESC LIMIT 250",[user.id,user.organization_id]);
      reply(res,200,{ok:true,submissions:q.rows});return true;
    }
    if(path.startsWith('/api/misi4/watch/')&&req.method==='GET'&&(user.role==='guru'||user.role==='murid')){
      const id=path.split('/').at(-1);
      if(!UUID.test(id)){reply(res,400,{ok:false,error:'INVALID_ID'});return true;}
      const q=await db.query("SELECT student_id,drive_file_id,mime_type,expected_bytes FROM hn_misi4_videos WHERE id=$1 AND organization_id=$2 AND status='submitted'",[id,user.organization_id]);
      const item=q.rows[0];
      if(!item?.drive_file_id){reply(res,404,{ok:false,error:'NOT_FOUND'});return true;}
      if(user.role==='murid'&&item.student_id!==user.id||user.role==='guru'&&!(await teacherHasStudent(db,user,item.student_id))){reply(res,403,{ok:false,error:'FORBIDDEN'});return true;}
      const video=await gas(cfg,{action:'read_video',fileId:item.drive_file_id});
      if(video.mimeType!==item.mime_type||typeof video.videoBase64!=='string')throw Error('INVALID_DRIVE_VIDEO');
      const bytes=Buffer.from(video.videoBase64,'base64');
      if(bytes.length!==Number(item.expected_bytes)||bytes.length>MAX_BYTES)throw Error('VIDEO_SIZE_MISMATCH');
      res.writeHead(200,{'Content-Type':item.mime_type,'Content-Length':bytes.length,'Content-Disposition':'inline','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
      res.end(bytes);return true;
    }
    reply(res,404,{ok:false,error:'NOT_FOUND'});return true;
  }catch(err){
    console.error('Misi4:',/^(TOO_LARGE|LENGTH_MISMATCH|INVALID_DRIVE_RECEIPT|INVALID_DRIVE_VIDEO|VIDEO_SIZE_MISMATCH)$/.test(err.message)?err.message:'OPERATION_FAILED');
    reply(res,err.message==='TOO_LARGE'?413:err.message==='LENGTH_MISMATCH'?400:502,{ok:false,error:'MISI4_OPERATION_FAILED'});
    return true;
  }
}
