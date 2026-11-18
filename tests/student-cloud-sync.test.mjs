import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { setTimeout as sleep } from 'node:timers/promises';

const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
function fakeStorage(initial={}){
  const map=new Map(Object.entries(initial));
  return {
    getItem(key){return map.get(key)??null;},
    setItem(key,val){map.set(key,String(val));},
    removeItem(key){map.delete(key);},
    contents:map
  };
}
function loadCloud(storage,fetcher) {
  const window={addEventListener(){}};
  const document={querySelector(){return null;},addEventListener(){}};
  vm.runInNewContext(source('student-cloud-sync.js'),{
    window,document,localStorage:storage,fetch:fetcher,AbortController,
    setTimeout,clearTimeout,console
  });
  return window.hnCloudDrafts;
}
function practice(){
  return {
    completed:[false,false,false,false],
    sequence:[0,1,2,3,4],readingAnswers:['1','2','1'],
    attempts:[{count:1,history:[]},{count:0,history:[]},{count:0,history:[]},{count:0,history:[]}],
    character:'Melur',setting:'desa',event:'kisah',chosenPhrases:[],writtenStory:'',
    languageAnswers:['','','',''],
    performance:{opening:'',middle:'',ending:'',format:'audio',practised:false}
  };
}
test('cloud sync module is loaded before interactive student activities',()=>{
  const html=source('index.html');
  assert.ok(html.indexOf('src="student-cloud-sync.js"')<html.indexOf('src="student-activities.js"'));
  for(const file of ['build.mjs','server.js'])assert.match(source(file),/student-cloud-sync\.js/);
  const student=source('student-activities.js');
  assert.match(student,/await window\.hnCloudDrafts\?\.prepare\(account\.id,STORAGE_KEY\)/);
  assert.match(student,/window\.hnCloudDrafts\?\.queue\(index,state\)/);
});
test('online draft is sent as a DRAFT with explicit mission revision and not certified',async()=>{
  const requests=[];
  const fetcher=async(url,opts={})=>{
    if(url==='/api/student/progress')return new Response(JSON.stringify({ok:true,progress:[]}),{status:200});
    requests.push({url,opts});
    return new Response(JSON.stringify({ok:true,missionId:1,state:'draft',revision:1}),{status:200});
  };
  const storage=fakeStorage();
  const cloud=loadCloud(storage,fetcher);
  await cloud.prepare('studentA','my-progress');
  cloud.queue(0,practice());
  await sleep(850);
  assert.equal(requests.length,1);
  assert.equal(requests[0].url,'/api/student/progress/1');
  assert.equal(requests[0].opts.method,'PUT');
  const data=JSON.parse(requests[0].opts.body);
  assert.equal(data.revision,0);
  assert.equal(data.checkpoint.schema,1);
  assert.equal(data.checkpoint.data.completed,false);
  assert.equal(data.checkpoint.data.readingAnswers[0],'1');
  assert.equal(storage.getItem('hn-draft-outbox-studentA'),'{}');
  assert.equal(JSON.parse(storage.getItem('hn-draft-meta-studentA')).revisions['1'],1);
});
test('server checkpoint is restored on a new device without local progress',async()=>{
  const remote=[{
    mission_id:2,revision:3,
    checkpoint:{schema:1,data:{
      completed:true,attempts:{count:2,history:[]},character:'Kenanga',
      setting:'rumah klasik',event:'menemui naskhah',
      chosenPhrases:['sinar keemasan'],writtenStory:'Cerita yang telah disimpan'
    }}
  }];
  const storage=fakeStorage();
  const cloud=loadCloud(storage,async()=>new Response(JSON.stringify({ok:true,progress:remote}),{status:200}));
  await cloud.prepare('studentB','my-progress');
  const restored=JSON.parse(storage.getItem('my-progress'));
  assert.equal(restored.writtenStory,'Cerita yang telah disimpan');
  assert.equal(restored.completed[1],true);
  assert.equal(restored.attempts[1].count,2);
  assert.equal(JSON.parse(storage.getItem('hn-draft-meta-studentB')).revisions['2'],3);
});
test('if upload fails, local pending copy survives for retry',async()=>{
  const storage=fakeStorage();
  const fetcher=async(url)=>{
    if(url==='/api/student/progress')return new Response(JSON.stringify({progress:[]}),{status:200});
    throw Error('offline');
  };
  const cloud=loadCloud(storage,fetcher);
  await cloud.prepare('studentC','my-progress');
  cloud.queue(3,practice());
  await sleep(850);
  const outbox=JSON.parse(storage.getItem('hn-draft-outbox-studentC'));
  assert.ok(outbox['4']);
  assert.equal(outbox['4'].checkpoint.schema,1);
  assert.equal(outbox['4'].checkpoint.data.performance.format,'audio');
});
