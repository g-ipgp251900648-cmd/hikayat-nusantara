/* Private Misi 4 video storage: S3-compatible backend proxy. */
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {audit} from './db.js';
const MAX_VIDEO=40*1024*1024;
const hash=v=>createHash('sha256').update(v).digest('hex');
const hmac=(k,v)=>createHmac('sha256',k).update(v).digest();
function config(){
  const get=x=>process.env['HN_VIDEO_S3_'+x];
  if(!['ENDPOINT','REGION','BUCKET','ACCESS_KEY_ID','SECRET_ACCESS_KEY'].every(get))return null;
  let endpoint;
  try{endpoint=new URL(get('ENDPOINT'));}catch{return null;}
  if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)return null;
  if(!/^[\w.-]{3,63}$/.test(get('BUCKET')))return null;
  return {endpoint,region:get('REGION'),bucket:get('BUCKET'),access:get('ACCESS_KEY_ID'),secret:get('SECRET_ACCESS_KEY')};
}
function location(c,key){
  const url=new URL(c.endpoint.origin);
  url.pathname=c.endpoint.pathname.replace(/\/+$/,'')+'/'+[c.bucket,...key.split('/')].map(encodeURIComponent).join('/');
  return url;
}
async function objectRequest(c,method,key,data=null,mime=null,range=null){
  const url=location(c,key),timestamp=new Date().toISOString().replace(/[:-]|\.\d{3}/g,'');
  const date=timestamp.slice(0,8),payload=hash(data||'');
  const headers={host:url.host,'x-amz-content-sha256':payload,'x-amz-date':timestamp};
  if(mime)headers['content-type']=mime;
  if(range)headers.range=range;
  const keys=Object.keys(headers).sort(),signed=keys.join(';');
  const canonical=method+'\n'+url.pathname+'\n\n'+keys.map(k=>k+':'+headers[k]+'\n').join('')+'\n'+signed+'\n'+payload;
  const scope=date+'/'+c.region+'/s3/aws4_request';
  const secret=hmac(hmac(hmac(hmac('AWS4'+c.secret,date),c.region),'s3'),'aws4_request');
  const toSign='AWS4-HMAC-SHA256\n'+timestamp+'\n'+scope+'\n'+hash(canonical);
  const authorization='AWS4-HMAC-SHA256 Credential='+c.access+'/'+scope+
    ', SignedHeaders='+signed+', Signature='+createHmac('sha256',secret).update(toSign).digest('hex');
  delete headers.host;
  return fetch(url,{method,headers:{...headers,authorization},...(data?{body:data}:{}),
    signal:AbortSignal.timeout(90000),redirect:'error'});
}
function result(res,status,body){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(body));
}
const error=(res,status,code)=>result(res,status,{ok:false,error:code});
async function bytes(req){
  const expected=Number(req.headers['content-length']);
  if(!Number.isSafeInteger(expected)||expected<1024||expected>MAX_VIDEO)
    throw Object.assign(Error('VIDEO_SIZE_INVALID'),{status:413});
  let len=0;const chunks=[];
  for await(const chunk of req){
    len+=chunk.length;
    if(len>MAX_VIDEO)throw Object.assign(Error('VIDEO_TOO_LARGE'),{status:413});
    chunks.push(chunk);
  }
  if(len!==expected)throw Object.assign(Error('VIDEO_SIZE_MISMATCH'),{status:400});
  return Buffer.concat(chunks,len);
}
function magic(bytes,mime){
  if(bytes.length<1024)return false;
  return mime==='video/webm'?
    bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])):
    mime==='video/mp4'&&bytes.toString('ascii',4,8)==='ftyp';
}
async function findSubmission(db,user,id,teacher){
  const sql=teacher?
    "SELECT s.* FROM hn_misi4_submissions s JOIN hn_classes c ON c.id=s.class_id JOIN hn_users u ON u.id=s.student_id WHERE s.id=$1 AND s.organization_id=$2 AND c.organization_id=$2 AND c.teacher_id=$3 AND u.organization_id=$2":
    "SELECT * FROM hn_misi4_submissions WHERE id=$1 AND organization_id=$2 AND student_id=$3";
  const r=await db.query(sql,[id,user.organization_id,user.id]);
  return r.rows[0]||null;
}
export async function handleMisi4Api(db,user,req,res,pathname){
  if(!pathname.startsWith('/api/misi4/'))return false;
  const c=config(),method=req.method;
  if(pathname==='/api/misi4/health'&&method==='GET'){
    result(res,200,{ok:true,storageConfigured:!!c,maxUploadBytes:MAX_VIDEO});return true;
  }
  if(!c){error(res,503,'VIDEO_STORAGE_NOT_CONFIGURED');return true;}
  if(pathname==='/api/misi4/submit'&&method==='POST'&&user.role==='murid'){
    const mime=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
    if(!['video/webm','video/mp4'].includes(mime)){error(res,415,'VIDEO_FORMAT_UNSUPPORTED');return true;}
    const classes=await db.query(
      "SELECT c.id FROM hn_class_members cm JOIN hn_classes c ON c.id=cm.class_id WHERE cm.student_id=$1 AND c.organization_id=$2 ORDER BY cm.joined_at LIMIT 1",
      [user.id,user.organization_id]
    );
    if(!classes.rows.length){error(res,403,'CLASS_ENROLLMENT_REQUIRED');return true;}
    const total=await db.query(
      'SELECT count(*)::int AS count FROM hn_misi4_submissions WHERE organization_id=$1 AND student_id=$2',
      [user.organization_id,user.id]
    );
    if(total.rows[0].count>=8){error(res,409,'VIDEO_SUBMISSION_LIMIT_REACHED');return true;}
    let data;
    try{data=await bytes(req);}
    catch(e){error(res,e.status||400,'VIDEO_UPLOAD_INVALID');return true;}
    if(!magic(data,mime)){error(res,415,'VIDEO_CONTENT_INVALID');return true;}
    const id=randomUUID(),key='private/misi4/'+user.organization_id+'/'+user.id+'/'+id+
      (mime==='video/mp4'?'.mp4':'.webm');
    let upload;
    try{upload=await objectRequest(c,'PUT',key,data,mime);}
    catch{error(res,503,'VIDEO_STORAGE_UNAVAILABLE');return true;}
    await upload.body?.cancel?.().catch(()=>{});
    if(!upload.ok){error(res,503,'VIDEO_STORAGE_WRITE_FAILED');return true;}
    try{
      await db.query(
        'INSERT INTO hn_misi4_submissions(id,organization_id,class_id,student_id,storage_key,mime_type,size_bytes) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [id,user.organization_id,classes.rows[0].id,user.id,key,mime,data.length]
      );
    }catch(e){
      try{const d=await objectRequest(c,'DELETE',key);await d.body?.cancel?.();}catch{}
      throw e;
    }
    await audit(db,user,'submit_misi4_video','misi4_video',id);
    result(res,201,{ok:true,submission:{id,referenceNo:id.replace(/-/g,''),
      missionId:4,status:'Telah Dihantar',createdAt:new Date().toISOString()}});
    return true;
  }
  if(pathname==='/api/misi4/state'&&method==='GET'&&user.role==='murid'){
    const r=await db.query(
      'SELECT id,status,created_at FROM hn_misi4_submissions WHERE organization_id=$1 AND student_id=$2 ORDER BY created_at DESC LIMIT 20',
      [user.organization_id,user.id]
    );
    result(res,200,{ok:true,submissions:r.rows.map(x=>({
      id:x.id,referenceNo:x.id.replace(/-/g,''),
      status:x.status==='submitted'?'Telah Dihantar':x.status==='reviewed'?'Disemak Guru':'Perlu Penambahbaikan',
      createdAt:x.created_at
    }))});return true;
  }
  if(pathname==='/api/misi4/teacher/submissions'&&method==='GET'&&user.role==='guru'){
    const sql="SELECT s.id,s.student_id,s.class_id,s.mime_type,s.size_bytes,s.status,s.created_at,"+
      "p.display_name AS student_name,p.login_id,c.name AS class_name FROM hn_misi4_submissions s "+
      "JOIN hn_classes c ON c.id=s.class_id JOIN hn_users p ON p.id=s.student_id "+
      "WHERE s.organization_id=$1 AND c.organization_id=$1 AND c.teacher_id=$2 AND p.organization_id=$1 "+
      "ORDER BY s.created_at DESC LIMIT 200";
    const r=await db.query(sql,[user.organization_id,user.id]);
    result(res,200,{ok:true,submissions:r.rows});return true;
  }
  const m=/^\/api\/misi4\/media\/([0-9a-f-]{36})$/.exec(pathname);
  if(m&&method==='GET'&&['murid','guru'].includes(user.role)){
    const sub=await findSubmission(db,user,m[1],user.role==='guru');
    if(!sub){error(res,404,'VIDEO_NOT_FOUND');return true;}
    const range=req.headers.range;
    if(range&&(!/^bytes=\d*-\d*$/.test(range)||range.length>64)){
      error(res,416,'VIDEO_RANGE_INVALID');return true;
    }
    let remote;
    try{remote=await objectRequest(c,'GET',sub.storage_key,null,null,range||null);}
    catch{error(res,503,'VIDEO_STORAGE_UNAVAILABLE');return true;}
    if(!remote.ok||!remote.body){
      await remote.body?.cancel?.().catch(()=>{});
      error(res,remote.status===416?416:503,'VIDEO_READ_FAILED');return true;
    }
    const headers={'Content-Type':sub.mime_type,'Cache-Control':'private, no-store',
      'Content-Disposition':'inline','X-Content-Type-Options':'nosniff',
      'Accept-Ranges':remote.headers.get('accept-ranges')||'bytes'};
    for(const h of ['content-range','content-length']){
      const value=remote.headers.get(h);if(value)headers[h]=value;
    }
    res.writeHead(remote.status,headers);
    Readable.fromWeb(remote.body).on('error',()=>res.destroy()).pipe(res);
    return true;
  }
  if(pathname==='/api/misi4/teacher/review'&&method==='POST'&&user.role==='guru'){
    let data;
    try{
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>2048)throw Error('invalid');chunks.push(chunk);}
      data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }catch{error(res,400,'INVALID_VIDEO_REVIEW');return true;}
    if(!/^[0-9a-f-]{36}$/i.test(data?.submissionId||'')||
       !['reviewed','revision_requested'].includes(data?.status)){
      error(res,400,'INVALID_VIDEO_REVIEW');return true;
    }
    const sub=await findSubmission(db,user,data.submissionId,true);
    if(!sub){error(res,404,'VIDEO_NOT_FOUND');return true;}
    const r=await db.query(
      'UPDATE hn_misi4_submissions SET status=$1,updated_at=now() WHERE id=$2 AND organization_id=$3 RETURNING id,status',
      [data.status,sub.id,user.organization_id]
    );
    await audit(db,user,'review_misi4_video','misi4_video',sub.id);
    result(res,200,{ok:true,submission:r.rows[0]});return true;
  }
  error(res,404,'UNKNOWN_MISI4_ENDPOINT');return true;
}
