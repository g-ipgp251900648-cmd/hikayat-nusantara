import { createHmac, createHash, randomUUID } from 'node:crypto';
import { database, databaseConfigured } from './auth/db.js';
import { findSession } from './auth/api.js';

const MAX_SIZE=100*1024*1024;
const TYPES=new Set(['video/webm','video/mp4']);
const encode=v=>encodeURIComponent(v).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
const sha=v=>createHash('sha256').update(v).digest('hex');
const hmac=(key,v)=>createHmac('sha256',key).update(v).digest();
const reply=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
function config(){
 const {S3_ENDPOINT,S3_REGION,S3_BUCKET,S3_ACCESS_KEY_ID,S3_SECRET_ACCESS_KEY}=process.env;
 if(![S3_ENDPOINT,S3_REGION,S3_BUCKET,S3_ACCESS_KEY_ID,S3_SECRET_ACCESS_KEY].every(Boolean))return null;
 const base=new URL(S3_ENDPOINT);
 if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw Error('S3_ENDPOINT must be a secure HTTPS URL.');
 return {base,region:S3_REGION,bucket:S3_BUCKET,access:S3_ACCESS_KEY_ID,secret:S3_SECRET_ACCESS_KEY};
}
function signedUrl(cfg,method,key,seconds,contentType=null){
 const now=new Date(),stamp=now.toISOString().replace(/[:-]|\.\d{3}/g,'');
 const day=stamp.slice(0,8),scope=day+'/'+cfg.region+'/s3/aws4_request';
 const url=new URL(cfg.base.href);
 const basePath=url.pathname.replace(/\/$/,'');
 url.pathname=basePath+'/'+encode(cfg.bucket)+'/'+key.split('/').map(encode).join('/');
 const query=[['X-Amz-Algorithm','AWS4-HMAC-SHA256'],['X-Amz-Credential',cfg.access+'/'+scope],
  ['X-Amz-Date',stamp],['X-Amz-Expires',String(seconds)],['X-Amz-SignedHeaders',contentType?'content-type;host':'host']];
 query.sort(([a],[b])=>a.localeCompare(b,'en'));
 const q=query.map(([k,v])=>encode(k)+'='+encode(v)).join('&');
 const header='host:'+url.host+'\n'+(contentType?'content-type:'+contentType+'\n':'');
 const canonical=(contentType?'content-type:'+contentType+'\n':'')+'host:'+url.host+'\n';
 const canonicalRequest=[method,url.pathname,q,canonical,contentType?'content-type;host':'host','UNSIGNED-PAYLOAD'].join('\n');
 const stringToSign=['AWS4-HMAC-SHA256',stamp,scope,sha(canonicalRequest)].join('\n');
 const signKey=hmac(hmac(hmac(hmac('AWS4'+cfg.secret,day),cfg.region),'s3'),'aws4_request');
 url.search=q+'&X-Amz-Signature='+hmac(signKey,stringToSign).toString('hex');
 return url.toString();
}
async function body(req){
 const chunks=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>8192)throw Error('TOO_LARGE');chunks.push(chunk);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function sameOrigin(req){
 try{const origin=new URL(req.headers.origin);return origin.host===req.headers.host && origin.protocol===(process.env.NODE_ENV==='production'?'https:':'http:');}
 catch{return false;}
}
async function belongs(db,user){
 const r=await db.query('SELECT EXISTS(SELECT 1 FROM hn_class_members cm JOIN hn_classes c ON c.id=cm.class_id WHERE cm.student_id=$1 AND c.organization_id=$2) AS yes',[user.id,user.organization_id]);
 return r.rows[0]?.yes;
}
export async function handleMisi4Video(req,res,path){
 if(!path.startsWith('/api/misi4/'))return false;
 if(!databaseConfigured()){reply(res,503,{ok:false,error:'DATABASE_NOT_CONFIGURED'});return true;}
 let cfg;try{cfg=config();}catch{reply(res,503,{ok:false,error:'STORAGE_CONFIGURATION_INVALID'});return true;}
 if(!cfg){reply(res,503,{ok:false,error:'MISI4_BACKEND_NOT_CONFIGURED'});return true;}
 if(!['GET','POST'].includes(req.method)){reply(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});return true;}
 if(req.method==='POST'&&!sameOrigin(req)){reply(res,403,{ok:false,error:'INVALID_ORIGIN'});return true;}
 const db=database();let user;
 try{user=await findSession(db,req);
  if(!user||user.must_change_password){reply(res,401,{ok:false,error:'LOGIN_REQUIRED'});return true;}
  if(path==='/api/misi4/health'&&req.method==='GET'){reply(res,200,{ok:true,storage:{configured:true}});return true;}
  if(path==='/api/misi4/initiate'&&req.method==='POST'){
   if(user.role!=='murid'||!(await belongs(db,user))){reply(res,403,{ok:false,error:'STUDENT_NOT_ENROLLED'});return true;}
   const data=await body(req),bytes=Number(data.bytes),mime=data.mime;
   if(!TYPES.has(mime)||!Number.isSafeInteger(bytes)||bytes<1024||bytes>MAX_SIZE){reply(res,400,{ok:false,error:'INVALID_VIDEO_FILE'});return true;}
   const id=randomUUID(),key='misi4/'+user.organization_id+'/'+user.id+'/'+id+(mime==='video/webm'?'.webm':'.mp4');
   await db.query("INSERT INTO hn_misi4_videos(id,organization_id,student_id,object_key,mime_type,expected_bytes,status) VALUES($1,$2,$3,$4,$5,$6,'pending')",[id,user.organization_id,user.id,key,mime,bytes]);
   reply(res,200,{ok:true,id,uploadUrl:signedUrl(cfg,'PUT',key,600,mime),mime,maxBytes:MAX_SIZE});return true;
  }
  if(path==='/api/misi4/complete'&&req.method==='POST'){
   if(user.role!=='murid'){reply(res,403,{ok:false,error:'FORBIDDEN'});return true;}
   const data=await body(req);
   if(!/^[0-9a-f-]{36}$/.test(data.id||'')){reply(res,400,{ok:false,error:'INVALID_ID'});return true;}
   const rows=await db.query("SELECT * FROM hn_misi4_videos WHERE id=$1 AND student_id=$2 AND organization_id=$3",[data.id,user.id,user.organization_id]);
   const item=rows.rows[0];if(!item){reply(res,404,{ok:false,error:'NOT_FOUND'});return true;}
   if(item.status==='submitted'){reply(res,200,{ok:true,id:item.id,referenceNo:item.id,status:'Telah Dihantar'});return true;}
   const checked=await fetch(signedUrl(cfg,'HEAD',item.object_key,60));
   const length=Number(checked.headers.get('content-length'));
   if(!checked.ok||length!==Number(item.expected_bytes)){reply(res,409,{ok:false,error:'UPLOAD_NOT_VERIFIED'});return true;}
   const updated=await db.query("UPDATE hn_misi4_videos SET status='submitted',submitted_at=now() WHERE id=$1 AND status='pending' RETURNING id",[item.id]);
   if(!updated.rowCount){reply(res,409,{ok:false,error:'STATE_CONFLICT'});return true;}
   reply(res,200,{ok:true,id:item.id,referenceNo:item.id,status:'Telah Dihantar'});return true;
  }
  if(path==='/api/misi4/state'&&req.method==='GET'&&user.role==='murid'){
   const q=await db.query("SELECT id,id::text AS \"referenceNo\",status,submitted_at FROM hn_misi4_videos WHERE student_id=$1 AND organization_id=$2 AND status='submitted' ORDER BY submitted_at DESC LIMIT 50",[user.id,user.organization_id]);
   reply(res,200,{ok:true,submissions:q.rows.map(x=>({...x,status:'Telah Dihantar'}))});return true;
  }
  if(path==='/api/misi4/teacher'&&req.method==='GET'&&user.role==='guru'){
   const q=await db.query("SELECT DISTINCT v.id,v.student_id,u.display_name,c.name AS class_name,v.status,v.submitted_at,v.mime_type FROM hn_misi4_videos v JOIN hn_users u ON u.id=v.student_id JOIN hn_class_members cm ON cm.student_id=v.student_id JOIN hn_classes c ON c.id=cm.class_id AND c.teacher_id=$1 WHERE v.organization_id=$2 AND v.status='submitted' ORDER BY v.submitted_at DESC LIMIT 250",[user.id,user.organization_id]);
   reply(res,200,{ok:true,submissions:q.rows});return true;
  }
  if(path.startsWith('/api/misi4/watch/')&&req.method==='GET'&&(user.role==='guru'||user.role==='murid')){
   const id=path.split('/').at(-1);
   if(!/^[0-9a-f-]{36}$/.test(id)){reply(res,400,{ok:false,error:'INVALID_ID'});return true;}
   const q=await db.query("SELECT v.object_key,v.mime_type,v.student_id FROM hn_misi4_videos v WHERE v.id=$1 AND v.organization_id=$2 AND v.status='submitted'",[id,user.organization_id]);
   const item=q.rows[0];if(!item){reply(res,404,{ok:false,error:'NOT_FOUND'});return true;}
   if(user.role==='murid'&&item.student_id!==user.id){reply(res,403,{ok:false,error:'FORBIDDEN'});return true;}
   if(user.role==='guru'){
    const access=await db.query('SELECT EXISTS(SELECT 1 FROM hn_class_members cm JOIN hn_classes c ON c.id=cm.class_id WHERE cm.student_id=$1 AND c.teacher_id=$2 AND c.organization_id=$3) AS yes',[item.student_id,user.id,user.organization_id]);
    if(!access.rows[0].yes){reply(res,403,{ok:false,error:'FORBIDDEN'});return true;}
   }
   reply(res,200,{ok:true,url:signedUrl(cfg,'GET',item.object_key,180),mime:item.mime_type});return true;
  }
  reply(res,404,{ok:false,error:'NOT_FOUND'});return true;
 }catch(err){console.error('Misi4 API:',err.code||err.message);reply(res,err.message==='TOO_LARGE'?413:500,{ok:false,error:'MISI4_OPERATION_FAILED'});return true;}
 finally{await db.end();}
}
