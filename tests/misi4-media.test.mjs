import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {handleMisi4Api} from '../auth/misi4-media.js';
const teacher={id:'a14e7490-c9ba-44da-a8c6-581e7a6b6c33',organization_id:'ee0dabbe-b2d3-42d4-a8ea-0d93f2a8c03e',role:'guru'};
const pupil={...teacher,id:'f1d02b4e-66ec-4a90-a9f0-0c40dcc6cf16',role:'murid'};
function response(){
  return {status:null,data:null,headers:null,writeHead(code,headers){this.status=code;this.headers=headers;},
    end(value){this.data=JSON.parse(String(value));}};
}
function request(path,method='GET',buf=null,mime='video/webm'){
  const r=Readable.from(buf?[buf]:[]);
  r.method=method;r.url=path;
  r.headers={...(buf?{'content-type':mime,'content-length':String(buf.length)}:{})};
  return r;
}
function db(){
  const records=[];
  return {
    records,calls:[],
    async query(sql,args){
      this.calls.push({sql,args});
      if(sql.includes('SELECT c.id FROM hn_class_members'))return {rows:[{id:'13337020-d617-45c2-8d6d-8f6100ee7ef5'}]};
      if(sql.includes('count(*)::int AS count FROM hn_misi4_submissions'))return {rows:[{count:records.length}]};
      if(sql.includes('INSERT INTO hn_misi4_submissions')){
        records.push({id:args[0],storage_key:args[4],size_bytes:args[6]});
        return {rows:[],rowCount:1};
      }
      if(sql.includes('SELECT s.* FROM hn_misi4_submissions'))return {rows:[]}; // non-owning teacher
      if(sql.includes('SELECT * FROM hn_misi4_submissions'))return {rows:[]};
      if(sql.includes('FROM hn_misi4_submissions')&&sql.includes('ORDER BY'))return {rows:[]};
      return {rows:[],rowCount:1}; // audit insert
    }
  };
}
function setEnv(){
  for(const [key,val] of Object.entries({
    HN_VIDEO_S3_ENDPOINT:'https://storage.example.invalid',
    HN_VIDEO_S3_REGION:'auto',HN_VIDEO_S3_BUCKET:'private-school-videos',
    HN_VIDEO_S3_ACCESS_KEY_ID:'example-access',HN_VIDEO_S3_SECRET_ACCESS_KEY:'example-test-secret'
  }))process.env[key]=val;
}
function clearEnv(){
  for(const key of ['HN_VIDEO_S3_ENDPOINT','HN_VIDEO_S3_REGION',
    'HN_VIDEO_S3_BUCKET','HN_VIDEO_S3_ACCESS_KEY_ID','HN_VIDEO_S3_SECRET_ACCESS_KEY'])
    delete process.env[key];
}
test('Misi 4 never claims uploaded when object storage is missing',async()=>{
  clearEnv();const res=response();
  await handleMisi4Api(db(),pupil,request('/api/misi4/submit','POST'),res,'/api/misi4/submit');
  assert.equal(res.status,503);
  assert.equal(res.data.error,'VIDEO_STORAGE_NOT_CONFIGURED');
});
test('Misi 4 only issues a receipt after private object storage accepted the video',async()=>{
  setEnv();
  const original=globalThis.fetch,requests=[];
  globalThis.fetch=async(url,opts)=>{
    requests.push({url:String(url),opts});
    return {ok:true,status:200,body:null};
  };
  try{
    const blob=Buffer.alloc(1536,0);
    Buffer.from([0x1a,0x45,0xdf,0xa3]).copy(blob,0);
    const store=db(),res=response();
    await handleMisi4Api(store,pupil,request('/api/misi4/submit','POST',blob),
      res,'/api/misi4/submit');
    assert.equal(res.status,201,JSON.stringify(res.data));
    assert.equal(res.data.ok,true);
    assert.equal(res.data.submission.status,'Telah Dihantar');
    assert.equal(store.records.length,1);
    assert.match(store.records[0].storage_key,/^private\/misi4\//);
    assert.equal(requests.length,1);
    assert.equal(requests[0].opts.method,'PUT');
    assert.ok(requests[0].url.startsWith('https://storage.example.invalid/private-school-videos/private/misi4/'));
    assert.match(requests[0].opts.headers.authorization,/^AWS4-HMAC-SHA256 Credential=/);
    assert.ok(!JSON.stringify(res.data).includes('storage_key'));
    const unauthorized=response();
    await handleMisi4Api(store,teacher,request('/api/misi4/media/'+store.records[0].id),
      unauthorized,'/api/misi4/media/'+store.records[0].id);
    assert.equal(unauthorized.status,404);
  }finally{globalThis.fetch=original;clearEnv();}
});
test('Misi 4 rejects an invalid recording before any upload',async()=>{
  setEnv();
  const original=globalThis.fetch;
  globalThis.fetch=()=>{throw Error('Never upload invalid bytes');};
  try{
    const bad=Buffer.alloc(2048,0);
    const res=response();
    await handleMisi4Api(db(),pupil,request('/api/misi4/submit','POST',bad),res,'/api/misi4/submit');
    assert.equal(res.status,415);
    assert.equal(res.data.error,'VIDEO_CONTENT_INVALID');
  }finally{globalThis.fetch=original;clearEnv();}
});