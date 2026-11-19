import {randomUUID} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,open,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pipeline} from 'node:stream/promises';
import Busboy from 'busboy';
import {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';

// Personal pupil recordings are never stored in public Render /dist or GitHub.
const MAX_VIDEO=60*1024*1024, MAX_PDF=10*1024*1024;
const MAX_REQUEST=MAX_VIDEO+MAX_PDF+120000;
const TYPES=new Map([
  ['video/webm',{ext:'.webm',magic:'webm'}],
  ['video/mp4',{ext:'.mp4',magic:'mp4'}],
  ['audio/webm',{ext:'.webm',magic:'webm'}],
  ['audio/mp4',{ext:'.m4a',magic:'mp4'}],
  ['audio/mpeg',{ext:'.mp3',magic:'mp3'}],
  ['audio/wav',{ext:'.wav',magic:'wav'}],
  ['audio/x-wav',{ext:'.wav',magic:'wav'}],
  ['audio/ogg',{ext:'.ogg',magic:'ogg'}]
]);
const config=()=>{
  const endpoint=String(process.env.S3_ENDPOINT||'').trim();
  const bucket=String(process.env.S3_BUCKET||'').trim();
  const accessKeyId=String(process.env.S3_ACCESS_KEY_ID||'').trim();
  const secretAccessKey=String(process.env.S3_SECRET_ACCESS_KEY||'').trim();
  const driver=String(process.env.STORAGE_DRIVER||'object-storage');
  return driver==='object-storage'&&/^https:\/\//.test(endpoint)&&
    !!bucket&&!!accessKeyId&&!!secretAccessKey?
    {endpoint,bucket,accessKeyId,secretAccessKey,region:process.env.S3_REGION||'auto'}:null;
};
let storage=null,storageKey='';
function s3(){
  const cfg=config();
  if(!cfg) return null;
  const key=[cfg.endpoint,cfg.bucket,cfg.accessKeyId,cfg.region].join('|');
  if(!storage||storageKey!==key){
    storage=new S3Client({endpoint:cfg.endpoint,region:cfg.region,
      credentials:{accessKeyId:cfg.accessKeyId,secretAccessKey:cfg.secretAccessKey},
      forcePathStyle:true});
    storageKey=key;
  }
  return {client:storage,bucket:cfg.bucket};
}
function respond(res,code,body){
  res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(body));
}
function validUuid(x){return typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(x);}
async function bodyJson(req,limit=6500){
  let size=0;const chunks=[];
  for await(const chunk of req){
    size+=chunk.length;if(size>limit)throw Object.assign(Error('TOO_LARGE'),{status:413});
    chunks.push(chunk);
  }
  try{
    const x=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if(!x||Array.isArray(x)||typeof x!=='object')throw Error('INVALID_BODY');
    return x;
  }catch{throw Object.assign(Error('INVALID_BODY'),{status:400});}
}
function typeMagic(type,buf){
  const meta=TYPES.get(type);if(!meta)return false;
  const magic=meta.magic;
  if(magic==='webm')return buf[0]===0x1a&&buf[1]===0x45&&buf[2]===0xdf&&buf[3]===0xa3;
  if(magic==='mp4')return buf.toString('ascii',4,8)==='ftyp';
  if(magic==='wav')return buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WAVE';
  if(magic==='ogg')return buf.toString('ascii',0,4)==='OggS';
  if(magic==='mp3')return buf.toString('ascii',0,3)==='ID3'||buf[0]===255&&(buf[1]&0xe0)===0xe0;
  return false;
}
async function readMultipart(req){
  const contentType=String(req.headers['content-type']||'');
  if(!/^multipart\/form-data;\s*boundary=/i.test(contentType))
    throw Object.assign(Error('MULTIPART_REQUIRED'),{status:400});
  const length=Number(req.headers['content-length']);
  if(!Number.isSafeInteger(length)||length<=0||length>MAX_REQUEST)
    throw Object.assign(Error('FILE_TOO_LARGE'),{status:413});
  const directory=join(tmpdir(),'hn-misi4-'+randomUUID());
  await mkdir(directory,{recursive:true,mode:0o700});
  const fields={},files={},jobs=[],errors=[];
  try{
    await new Promise((resolve,reject)=>{
      let parser;
      try{parser=Busboy({headers:req.headers,limits:{
        files:2,fields:8,fieldSize:20000,fileSize:MAX_VIDEO,parts:10
      }});}catch{reject(Object.assign(Error('MULTIPART_INVALID'),{status:400}));return;}
      parser.on('field',(name,value)=>{
        if(!['storyPlan','selfChecklist','rehearsalCompleted','durationSeconds','backdropTheme'].includes(name)){
          errors.push('UNKNOWN_FIELD');return;
        }
        fields[name]=value;
      });
      parser.on('file',(name,stream,info)=>{
        if((name!=='mediaFile'&&name!=='supportingPdf')||files[name]){
          errors.push('UNKNOWN_FILE');stream.resume();return;
        }
        const mime=String(info.mimeType||'').toLowerCase().split(';')[0];
        if(name==='mediaFile'&&!TYPES.has(mime)){errors.push('UNSUPPORTED_MEDIA');stream.resume();return;}
        if(name==='supportingPdf'&&mime!=='application/pdf'){errors.push('INVALID_PDF');stream.resume();return;}
        const path=join(directory,name==='mediaFile'?'media':'script');
        files[name]={path,mime,filename:String(info.filename||'').slice(0,160)};
        stream.on('limit',()=>errors.push('FILE_TOO_LARGE'));
        jobs.push(pipeline(stream,createWriteStream(path,{flags:'wx',mode:0o600})));
      });
      parser.on('filesLimit',()=>errors.push('FILE_COUNT_LIMIT'));
      parser.on('fieldsLimit',()=>errors.push('FIELDS_LIMIT'));
      parser.on('partsLimit',()=>errors.push('PARTS_LIMIT'));
      parser.on('error',reject);
      parser.on('close',resolve);
      req.on('aborted',()=>reject(Error('UPLOAD_ABORTED')));
      req.pipe(parser);
    });
    await Promise.all(jobs);
    if(errors.length)throw Object.assign(Error(errors[0]),{status:400});
    if(!files.mediaFile)throw Object.assign(Error('VIDEO_REQUIRED'),{status:400});
    for(const [name,file] of Object.entries(files)){
      const m=await stat(file.path);file.size=m.size;
      if(m.size<32||m.size>(name==='mediaFile'?MAX_VIDEO:MAX_PDF))
        throw Object.assign(Error('FILE_SIZE_INVALID'),{status:413});
      const handle=await open(file.path,'r');
      const header=Buffer.alloc(16);
      try{await handle.read(header,0,16,0);}finally{await handle.close();}
      // Validate a small file signature without loading a pupil video into RAM.
      const valid=name==='mediaFile'?typeMagic(file.mime,header):
        header.subarray(0,5).toString('ascii')==='%PDF-';
      if(!valid)throw Object.assign(Error('FILE_SIGNATURE_INVALID'),{status:400});
    }
    return {directory,fields,files};
  }catch(error){
    await rm(directory,{recursive:true,force:true}).catch(()=>{});
    throw error;
  }
}
function publicSubmission(row){
  return {
    id:row.id,referenceNo:row.reference_no,version:row.version,
    studentId:row.student_id,studentName:row.student_name||'',
    storyTitle:row.story_title,status:row.status,
    submittedAt:row.submitted_at,mode:row.mime_type.startsWith('video/')?'video':'audio',
    mimeType:row.mime_type,sizeBytes:row.size_bytes,durationSeconds:row.duration_seconds,
    hasSupportingPdf:row.has_supporting_pdf,review:row.review_comment?{
      reviewerName:row.reviewer_name||'Guru',comment:row.review_comment
    }:null
  };
}
async function pupilClass(db,user){
  const result=await db.query(
    "SELECT c.id AS class_id FROM hn_class_members cm JOIN hn_classes c ON c.id=cm.class_id WHERE cm.student_id=$1 AND c.organization_id=$2 ORDER BY c.created_at DESC LIMIT 1",
    [user.id,user.organization_id]);
  return result.rows[0]?.class_id;
}
async function listStudent(db,user){
  const r=await db.query(
    "SELECT s.*,t.display_name AS reviewer_name FROM hn_misi4_submissions s LEFT JOIN hn_users t ON t.id=s.reviewer_id WHERE s.organization_id=$1 AND s.student_id=$2 ORDER BY s.submitted_at DESC LIMIT 50",
    [user.organization_id,user.id]);
  return r.rows;
}
async function playUrl(storage,key,type){
  return getSignedUrl(storage.client,new GetObjectCommand({
    Bucket:storage.bucket,Key:key,ResponseContentType:type
  }),{expiresIn:120});
}
export async function handleMisi4Api(req,res,path,db,user,audit){
  const method=req.method;
  const me=user&&user.role==='murid'&&!user.must_change_password;
  const teacher=user&&user.role==='guru'&&!user.must_change_password;
  if(path==='/api/misi4/health'&&method==='GET'){
    // Require a pupil session before exposing details about storage.
    if(!me){respond(res,401,{ok:false,error:'LOGIN_REQUIRED'});return true;}
    respond(res,200,{ok:true,service:'hikayat-nusantara-misi4',
      storage:{configured:!!config(),driver:'object-storage',
        maxUploadBytes:MAX_VIDEO,note:config()?
          'Penghantaran video kepada Guru tersedia.':
          'Storan video belum dikonfigurasi. Simpan rakaman pada peranti.'}});
    return true;
  }
  if(path==='/api/misi4/session'&&method==='GET'){
    if(!me){respond(res,401,{ok:false,error:'LOGIN_REQUIRED'});return true;}
    respond(res,200,{ok:true,user:{id:user.id,name:user.display_name,role:'student'},availableDemoAccounts:[]});
    return true;
  }
  if(path==='/api/misi4/state'&&method==='GET'){
    if(!me){respond(res,401,{ok:false,error:'LOGIN_REQUIRED'});return true;}
    const records=await listStudent(db,user);
    respond(res,200,{ok:true,hasPortalDraft:false,
      state:{storyPlan:null,rehearsal:null,xpAwarded:records.length>0,misi4Xp:records.length?80:0},
      submissions:records.map(publicSubmission),
      portalSummary:{priorMissionsXp:0,priorMissionsCompleted:false,totalJourneyXp:records.length?80:0}});
    return true;
  }
  if(path==='/api/misi4/submissions'&&method==='POST'){
    if(!me){respond(res,403,{ok:false,error:'MURID_REQUIRED'});return true;}
    const storage=s3();
    if(!storage){respond(res,503,{ok:false,error:'STORAGE_NOT_CONFIGURED'});return true;}
    const classId=await pupilClass(db,user);
    if(!classId){respond(res,403,{ok:false,error:'CLASS_REQUIRED'});return true;}
    let data,key=null;
    try{
      data=await readMultipart(req);
      const {fields,files}=data;
      const story=JSON.parse(fields.storyPlan||'null');
      const checklist=JSON.parse(fields.selfChecklist||'null');
      const duration=Number(fields.durationSeconds);
      if(!story||typeof story!=='object'||Array.isArray(story)||
        !checklist||typeof checklist!=='object'||Array.isArray(checklist)||
        Object.values(checklist).length<5||Object.values(checklist).some(v=>v!==true)||
        fields.rehearsalCompleted!=='true'||
        !Number.isFinite(duration)||duration<1||duration>3600)
        throw Object.assign(Error('SUBMISSION_STEPS_INCOMPLETE'),{status:400});
      const title=String(story.title||story.storyTitle||'Persembahan Hikayat').trim().slice(0,120);
      const file=files.mediaFile;
      key='misi4/'+user.organization_id+'/'+user.id+'/'+randomUUID()+TYPES.get(file.mime).ext;
      await storage.client.send(new PutObjectCommand({
        Bucket:storage.bucket,Key:key,Body:createReadStream(file.path),
        ContentLength:file.size,ContentType:file.mime,
        Metadata:{category:'misi4',visibility:'private'}
      }));
      // No one may claim a submission before the private storage accepts it.
      const client=await db.connect();
      try{
        await client.query('BEGIN');
        // Lock the pupil account so concurrent submissions cannot use the
        // same version number. Do not lock an aggregate SELECT.
        const locked=await client.query('SELECT id FROM hn_users WHERE id=$1 AND organization_id=$2 AND active=true FOR UPDATE',
          [user.id,user.organization_id]);
        if(!locked.rows.length)throw Error('STUDENT_ACCOUNT_UNAVAILABLE');
        const previous=await client.query(
          'SELECT coalesce(max(version),0)::int AS version FROM hn_misi4_submissions WHERE organization_id=$1 AND student_id=$2',
          [user.organization_id,user.id]
        );
        const version=previous.rows[0].version+1;
        const referenceNo='HW-M4-'+new Date().getFullYear()+'-'+randomUUID().slice(0,12).toUpperCase();
        const result=await client.query(
          "INSERT INTO hn_misi4_submissions(organization_id,student_id,class_id,reference_no,version,story_title,mime_type,size_bytes,duration_seconds,storage_key,status,has_supporting_pdf) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Telah Dihantar',$11) RETURNING *",
          [user.organization_id,user.id,classId,referenceNo,version,title,file.mime,file.size,duration,key,false]
        );
        await audit(client,user,'submit_misi4_recording','misi4',result.rows[0].id);
        await client.query('COMMIT');
        const row=result.rows[0];
        // A true receipt is provided only after S3 upload AND DB commit.
        respond(res,201,{ok:true,message:'Rakaman berjaya dihantar kepada Guru.',
          submission:publicSubmission(row),xpAwardedNow:version===1?80:0,
          portalSummary:{priorMissionsXp:0,priorMissionsCompleted:false,totalJourneyXp:80}});
        key=null;return true;
      }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
      finally{client.release();}
    }catch(error){
      respond(res,error.status||503,{ok:false,
        error:error.status?error.message:'UPLOAD_COULD_NOT_BE_CONFIRMED'});
      return true;
    }finally{
      if(data?.directory)await rm(data.directory,{recursive:true,force:true}).catch(()=>{});
      if(key)await storage.client.send(new DeleteObjectCommand({Bucket:storage.bucket,Key:key})).catch(()=>{});
    }
  }
  if(path==='/api/teacher/misi4/submissions'&&method==='GET'){
    if(!teacher){respond(res,403,{ok:false,error:'GURU_REQUIRED'});return true;}
    const r=await db.query(
      "SELECT s.id,s.reference_no,s.version,s.student_id,s.story_title,s.mime_type,s.size_bytes,s.duration_seconds,s.status,s.submitted_at,s.review_comment,s.has_supporting_pdf,u.display_name AS student_name,c.name AS class_name FROM hn_misi4_submissions s JOIN hn_users u ON u.id=s.student_id JOIN hn_class_members cm ON cm.student_id=u.id JOIN hn_classes c ON c.id=cm.class_id WHERE s.organization_id=$1 AND c.organization_id=$1 AND c.teacher_id=$2 AND u.active=true ORDER BY s.submitted_at DESC LIMIT 500",
      [user.organization_id,user.id]);
    respond(res,200,{ok:true,submissions:r.rows.map(row=>({...publicSubmission(row),className:row.class_name}))});
    return true;
  }
  if(/^\/api\/(teacher\/)?misi4\/media\/[0-9a-f-]{36}$/.test(path)&&method==='GET'){
    if(!teacher&&!me){respond(res,403,{ok:false,error:'FORBIDDEN'});return true;}
    const id=path.split('/').at(-1);
    const params=teacher?[id,user.organization_id,user.id]:[id,user.organization_id,user.id];
    const query=teacher
      ?"SELECT s.storage_key,s.mime_type FROM hn_misi4_submissions s JOIN hn_class_members cm ON cm.student_id=s.student_id JOIN hn_classes c ON c.id=cm.class_id WHERE s.id=$1 AND s.organization_id=$2 AND c.organization_id=$2 AND c.teacher_id=$3"
      :"SELECT s.storage_key,s.mime_type FROM hn_misi4_submissions s WHERE s.id=$1 AND s.organization_id=$2 AND s.student_id=$3";
    const r=await db.query(query,params);
    if(!r.rows.length){respond(res,404,{ok:false,error:'VIDEO_NOT_FOUND'});return true;}
    const storage=s3();
    if(!storage){respond(res,503,{ok:false,error:'STORAGE_NOT_CONFIGURED'});return true;}
    const url=await playUrl(storage,r.rows[0].storage_key,r.rows[0].mime_type);
    respond(res,200,{ok:true,url,expiresSeconds:120});return true;
  }
  if(path==='/api/teacher/misi4/review'&&method==='POST'){
    if(!teacher){respond(res,403,{ok:false,error:'GURU_REQUIRED'});return true;}
    const body=await bodyJson(req);
    if(!validUuid(body.submissionId)||!['Dalam Semakan','Selesai Disemak','Perlu Penambahbaikan'].includes(body.status)||
      typeof body.comment!=='string'||body.comment.trim().length<10||body.comment.length>1500){
      respond(res,400,{ok:false,error:'INVALID_VIDEO_REVIEW'});return true;
    }
    const r=await db.query(
      "UPDATE hn_misi4_submissions s SET status=$1,review_comment=$2,reviewer_id=$3,reviewed_at=now() FROM hn_class_members cm JOIN hn_classes c ON c.id=cm.class_id WHERE s.id=$4 AND s.organization_id=$5 AND cm.student_id=s.student_id AND c.id=cm.class_id AND c.organization_id=$5 AND c.teacher_id=$3 RETURNING s.id,s.reference_no,s.status",
      [body.status,body.comment.trim(),user.id,body.submissionId,user.organization_id]
    );
    if(!r.rows.length){respond(res,404,{ok:false,error:'VIDEO_NOT_FOUND'});return true;}
    await audit(db,user,'review_misi4_recording','misi4',body.submissionId);
    respond(res,200,{ok:true,submission:r.rows[0]});return true;
  }
  if(path.startsWith('/api/misi4/')||path.startsWith('/api/teacher/misi4/')){
    respond(res,404,{ok:false,error:'NOT_FOUND'});return true;
  }
  return false;
}
