import {randomUUID} from 'node:crypto';
import {PassThrough, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {S3Client, GetObjectCommand, DeleteObjectCommand} from '@aws-sdk/client-s3';
import {Upload} from '@aws-sdk/lib-storage';
import {database, databaseConfigured} from './auth/db.js';
import {findSession} from './auth/api.js';

const MAX_BYTES=100*1024*1024;
const TYPES=new Set(['video/webm','video/mp4']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const storageSettings=()=>({
  endpoint:process.env.AWS_ENDPOINT_URL_S3,
  region:process.env.AWS_REGION,
  key:process.env.AWS_ACCESS_KEY_ID,
  secret:process.env.AWS_SECRET_ACCESS_KEY,
  bucket:process.env.MISI4_STORAGE_BUCKET
});
function configured(s){
  try{return new URL(s.endpoint).protocol==='https:'&&[s.region,s.key,s.secret,s.bucket].every(x=>typeof x==='string'&&x.length>0)&&/^[a-z0-9][a-z0-9.-]{2,62}$/.test(s.bucket);}
  catch{return false;}
}
const makeS3=s=>new S3Client({endpoint:s.endpoint,region:s.region,forcePathStyle:true,credentials:{accessKeyId:s.key,secretAccessKey:s.secret},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});
function sameOrigin(req){
  try{const o=new URL(req.headers.origin);return o.host===req.headers.host&&o.protocol===(process.env.NODE_ENV==='production'?'https:':'http:');}
  catch{return false;}
}
async function jsonBody(req){
  let bytes=0;const chunks=[];
  for await(const chunk of req){bytes+=chunk.length;if(bytes>4096)throw Error('TOO_LARGE');chunks.push(chunk);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function gasRead(fileId){
  const url=process.env.GOOGLE_APPS_SCRIPT_URL,secret=process.env.RENDER_SHARED_SECRET;
  if(!url||!secret)throw Error('LEGACY_STORAGE_NOT_CONFIGURED');
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token:secret,action:'read_video',fileId}),signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error('LEGACY_READ_FAILED');
  const result=await response.json();
  if(result?.ok!==true)throw Error('LEGACY_READ_FAILED');
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
async function storeUpload(req,s3,bucket,key,expected){
  // Streaming multipart upload: do not buffer an entire 100 MB video in Render memory.
  const length=Number(req.headers['content-length']);
  if(!Number.isSafeInteger(length)||length!==expected)throw Error('LENGTH_MISMATCH');
  let received=0;
  const bounded=new Transform({transform(chunk,enc,cb){
    received+=chunk.length;
    if(received>expected||received>MAX_BYTES)cb(Error('TOO_LARGE'));
    else cb(null,chunk);
  }});
  const stream=new PassThrough({highWaterMark:1024*1024});
  const transfer=pipeline(req,bounded,stream);
  const uploader=new Upload({
    client:s3,
    params:{Bucket:bucket,Key:key,Body:stream,ContentType:req.headers['content-type'].split(';')[0]},
    partSize:8*1024*1024,queueSize:2,leavePartsOnError:false
  });
  // Both promises are observed together so failures stop the stream and multipart transfer.
  try{
    await Promise.all([uploader.done(),transfer]);
    if(received!==expected)throw Error('LENGTH_MISMATCH');
  }catch(error){
    // Keep the client connection open long enough to return a useful error.
    req.unpipe(bounded);
    req.resume();
    bounded.destroy();
    stream.destroy();
    try{await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));}catch{}
    throw error;
  }
}
export async function handleMisi4Video(req,res,path){
  if(!path.startsWith('/api/misi4/'))return false;
  const cfg=storageSettings();
  if(!databaseConfigured()){reply(res,503,{ok:false,error:'DATABASE_NOT_CONFIGURED'});return true;}
  if(!['GET','POST'].includes(req.method)){reply(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});return true;}
  if(req.method==='POST'&&!sameOrigin(req)){reply(res,403,{ok:false,error:'INVALID_ORIGIN'});return true;}
  try{
    const db=await database(),user=await findSession(db,req);
    if(!user||user.must_change_password){reply(res,401,{ok:false,error:'LOGIN_REQUIRED'});return true;}
    if(path==='/api/misi4/health'&&req.method==='GET'){
      reply(res,200,{ok:true,storage:{configured:configured(cfg),driver:'neon-object-storage',maxUploadBytes:MAX_BYTES}});return true;
    }
    if(path==='/api/misi4/initiate'&&req.method==='POST'){
      if(!configured(cfg)){reply(res,503,{ok:false,error:'NEON_STORAGE_NOT_CONFIGURED'});return true;}
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
      if(!configured(cfg)){reply(res,503,{ok:false,error:'NEON_STORAGE_NOT_CONFIGURED'});return true;}
      if(user.role!=='murid'){reply(res,403,{ok:false,error:'FORBIDDEN'});return true;}
      const id=path.split('/').at(-1);
      if(!UUID.test(id)){reply(res,400,{ok:false,error:'INVALID_ID'});return true;}
      const q=await db.query("SELECT expected_bytes,mime_type,status FROM hn_misi4_videos WHERE id=$1 AND organization_id=$2 AND student_id=$3 AND deleted_at IS NULL",[id,user.organization_id,user.id]);
      const item=q.rows[0];
      if(!item||item.status!=='pending'){reply(res,409,{ok:false,error:'UPLOAD_NOT_PENDING'});return true;}
      if(req.headers['content-type']?.split(';')[0]!==item.mime_type){reply(res,400,{ok:false,error:'INVALID_MIME'});return true;}
      if(Number(req.headers['content-length'])!==Number(item.expected_bytes)){reply(res,400,{ok:false,error:'LENGTH_MISMATCH'});return true;}
      const key='misi4/'+user.organization_id+'/'+user.id+'/'+id+(item.mime_type==='video/mp4'?'.mp4':'.webm');
      const s3=makeS3(cfg);
      await storeUpload(req,s3,cfg.bucket,key,Number(item.expected_bytes));
      const saved=await db.query("UPDATE hn_misi4_videos SET object_key=$1,drive_file_id=NULL,status='submitted',submitted_at=now() WHERE id=$2 AND student_id=$3 AND organization_id=$4 AND status='pending' AND deleted_at IS NULL RETURNING id",[key,id,user.id,user.organization_id]);
      if(!saved.rowCount){await s3.send(new DeleteObjectCommand({Bucket:cfg.bucket,Key:key}));reply(res,409,{ok:false,error:'STATE_CONFLICT'});return true;}
      reply(res,200,{ok:true,id,referenceNo:id,status:'Telah Dihantar'});return true;
    }
    if(path==='/api/misi4/state'&&req.method==='GET'&&user.role==='murid'){
      const q=await db.query("SELECT id,id::text AS \"referenceNo\",submitted_at FROM hn_misi4_videos WHERE student_id=$1 AND organization_id=$2 AND status='submitted' AND deleted_at IS NULL ORDER BY submitted_at DESC LIMIT 50",[user.id,user.organization_id]);
      reply(res,200,{ok:true,submissions:q.rows.map(x=>({...x,status:'Telah Dihantar'}))});return true;
    }
    if(path==='/api/misi4/teacher'&&req.method==='GET'&&user.role==='guru'){
      const q=await db.query("SELECT v.id,v.student_id,u.display_name,v.submitted_at,v.mime_type,(SELECT string_agg(DISTINCT c.name, ', ') FROM hn_class_members cm JOIN hn_classes c ON c.id=cm.class_id WHERE cm.student_id=v.student_id AND c.teacher_id=$1 AND c.organization_id=$2) AS class_name FROM hn_misi4_videos v JOIN hn_users u ON u.id=v.student_id WHERE v.organization_id=$2 AND v.status='submitted' AND v.deleted_at IS NULL AND (v.object_key IS NOT NULL OR v.drive_file_id IS NOT NULL) AND EXISTS(SELECT 1 FROM hn_class_members cm JOIN hn_classes c ON c.id=cm.class_id WHERE cm.student_id=v.student_id AND c.teacher_id=$1 AND c.organization_id=$2) ORDER BY v.submitted_at DESC LIMIT 250",[user.id,user.organization_id]);
      reply(res,200,{ok:true,submissions:q.rows});return true;
    }
    // Teacher removes only a recording belonging to a pupil in their own class.
    // Neon storage bytes are deleted, while a minimal tombstone and all PBD
    // assessments / text feedback remain. Deleted videos are never watchable.
    if(path.startsWith('/api/misi4/delete/')&&req.method==='POST'){
      if(user.role!=='guru'){reply(res,403,{ok:false,error:'FORBIDDEN'});return true;}
      const id=path.split('/').at(-1);
      if(!UUID.test(id)){reply(res,400,{ok:false,error:'INVALID_ID'});return true;}
      const body=await jsonBody(req);
      if(body?.confirmId!==id){reply(res,400,{ok:false,error:'CONFIRMATION_REQUIRED'});return true;}
      const client=await db.connect();
      try{
        await client.query('BEGIN');
        const rows=await client.query(
          "SELECT id,student_id,object_key,drive_file_id FROM hn_misi4_videos WHERE id=$1 AND organization_id=$2 AND status='submitted' AND deleted_at IS NULL FOR UPDATE",
          [id,user.organization_id]
        );
        const item=rows.rows[0];
        if(!item){await client.query('ROLLBACK');reply(res,404,{ok:false,error:'VIDEO_NOT_FOUND'});return true;}
        if(!(await teacherHasStudent(client,user,item.student_id))){
          await client.query('ROLLBACK');reply(res,403,{ok:false,error:'FORBIDDEN'});return true;
        }
        if(item.object_key){
          if(!configured(cfg)){
            await client.query('ROLLBACK');
            reply(res,503,{ok:false,error:'NEON_STORAGE_NOT_CONFIGURED'});return true;
          }
          // Delete the private object first. If deletion fails, keep the submission.
          await makeS3(cfg).send(new DeleteObjectCommand({Bucket:cfg.bucket,Key:item.object_key}));
        }
        // Preserve any published teacher comments; detach the deleted video link.
        await client.query('UPDATE hn_teacher_feedback SET video_id=NULL WHERE video_id=$1 AND organization_id=$2',
          [id,user.organization_id]);
        await client.query(
          "UPDATE hn_misi4_videos SET deleted_at=now(),deleted_by=$3,object_key=NULL,drive_file_id=NULL WHERE id=$1 AND organization_id=$2",
          [id,user.organization_id,user.id]
        );
        await client.query(
          "INSERT INTO hn_audit(organization_id,actor_id,action,resource_type,resource_id,outcome) VALUES($1,$2,'teacher_remove_misi4_video','misi4_video',$3,'success')",
          [user.organization_id,user.id,id]
        );
        await client.query('COMMIT');
        reply(res,200,{ok:true,deletedId:id,storageDeleted:Boolean(item.object_key),
          legacyDriveWarning:Boolean(item.drive_file_id)});
        return true;
      }catch(error){
        await client.query('ROLLBACK').catch(()=>{});
        throw error;
      }finally{client.release();}
    }
    if(path.startsWith('/api/misi4/watch/')&&req.method==='GET'&&(user.role==='guru'||user.role==='murid')){
      const id=path.split('/').at(-1);
      if(!UUID.test(id)){reply(res,400,{ok:false,error:'INVALID_ID'});return true;}
      const q=await db.query("SELECT student_id,drive_file_id,object_key,mime_type,expected_bytes FROM hn_misi4_videos WHERE id=$1 AND organization_id=$2 AND status='submitted' AND deleted_at IS NULL",[id,user.organization_id]);
      const item=q.rows[0];
      if(!item||(item.object_key===null&&item.drive_file_id===null)){reply(res,404,{ok:false,error:'NOT_FOUND'});return true;}
      if((user.role==='murid'&&item.student_id!==user.id)||(user.role==='guru'&&!(await teacherHasStudent(db,user,item.student_id)))){reply(res,403,{ok:false,error:'FORBIDDEN'});return true;}
      if(item.object_key){
        if(!configured(cfg)){reply(res,503,{ok:false,error:'NEON_STORAGE_NOT_CONFIGURED'});return true;}
        const range=typeof req.headers.range==='string'&&/^bytes=\d*-\d*$/.test(req.headers.range)?req.headers.range:undefined;
        const video=await makeS3(cfg).send(new GetObjectCommand({Bucket:cfg.bucket,Key:item.object_key,...(range?{Range:range}:{})}));
        const headers={'Content-Type':item.mime_type,'Content-Disposition':'inline','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
        if(video.ContentLength!=null)headers['Content-Length']=String(video.ContentLength);
        if(video.ContentRange)headers['Content-Range']=video.ContentRange;
        res.writeHead(video.ContentRange?206:200,headers);
        await pipeline(video.Body,res);
        return true;
      }
      // Previously submitted, small Drive recordings remain accessible during migration.
      const video=await gasRead(item.drive_file_id);
      if(video.mimeType!==item.mime_type||typeof video.videoBase64!=='string')throw Error('INVALID_DRIVE_VIDEO');
      const bytes=Buffer.from(video.videoBase64,'base64');
      if(bytes.length!==Number(item.expected_bytes)||bytes.length>2*1024*1024)throw Error('VIDEO_SIZE_MISMATCH');
      res.writeHead(200,{'Content-Type':item.mime_type,'Content-Length':bytes.length,'Content-Disposition':'inline','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
      res.end(bytes);return true;
    }
    reply(res,404,{ok:false,error:'NOT_FOUND'});return true;
  }catch(err){
    console.error('Misi4:',err?.name||'OPERATION_FAILED',err?.message==='TOO_LARGE'?'TOO_LARGE':'');
    if(!res.headersSent)reply(res,err?.message==='TOO_LARGE'?413:err?.message==='LENGTH_MISMATCH'?400:502,{ok:false,error:'MISI4_OPERATION_FAILED'});
    else res.destroy();
    return true;
  }
}
