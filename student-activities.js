/** Hikayat Nusantara: misi pembelajaran dengan simpanan peranti dan ringkasan kemajuan berpusat. */
(async function studentActivities(){
  "use strict";
  const dashboard=document.getElementById("murid-view");
  if(!dashboard)return;
  const account=await window.hnGetSession?.().catch(()=>null);
  if(!account||account.role!=="murid"||account.mustChangePassword)return;
  // A different greeting is rendered for every authenticated pupil. The
  // account name comes only from the server session; never from URL or storage.
  const pupilName=String(account.name||'').replace(/\s+/g,' ').trim().slice(0,100)||'Pengembara Muda';
  const welcome=document.getElementById('hn-student-welcome');
  if(welcome)welcome.textContent='Selamat Datang, '+pupilName+'!';
  const welcomeSummary=document.getElementById('hn-student-welcome-summary');
  if(welcomeSummary)welcomeSummary.textContent=pupilName+'!';
  const topName=document.getElementById('hn-student-top-name');
  if(topName){topName.textContent=pupilName;topName.title=pupilName;}
  const avatar=document.getElementById('hn-student-avatar');
  if(avatar)avatar.textContent=pupilName.split(' ').filter(Boolean).slice(0,2)
    .map(part=>part[0]?.toLocaleUpperCase('ms-MY')||'').join('')||'M';
  const LEGACY_STORAGE_KEY="hikayat-nusantara-murid-demo-v2";
  const STORAGE_KEY="hikayat-nusantara-murid-v3-"+account.id;
  // Old browser data cannot be assigned safely to a named pupil without confirmation.
  try {
    if(!localStorage.getItem(STORAGE_KEY)&&localStorage.getItem(LEGACY_STORAGE_KEY)){
      const note=document.createElement("div");
      note.className="hn-legacy-import-note";
      note.style.cssText="padding:14px;margin:12px 0;border:1px solid #d4c28a;background:#fff8e7;border-radius:10px;font-size:12px";
      const text=document.createElement("p");
      text.textContent="Rekod latihan lama ditemui pada peranti ini. Import hanya jika rekod ini memang milik anda; jika berkongsi peranti, sila semak dengan guru.";
      const button=document.createElement("button");button.type="button";button.textContent="Import rekod latihan saya";
      button.style.cssText="padding:9px;border-radius:8px;border:1px solid #9fb1a0;background:#e7f0e7;cursor:pointer";
      button.addEventListener("click",()=>{
        if(!confirm("Pastikan rekod ini milik anda. Import ke akaun ini?"))return;
        localStorage.setItem(STORAGE_KEY,localStorage.getItem(LEGACY_STORAGE_KEY));
        location.reload();
      });
      note.append(text,button);
      dashboard.querySelector(".dash-content")?.prepend(note);
    }
  }catch(error){console.warn("Import rekod lama tidak tersedia.");}

  const story=[
    "Pada suatu petang, Melur berjalan di tepi sungai Desa Warisan. Di celah akar pokok tua, dia ternampak sebuah pelita tembaga yang berdebu.",
    "Melur membawa pelita itu kepada Tok Penghulu. Beliau bercerita bahawa pelita tersebut pernah menjadi tanda panduan penduduk ketika kampung dilanda kabus tebal.",
    "Malam itu, angin bertiup kencang dan jambatan kayu tidak kelihatan dalam kabus. Melur teringat pesan Tok Penghulu supaya menjaga cahaya warisan.",
    "Dengan bantuan rakan-rakannya, Melur membersihkan pelita lalu menyalakannya di balai kampung. Cahayanya membantu penduduk menemukan jalan pulang.",
    "Sejak hari itu, penduduk bergilir-gilir menjaga pelita. Melur sedar bahawa warisan bukan sekadar barang lama, tetapi lambang semangat saling membantu."
  ];
  const events=[
    "Melur menjumpai pelita tembaga di tepi sungai.",
    "Tok Penghulu menceritakan sejarah pelita.",
    "Kabus tebal menyelubungi kampung pada waktu malam.",
    "Melur dan rakan-rakan menyalakan pelita di balai.",
    "Penduduk bergilir-gilir menjaga pelita warisan."
  ];
  const comprehension=[
    {q:"Di manakah Melur menjumpai pelita?",a:["Di sawah padi","Di tepi sungai","Di perpustakaan"],correct:1,why:"Melur menemukan pelita di celah akar pokok tua berhampiran sungai."},
    {q:"Mengapakah pelita itu penting kepada penduduk?",a:["Menjadi tanda panduan ketika kabus","Untuk dijual di pasar","Sebagai hadiah pertandingan"],correct:0,why:"Cahaya pelita membantu penduduk mencari jalan."},
    {q:"Apakah nilai utama yang terdapat dalam cerita?",a:["Mementingkan diri sendiri","Berani tanpa berfikir","Kerjasama dan tanggungjawab"],correct:2,why:"Penduduk bekerjasama dan menjaga pelita secara bergilir-gilir."}
  ];
  const challenges=[
    {q:"Ungkapan manakah paling indah untuk menggambarkan waktu petang?",a:["Petang itu biasa sahaja.","Sinar keemasan menyelimuti desa yang permai.","Cuaca petang berlaku."],correct:1,why:"Ungkapan kedua menggunakan gambaran yang lebih hidup dan puitis."},
    {q:"Ayat manakah paling santun apabila meminta bantuan?",a:["Cepatlah buat kerja ini!","Awak mesti tolong saya sekarang.","Bolehkah kamu membantu saya, jika tidak keberatan?"],correct:2,why:"Permintaan yang sopan menghormati pendengar."},
    {q:"Pilih ungkapan yang sesuai untuk angin bertiup perlahan.",a:["Hembusan bayu menyapa dedaunan.","Angin sangat marah.","Angin tidak ada makna."],correct:0,why:"Hembusan bayu ialah ungkapan yang sesuai untuk angin lembut."},
    {q:"Ayat manakah menjelaskan perubahan watak dengan lebih menarik?",a:["Dia berubah.","Hatinya mula disinari keberanian selepas membantu penduduk.","Dia ada hati dan dia membantu."],correct:1,why:"Ayat kedua menggambarkan perubahan perasaan watak dengan jelas."}
  ];
  const phrases=["sinar keemasan","desa yang permai","hembusan bayu","pelita warisan","hati yang tulus"];
  const missions=[
    {name:"Jejak Naskhah Pusaka",icon:"📜",time:"10 minit",guide:"Baca dahulu. Susun peristiwa dari awal hingga akhir. Gunakan petunjuk masa dalam cerita.",xp:60},
    {name:"Balai Olah Hikayat",icon:"🪶",time:"15 minit",guide:"Pilih watak, latar dan peristiwa. Ubah suai cerita dengan sekurang-kurangnya dua ungkapan indah.",xp:90},
    {name:"Warisan Bahasa",icon:"✒️",time:"10 minit",guide:"Perhatikan kesantunan bahasa dan maksud ungkapan sebelum memilih jawapan.",xp:70},
    {name:"Persembahan Hikayat",icon:"🎭",time:"15 minit",guide:"Susun persembahan kepada permulaan, perkembangan dan pengakhiran. Cuba baca dengan nada yang sesuai.",xp:80}
  ];
  const empty=()=>({
    completed:[false,false,false,false],
    sequence:[2,0,4,1,3],
    readingAnswers:["","",""],
    character:"Melur",setting:"tepi sungai",event:"menemukan pelita lama",
    chosenPhrases:[],
    writtenStory:"",
    languageAnswers:["","","",""],
    performance:{opening:"",middle:"",ending:"",format:"audio",practised:false},
    attempts:Array.from({length:4},()=>({count:0,history:[]}))
  });
  function load(){
    const base=empty();
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw)return base;
      const parsed=JSON.parse(raw);
      if(!parsed||typeof parsed!=="object")return base;
      if(Array.isArray(parsed.completed))base.completed=base.completed.map((_,i)=>parsed.completed[i]===true);
      if(Array.isArray(parsed.sequence)&&parsed.sequence.length===5&&[...parsed.sequence].sort().join()==="0,1,2,3,4")
        base.sequence=[...parsed.sequence];
      if(Array.isArray(parsed.readingAnswers))base.readingAnswers=base.readingAnswers.map((_,i)=>String(parsed.readingAnswers[i]??"").slice(0,1));
      for(const k of ["character","setting","event"])if(typeof parsed[k]==="string")base[k]=parsed[k].slice(0,120);
      if(Array.isArray(parsed.chosenPhrases))base.chosenPhrases=parsed.chosenPhrases.filter(x=>phrases.includes(x)).slice(0,5);
      if(typeof parsed.writtenStory==="string")base.writtenStory=parsed.writtenStory.slice(0,2500);
      if(Array.isArray(parsed.languageAnswers))base.languageAnswers=base.languageAnswers.map((_,i)=>String(parsed.languageAnswers[i]??"").slice(0,1));
      if(Array.isArray(parsed.attempts))base.attempts=base.attempts.map((entry,i)=>{
        const other=parsed.attempts[i];if(!other||typeof other!=="object")return entry;
        const count=Math.max(0,Math.min(100000,Math.trunc(Number(other.count)||0)));
        const history=Array.isArray(other.history)?other.history.slice(-30).filter(x=>x&&typeof x==="object"&&Number.isFinite(Number(x.score))&&Number.isFinite(Number(x.total))&&Number(x.total)>0).map(x=>({number:Math.max(1,Math.trunc(Number(x.number)||1)),score:Number(x.score),total:Number(x.total),percent:Math.min(100,Math.max(0,Math.round(Number(x.score)/Number(x.total)*100))),success:x.success===true,at:String(x.at||"").slice(0,36)})):[];
        return {count:Math.max(count,history.at(-1)?.number||0),history};
      });
      if(parsed.performance&&typeof parsed.performance==="object"){
        for(const k of ["opening","middle","ending"])if(typeof parsed.performance[k]==="string")base.performance[k]=parsed.performance[k].slice(0,900);
        base.performance.format=parsed.performance.format==="video"?"video":"audio";
        base.performance.practised=parsed.performance.practised===true;
      }
    }catch(e){console.warn("Rekod latihan belum dapat dibaca.",e);}
    return base;
  }
  const state=load();

  // Only bounded attempt counts / completion are synced; no story drafts,
  // journal text, audio, video or student-entered personal information is sent.
  const cloud={
    ready:false,busy:false,pending:false,revisions:[0,0,0,0],
    existing:[false,false,false,false],signatures:[null,null,null,null],timer:null
  };
  const summaryFor=i=>{
    const entry=state.attempts[i];
    const last=entry.history.at(-1);
    return {
      kind:'practice-v1',completed:state.completed[i]===true,
      attemptCount:Math.max(0,Math.min(100000,entry.count)),
      lastScore:last&&Number.isFinite(last.score)?last.score:null,
      lastTotal:last&&Number.isFinite(last.total)?last.total:null
    };
  };
  const statusText=text=>{
    const node=document.getElementById('quest-cloud-status');
    if(node)node.textContent=text;
    const chip=dashboard.querySelector('.system-status-chip');
    if(chip){
      if(text.includes('berjaya disimpan'))chip.textContent='KEMAJUAN DISIMPAN';
      else if(/terganggu|Tidak dapat|belum dihantar|berubah/.test(text))chip.textContent='CUBA SEGERAK SEMULA';
      else chip.textContent='MEMUATKAN KEMAJUAN';
    }
  };
  function queueCloud(){
    if(!cloud.ready)return;
    cloud.pending=true;
    if(cloud.timer)clearTimeout(cloud.timer);
    cloud.timer=setTimeout(()=>{cloud.timer=null;void flushCloud();},1000);
  }
  async function flushCloud(){
    if(!cloud.ready||cloud.busy)return;
    cloud.busy=true;cloud.pending=false;
    try{
      for(let i=0;i<4;i++){
        const summary=summaryFor(i);
        const signature=JSON.stringify(summary);
        if(signature===cloud.signatures[i])continue;
        if(!summary.completed&&summary.attemptCount===0&&!cloud.existing[i])continue;
        const result=await window.hnApiRequest('/api/student/progress/'+(i+1),{
          method:'PUT',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({revision:cloud.revisions[i],checkpoint:summary})
        });
        if(!result.ok){
          if(result.status===409){
            const refreshed=await window.hnApiRequest('/api/student/progress');
            if(refreshed.ok){
              for(const row of refreshed.data.progress||[]){
                if(row.mission_id>=1&&row.mission_id<=4){
                  const j=row.mission_id-1;
                  cloud.revisions[j]=row.revision;
                  cloud.existing[j]=true;
                  const remote=row.checkpoint;
                  if(remote?.kind==='practice-v1'&&
                     JSON.stringify(remote)===JSON.stringify(summaryFor(j)))
                    cloud.signatures[j]=JSON.stringify(summaryFor(j));
                }
              }
              statusText('Rekod telah berubah. Sila segerakkan semula.');
              cloud.pending=true;
            }
          }else statusText('Kemajuan belum dihantar. Rekod latihan masih ada pada peranti.');
          return;
        }
        cloud.revisions[i]=result.data.revision;
        cloud.existing[i]=true;
        cloud.signatures[i]=signature;
        if(JSON.stringify(summaryFor(i))!==signature)cloud.pending=true;
      }
      statusText('✓ Kemajuan latihan berjaya disimpan.');
    }catch{
      statusText('Sambungan terganggu. Cuba segerakkan semula apabila internet pulih.');
    }finally{
      cloud.busy=false;
      if(cloud.pending)queueCloud();
    }
  }
  async function initializeCloud(){
    statusText('Memuatkan kemajuan anda...');
    try{
      const result=await window.hnApiRequest('/api/student/progress');
      if(!result.ok)throw Error('Progress endpoint unavailable');
      let restored=false;
      for(const row of result.data.progress||[]){
        if(!Number.isInteger(row.mission_id)||row.mission_id<1||row.mission_id>4)continue;
        const i=row.mission_id-1;
        cloud.revisions[i]=row.revision;
        cloud.existing[i]=true;
        const remote=row.checkpoint;
        if(remote?.kind!=='practice-v1')continue;
        const oldCount=state.attempts[i].count;
        const count=Number(remote.attemptCount);
        if(remote.completed===true&&!state.completed[i]){
          state.completed[i]=true;restored=true;
        }
        if(Number.isSafeInteger(count)&&count>oldCount&&count<=100000){
          state.attempts[i].count=count;
          const score=Number(remote.lastScore),total=Number(remote.lastTotal);
          if(remote.lastScore!==null&&remote.lastTotal!==null&&
             Number.isFinite(score)&&Number.isFinite(total)&&total>0&&score>=0&&score<=total){
            state.attempts[i].history=[{
              number:count,score,total,percent:Math.round(score/total*100),
              success:remote.completed===true,at:String(row.updated_at||new Date().toISOString())
            }];
          }
          restored=true;
        }
        const canonical={
          kind:'practice-v1',completed:remote.completed===true,
          attemptCount:Number(remote.attemptCount)||0,
          lastScore:remote.lastScore??null,lastTotal:remote.lastTotal??null
        };
        if(JSON.stringify(summaryFor(i))===JSON.stringify(canonical)){
          cloud.signatures[i]=JSON.stringify(summaryFor(i));
        }
      }
      cloud.ready=true;
      if(restored){
        try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}
        updateProgress();
        window.dispatchEvent(new Event('hikayat:attempt'));
      }
      statusText('✓ Kemajuan anda sedia untuk diselaraskan.');
      queueCloud();
    }catch{
      // Retry on focus or reconnect without blocking offline practice.
      statusText('Tidak dapat menghubungi sistem. Rekod latihan masih ada pada peranti.');
    }
  }
  window.addEventListener('online',()=>cloud.ready?queueCloud():void initializeCloud());
  window.addEventListener('focus',()=>cloud.ready?queueCloud():void initializeCloud());

  window.getStudentAttemptStats=()=>state.attempts.map(({count,history},i)=>({mission:i+1,completed:state.completed[i],count,history:history.map(x=>({...x}))}));
  let activeMission=-1;
  let feedback="";
  let feedbackTone="note";
  function save(){
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      queueCloud();
      return true;
    }catch(e){
      console.warn("Storan peranti tidak tersedia. Data hanya kekal sepanjang paparan ini.",e);
      return false;
    }
  }
  const escapeHTML=(v)=>String(v).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const pick=(list,current)=>list.map(value=>`<option value="${escapeHTML(value)}" ${current===value?"selected":""}>${escapeHTML(value)}</option>`).join("");
  function status(message,tone="note"){feedback=message;feedbackTone=tone;}
  function invalidate(index){if(state.completed[index]){state.completed[index]=false;updateProgress();}save();}
  const counter=()=>state.completed.filter(Boolean).length;
  const totalXP=()=>state.completed.reduce((acc,done,i)=>acc+(done?missions[i].xp:0),0);
  function recordAttempt(index,score,total,success){
    const entry=state.attempts[index];if(!entry||entry.count>=100000)return;
    entry.count++;entry.history.push({number:entry.count,score,total,percent:Math.round(score/total*100),success,at:new Date().toISOString()});
    if(entry.history.length>30)entry.history.splice(0,entry.history.length-30);
    save();updateProgress();window.dispatchEvent(new Event("hikayat:attempt"));
  }

  const hud=document.createElement("section");
  hud.className="student-quest-hud";
  hud.setAttribute("aria-label","Kemajuan misi Desa Hikayat");
  hud.innerHTML=`
    <div class="student-quest-top">
      <div><span class="mini-label">✦ PELITA PEMBIMBING</span><h3>Empat Cabaran, Satu Hikayat!</h3><p>Pilih lokasi di peta, kemudian lengkapkan latihan interaktif.</p></div>
      <div class="student-pelita" aria-hidden="true">🏮</div>
      <div class="student-quest-score"><span id="quest-score">0/4</span><small>MISI LATIHAN</small><strong id="quest-xp">0 XP</strong></div>
    </div>
    <div class="student-quest-track"><span id="quest-bar" style="width:0%"></span></div>
    <div class="student-quest-actions">
      <button type="button" id="quest-guide">✨ Petunjuk Pelita</button>
      <button type="button" id="quest-continue">▶ Mula Misi 1</button>
      <button type="button" id="quest-reset">↺ Tetapkan semula latihan</button>
    </div>
    <p class="quest-privacy">Jawapan dan draf kekal pada peranti anda. Guru hanya melihat ringkasan kemajuan; markah latihan bukan markah rasmi.</p>
    <p id="quest-cloud-status" class="quest-privacy" role="status">Menyediakan kemajuan anda...</p>
    <button type="button" id="quest-sync-now">↻ Segerakkan Kemajuan</button>`;
  const map=document.getElementById("desa-hikayat-map");
  if(map)map.before(hud);

  const dialog=document.createElement("dialog");
  dialog.id="student-play-dialog";
  dialog.className="student-play-dialog";
  dialog.setAttribute("aria-label","Aktiviti pembelajaran Desa Hikayat");
  document.body.append(dialog);

  const helper=document.createElement("div");
  helper.className="student-helper";
  helper.hidden=true;
  helper.innerHTML=`<div class="student-helper-head"><span>🏮 Pelita Pembimbing</span><button type="button" aria-label="Tutup petunjuk" id="quest-helper-close">✕</button></div><p id="quest-helper-text"></p>`;
  dashboard.querySelector(".dash-content")?.append(helper);

  function showHelper(index=0){
    const guide=missions[index]?.guide||"Pilih lokasi kampung untuk membuka latihan.";
    const guideText=helper.querySelector("#quest-helper-text");
    if(guideText)guideText.textContent=guide;
    helper.hidden=false;
  }
  function updateProgress(){
    const done=counter(),xp=totalXP();
    const score=document.getElementById("quest-score");
    const xpEl=document.getElementById("quest-xp");
    const bar=document.getElementById("quest-bar");
    if(score)score.textContent=`${done}/4`;
    if(xpEl)xpEl.textContent=`${xp} XP`;
    if(bar)bar.style.width=`${done*25}%`;
    hud.classList.toggle("all-complete",done===4);
    const firstIncomplete=state.completed.findIndex(x=>!x);
    const next=firstIncomplete===-1?0:firstIncomplete;
    const go=document.getElementById("quest-continue");
    if(go)go.textContent=done===4?"✦ Lihat Semua Misi":`▶ Teruskan Misi ${next+1}`;
    const stats=dashboard.querySelectorAll(".stats-grid.three .stat strong");
    if(stats[0])stats[0].innerHTML=`${String(done).padStart(2,"0")} <small>/ 04</small>`;
    if(stats[1])stats[1].innerHTML=`${xp} <small>XP</small>`;
    const attemptSummary=document.getElementById('hn-student-attempt-summary');
    if(attemptSummary)attemptSummary.textContent=String(state.attempts.reduce((sum,row)=>sum+row.count,0));
    const banner=dashboard.querySelector(".student-banner");
    if(banner){
      const h=banner.querySelector("h2");
      const p=banner.querySelector("p");
      const b=banner.querySelector("b");
      const track=banner.querySelector(".progress-track span");
      if(h)h.textContent=done===4?"Pelita Warisan bersinar!":"Pengembaraan Desa Hikayat";
      if(p)p.textContent=`${done} daripada 4 latihan misi telah diselesaikan.`;
      if(b)b.textContent=`${done*25}% latihan selesai`;
      if(track)track.style.width=`${done*25}%`;
    }
    dashboard.querySelectorAll(".mission-card[data-mission]").forEach(card=>{
      const i=Number(card.dataset.mission);
      const chip=card.querySelector(".mission-status");
      if(chip){chip.className=`mission-status ${state.completed[i]?"done":"next"}`;chip.textContent=state.completed[i]?"✓ Latihan selesai":"Mula latihan";}
    });
    dashboard.querySelectorAll("#desa-hikayat-map [data-location]").forEach(btn=>{
      const i=Number(btn.dataset.location);
      btn.classList.toggle("mission-complete",!!state.completed[i]);
      const number=btn.querySelector("span");
      if(number)number.textContent=state.completed[i]?"✓":String(i+1);
    });
    dashboard.querySelectorAll(".reward-row > div").forEach((el,i)=>{
      el.classList.toggle("dim",!state.completed[i]);
      el.classList.toggle("earned",!!state.completed[i]);
    });
    const portfolio=dashboard.querySelector("#murid-portfolio .paper-card");
    if(portfolio){
      const h=portfolio.querySelector("h3");
      const p=portfolio.querySelector("p");
      const tag=portfolio.querySelector(".paper-tag");
      if(h)h.textContent=state.writtenStory.trim()?"Draf Hikayat Saya":"Belum ada draf cerita";
      if(p)p.textContent=state.writtenStory.trim()?state.writtenStory.slice(0,170)+(state.writtenStory.length>170?"…":""):"Draf cerita yang ditulis dalam Misi 2 akan dipaparkan di sini.";
      if(tag)tag.textContent="Draf latihan · Belum dihantar kepada Guru";
    }
  }

  function introLayout(title,body){
    return `<header class="student-play-top">
      <div><span class="student-play-eyebrow">DESA HIKAYAT · LATIHAN PADA PERANTI · ${missions[activeMission].time}</span>
      <h2>${missions[activeMission].icon} ${escapeHTML(title)}</h2>
      <p>${escapeHTML(body)}</p></div>
      <button type="button" class="student-play-close" data-action="close" aria-label="Tutup aktiviti">✕</button>
      </header>`;
  }
  function commonFooter(){
    return `<footer class="student-play-footer">
      <span>🔒 Disimpan hanya pada peranti ini, bukan akaun murid/guru.</span>
      <button type="button" data-action="close" class="student-play-secondary">Kembali ke kampung</button>
      </footer>`;
  }
  function feedbackView(){return feedback?`<div class="student-answer-feedback ${feedbackTone}" role="status">${escapeHTML(feedback)}</div>`:"";}
  function radioQuestions(items,answers,prefix){
    return items.map((item,i)=>`<fieldset class="student-question">
      <legend><b>${i+1}.</b> ${escapeHTML(item.q)}</legend>
      <div class="student-answers">${item.a.map((answer,j)=>`<label><input type="radio" name="${prefix}-${i}" value="${j}" ${answers[i]===String(j)?"checked":""}> <span>${escapeHTML(answer)}</span></label>`).join("")}</div>
      </fieldset>`).join("");
  }
  function renderMission1(){
    const ordered=state.sequence.map((id,i)=>`<li><span>${i+1}.</span><strong>${escapeHTML(events[id])}</strong><div class="student-sort-actions"><button type="button" data-action="move-up" data-index="${i}" ${i===0?"disabled":""} aria-label="Alih peristiwa ${i+1} ke atas">↑</button><button type="button" data-action="move-down" data-index="${i}" ${i===4?"disabled":""} aria-label="Alih peristiwa ${i+1} ke bawah">↓</button></div></li>`).join("");
    return `${introLayout(missions[0].name,"Baca kisah Pelita Warisan, susun lima peristiwa dan jawab tiga soalan.")}
      <div class="student-play-body">
        <section class="student-activity-section"><h3>📖 Cerita: Cahaya di Desa Warisan</h3>
          <div class="student-story">${story.map(t=>`<p>${escapeHTML(t)}</p>`).join("")}</div>
          <div class="student-activity-actions"><button type="button" data-action="read-aloud" class="student-play-secondary">🔊 Dengar cerita</button><button type="button" data-action="stop-reading" class="student-play-secondary">■ Hentikan suara</button></div>
        </section>
        <section class="student-activity-section"><h3>🧩 Susun Lima Peristiwa</h3><p>Gunakan butang ↑ atau ↓ untuk menyusun peristiwa daripada awal hingga akhir.</p>
          <ol class="student-sort-list">${ordered}</ol></section>
        <section class="student-activity-section"><h3>❓ Tiga Soalan Pemahaman</h3>
          ${radioQuestions(comprehension,state.readingAnswers,"reading")}</section>
        ${feedbackView()}
        <div class="student-submit-bar"><button type="button" class="student-play-primary" data-action="check-reading">Semak Jawapan & Kemajuan ↗</button></div>
      </div>${commonFooter()}`;
  }
  function renderMission2(){
    const choice={
      character:["Melur","Tok Penghulu","Sahabat Melur"],
      setting:["tepi sungai","balai kampung","sawah padi","jambatan kayu"],
      event:["menemukan pelita lama","membantu penduduk dalam kabus","menemui naskhah pusaka"]
    };
    return `${introLayout(missions[1].name,"Ubah suai sekurang-kurangnya satu perenggan cerita dan gunakan dua ungkapan indah.")}
      <div class="student-play-body">
        <section class="student-activity-section"><h3>🎨 Pilih Unsur Ceritamu</h3>
          <div class="student-choices"><label>Watak<select data-field="character">${pick(choice.character,state.character)}</select></label>
          <label>Latar<select data-field="setting">${pick(choice.setting,state.setting)}</select></label>
          <label>Peristiwa<select data-field="event">${pick(choice.event,state.event)}</select></label></div>
        </section>
        <section class="student-activity-section"><h3>✦ Bank Ungkapan Indah</h3>
          <p>Tekan sekurang-kurangnya dua ungkapan untuk memasukkannya ke dalam cerita.</p>
          <div class="student-phrases">${phrases.map((p,i)=>`<button type="button" data-action="insert-phrase" data-index="${i}" class="${state.chosenPhrases.includes(p)?"chosen":""}">✦ ${escapeHTML(p)}</button>`).join("")}</div>
        </section>
        <section class="student-activity-section"><h3>🪶 Tulis Hikayat Baharu</h3>
          <p>Idea: ${escapeHTML(state.character)} berada di ${escapeHTML(state.setting)} lalu ${escapeHTML(state.event)}. Gunakan bahasa yang indah dan santun.</p>
          <label class="student-writing-label" for="student-story-draft">Hasil penulisan anda</label>
          <textarea id="student-story-draft" data-field="writtenStory" maxlength="2500" rows="8" placeholder="Pada suatu petang yang damai, ...">${escapeHTML(state.writtenStory)}</textarea>
          <p class="student-draft-count"><span id="student-story-count">${state.writtenStory.trim().length}</span> aksara · ${state.chosenPhrases.length}/2 ungkapan dipilih (minimum)</p>
        </section>
        ${feedbackView()}
        <div class="student-submit-bar"><button type="button" data-action="check-writing" class="student-play-primary">Semak Draf & Simpan pada Peranti ↗</button></div>
      </div>${commonFooter()}`;
  }
  function renderMission3(){
    return `${introLayout(missions[2].name,"Selesaikan empat cabaran untuk memilih ungkapan dan ayat yang indah serta santun.")}
      <div class="student-play-body"><section class="student-activity-section"><h3>🌿 Empat Cabaran Warisan Bahasa</h3>
      ${radioQuestions(challenges,state.languageAnswers,"language")}</section>
      ${feedbackView()}
      <div class="student-submit-bar"><button type="button" class="student-play-primary" data-action="check-language">Semak Empat Cabaran ↗</button></div>
      </div>${commonFooter()}`;
  }
  function renderMission4(){
    const parts=[["opening","Permulaan","Perkenalkan watak dan tempat cerita bermula."],["middle","Perkembangan","Jelaskan cabaran yang dihadapi dan tindakan watak."],["ending","Pengakhiran","Terangkan penyelesaian dan pengajaran cerita."]];
    return `${introLayout(missions[3].name,"Rancang persembahan kreatif. Rakaman boleh disimpan ke peranti; penghantaran terus kepada guru belum tersedia.")}
      <div class="student-play-body">
        <section class="student-activity-section"><h3>🎭 Studio Persembahan Hikayat</h3>
        <div class="student-storyboard">${parts.map(([key,title,placeholder],i)=>`<label><span>Babak ${i+1}: ${title}</span><textarea rows="3" maxlength="900" data-performance="${key}" placeholder="${escapeHTML(placeholder)}">${escapeHTML(state.performance[key])}</textarea></label>`).join("")}</div>
        </section>
        <section class="student-activity-section"><h3>🎙️ Pilih Cara Persembahan</h3>
        <fieldset class="student-question"><legend>Kaedah latihan</legend><div class="student-answers">
          <label><input type="radio" name="presentation-format" value="audio" ${state.performance.format==="audio"?"checked":""}> <span>Rakaman suara (dirancang)</span></label>
          <label><input type="radio" name="presentation-format" value="video" ${state.performance.format==="video"?"checked":""}> <span>Video bercerita (dirancang)</span></label>
        </div></fieldset>
        <label class="student-practice-check"><input type="checkbox" data-field="practised" ${state.performance.practised?"checked":""}> Saya sudah berlatih dengan nada yang sesuai dan menyemak bahasa santun.</label>
        <p class="student-upload-note">Tiada fungsi rakaman atau muat naik di sini buat masa ini. Persembahan sebenar perlu dihantar melalui platform yang ditetapkan guru apabila tersedia.</p>
        </section>
        ${feedbackView()}
        <div class="student-submit-bar"><button type="button" class="student-play-primary" data-action="check-performance">Simpan Pelan Persembahan ↗</button></div>
      </div>${commonFooter()}`;
  }
  function renderDialog(){
    const body=[renderMission1,renderMission2,renderMission3,renderMission4][activeMission]?.()??"";
    dialog.innerHTML=body;
  }
  function open(index){
    if(index<0||index>3)return;
    if(index===0&&typeof window.openMissionOneAdventure==="function"){
      window.openMissionOneAdventure(account.id);return;
    }
    if(index===1&&typeof window.openMissionTwoAdventure==="function"){
      window.openMissionTwoAdventure();return;
    }
    if(index===2&&typeof window.openMissionThreeAdventure==="function"){
      window.openMissionThreeAdventure();return;
    }
    if(index===3&&typeof window.openMissionFourAdventure==="function"){
      window.openMissionFourAdventure(account.id);return;
    }
    activeMission=index;feedback="";
    renderDialog();
    if(!dialog.open)dialog.showModal();
    dialog.querySelector(".student-play-close")?.focus();
  }
  window.openStudentMission=open;
  function close(){
    window.speechSynthesis?.cancel();
    if(dialog.open)dialog.close();
  }
  dialog.addEventListener("close",()=>window.speechSynthesis?.cancel());
  dialog.addEventListener("click",e=>{
    if(e.target===dialog)close();
  });
  function complete(index,message){
    state.completed[index]=true;
    const saved=save();
    updateProgress();
    status(message+(saved?" Kemajuan latihan disimpan pada peranti ini.":" Storan tidak tersedia; kemajuan hanya sementara."),"success");
    renderDialog();
  }
  // Misi 1: satu semakan komprehensif untuk 5 urutan + 3 soalan.
  // Validasi ini terpakai dalam latihan setempat pada peranti murid sahaja.
  // Receive the exact number displayed by the account-scoped original AI Studio
  // game. Snapshot messages reconcile earlier attempts that the old bridge
  // ignored, while fresh attempt messages continue counting across devices.
  window.syncMissionOneGameAttempts=(payload,{newAttempt=false}={})=>{
    const count=payload?.attemptCount,latestScore=payload?.lastScore;
    if(!Number.isSafeInteger(count)||count<0||count>100000||
       (count>0&&(!Number.isInteger(latestScore)||latestScore<0||latestScore>8)))
      return {ok:false};
    const entry=state.attempts[0],before=entry.count;
    const target=newAttempt?Math.max(count,before+1):Math.max(count,before);
    let changed=target!==before;
    entry.count=target;
    const known=new Set(entry.history.map(x=>x.number));
    const records=Array.isArray(payload.attempts)?payload.attempts:[];
    for(const item of records){
      if(!Number.isSafeInteger(item?.number)||item.number<1||item.number>target||
         !Number.isInteger(item.score)||item.score<0||item.score>8||
         typeof item.at!=='string'||item.at.length>40||known.has(item.number))continue;
      entry.history.push({number:item.number,score:item.score,total:8,
        percent:Math.round(item.score/8*100),success:item.score===8,at:item.at});
      known.add(item.number);changed=true;
    }
    if(newAttempt&&target>before&&!known.has(target)){
      entry.history.push({number:target,score:latestScore,total:8,
        percent:Math.round(latestScore/8*100),success:latestScore===8,
        at:new Date().toISOString()});changed=true;
    }
    if(changed){
      entry.history.sort((x,y)=>x.number-y.number);
      if(entry.history.length>30)entry.history.splice(0,entry.history.length-30);
      save();
      updateProgress();
      window.dispatchEvent(new Event('hikayat:attempt'));
    }
    return {ok:true,count:entry.count,recorded:changed};
  };
  window.submitMissionOneAdventure=(payload)=>{
    const found=payload?.found,pages=payload?.pages,sequence=payload?.sequence,answers=payload?.answers;
    if(!Array.isArray(found)||found.length!==5||!found.every(v=>v===true)
      ||!Array.isArray(pages)||pages.length!==5||!pages.every(v=>v===true)
      ||!Array.isArray(sequence)||sequence.length!==5||[...sequence].sort().join()!=="0,1,2,3,4"
      ||!Array.isArray(answers)||answers.length!==3
      ||answers.some(v=>!["0","1","2"].includes(String(v))))
      return {ok:false,message:"Selesaikan lima naskhah, semua halaman dan setiap soalan dahulu."};
    const positions=sequence.reduce((count,v,i)=>count+Number(v===i),0);
    const comprehensionScore=answers.reduce((count,v,i)=>count+Number(String(v)===String(comprehension[i].correct)),0);
    const score=positions+comprehensionScore,success=score===8;
    state.sequence=[...sequence];state.readingAnswers=answers.map(String);
    // Victory is separate from quiz attempts. Do not add a fourth attempt
    // when the pupil clicks the mission-completion button.
    if(success){state.completed[0]=true;save();updateProgress();}
    else save();
    return {ok:true,success,positions,comprehensionScore,score,total:8};
  };

  // Original Misi 2 Google AI Studio — one flight record per unique attempt.
  const MISI2_IMPORTS_KEY="hikayat_misi2_portal_imported_flights_v1";
  const importedFlights=new Set((()=>{try{
    const raw=JSON.parse(localStorage.getItem(MISI2_IMPORTS_KEY)||"[]");
    return Array.isArray(raw)?raw.filter(x=>typeof x==="string").slice(-80):[];
  }catch(error){return [];}})());
  const misi2Phrases=[
    "sinar keemasan menyelimuti desa","desa yang permai",
    "hembusan bayu menyapa dedaunan","hati yang tulus","cahaya harapan"
  ];
  function normalizeMisi2Text(value){
    return typeof value==="string"?value.toLowerCase().replace(/\s+/g," ").trim():"";
  }
  window.submitMissionTwoFlightAttempt=(raw)=>{
    if(!raw||typeof raw!=="object"||
       typeof raw.id!=="string"||!(/^(run|alt)_[0-9]{8,17}$/.test(raw.id))||
       !Number.isInteger(raw.masteredCount)||raw.masteredCount<0||raw.masteredCount>5||
       typeof raw.completedFlight!=="boolean"||
       !Number.isInteger(raw.checkpointsReached)||raw.checkpointsReached<0||raw.checkpointsReached>5)
      return {ok:false};
    if(importedFlights.has(raw.id))return {ok:true,recorded:false};
    importedFlights.add(raw.id);
    try{localStorage.setItem(MISI2_IMPORTS_KEY,JSON.stringify([...importedFlights].slice(-80)));}
    catch(error){/* Reading/writing game state still works in memory. */}
    recordAttempt(1,raw.masteredCount,5,raw.completedFlight&&raw.masteredCount===5);
    return {ok:true,recorded:true};
  };
  // Five mastered gates + an actual three-part written hikayat + self-review.
  // Local training validation only; does not constitute a teacher's assessment.
  window.submitMissionTwoAdventure=(raw)=>{
    if(!raw||typeof raw!=="object"||raw.flightCompleted!==true)return {ok:false};
    const list=raw.collectedPhrases,records=raw.checkpointRecords,draft=raw.draft,check=raw.checklist;
    if(!Array.isArray(list)||list.length!==5||new Set(list).size!==5||
       !misi2Phrases.every(v=>list.includes(v)))return {ok:false};
    if(!Array.isArray(records)||records.length!==5||
       records.some((r,i)=>r?.checkpointIndex!==i||r.masteredAfterCorrection!==true))
      return {ok:false};
    if(!draft||typeof draft!=="object"||!check||typeof check!=="object")return {ok:false};
    for(const k of ["watakId","latarId","peristiwaId"]){
      if(typeof draft[k]!=="string"||!draft[k].trim()||draft[k].length>80)return {ok:false};
    }
    for(const k of ["permulaan","perkembangan","pengakhiran"]){
      const text=draft[k];
      if(typeof text!=="string"||text.length>3500||text.replace(/_{2,}/g,"").trim().length<15||
         text.trim().split(/\\s+/).length<3)return {ok:false};
    }
    const keys=["watakDanLatar","peristiwaJelas","permulaanLengkap","perkembanganLengkap","pengakhiranLengkap","duaUngkapanIndah","bacaSemulaSantun"];
    if(keys.some(k=>check[k]!==true))return {ok:false};
    const story=[draft.permulaan,draft.perkembangan,draft.pengakhiran].join("\n\n");
    const used=misi2Phrases.filter(p=>normalizeMisi2Text(story).includes(normalizeMisi2Text(p)));
    if(used.length<2)return {ok:false};
    state.writtenStory=story.slice(0,6000);
    state.chosenPhrases=used;
    state.character=draft.watakId.slice(0,120);
    state.setting=draft.latarId.slice(0,120);
    state.event=draft.peristiwaId.slice(0,120);
    const wasCompleted=state.completed[1]===true;
    state.completed[1]=true;
    save();updateProgress();
    window.dispatchEvent(new Event("hikayat:attempt"));
    return {ok:true,completed:true,alreadyCompleted:wasCompleted};
  };
  // Misi 3: accept ONLY the original 3D game's complete learning payload.
  // Mark once, count once, preserve the existing 70 XP calculation in totalXP().
  window.submitMissionThreeAdventure = payload => {
    if (!payload || payload.source !== 'hikayat-nusantara-misi-3' ||
        payload.missionId !== 'misi-3' || payload.completed !== true ||
        payload.xpAwarded !== 70 || payload.badgeId !== 'penjaga-bahasa-berbudi' ||
        !Number.isInteger(payload.languageScore) ||
        !Number.isInteger(payload.maxLanguageScore) || payload.maxLanguageScore !== 12 ||
        payload.languageScore < 0 || payload.languageScore > 12 ||
        !Number.isInteger(payload.totalAttempts) || payload.totalAttempts < 0 ||
        !Number.isInteger(payload.expressionsUsedCount) || payload.expressionsUsedCount < 2 ||
        typeof payload.modifiedStory !== 'string' ||
        payload.modifiedStory.trim().length < 50 || payload.modifiedStory.length > 12000 ||
        typeof payload.reflectionAnswer !== 'string' ||
        payload.reflectionAnswer.trim().length < 4 || payload.reflectionAnswer.length > 2500 ||
        !Number.isFinite(payload.completedAt) || payload.completedAt <= 0) {
      return {ok:false,message:'Selesaikan empat cabaran, cerita yang diubah suai dan pemulihan Pokok Bahasa dahulu.'};
    }
    if(state.completed[2])return {ok:true,completed:true,alreadyCompleted:true};
    // The original game supplies an actual first-attempt language score out of 12.
    recordAttempt(2,payload.languageScore,12,true);
    state.completed[2]=true;
    save();updateProgress();
    return {ok:true,completed:true,alreadyCompleted:false};
  };
  function checkReading(){
    const correctSequence=state.sequence.every((value,i)=>value===i);
    const score=state.readingAnswers.reduce((acc,a,i)=>acc+(a===String(comprehension[i].correct)?1:0),0);
    if(correctSequence&&score===3){
      complete(0,"Tahniah! Lima peristiwa tersusun dengan tepat dan ketiga-tiga jawapan pemahaman betul.");
    }else{
      const issues=[];
      if(!correctSequence)issues.push("Semak semula urutan lima peristiwa.");
      if(score<3)issues.push(`${score}/3 jawapan pemahaman betul.`);
      const incorrect=comprehension.findIndex((q,i)=>state.readingAnswers[i]!==String(q.correct));
      if(incorrect>=0)issues.push(`Petunjuk: ${comprehension[incorrect].why}`);
      status(issues.join(" "),"try");
      renderDialog();
    }
  }
  function checkWriting(){
    const text=state.writtenStory.trim().toLocaleLowerCase("ms");
    const used=state.chosenPhrases.filter(p=>text.includes(p.toLocaleLowerCase("ms")));
    if(text.length<70)status("Tambah perincian pada draf. Tulis sekurang-kurangnya 70 aksara supaya cerita lebih jelas.","try");
    else if(used.length<2)status("Masukkan sekurang-kurangnya dua ungkapan indah yang dipilih ke dalam cerita.","try");
    else complete(1,"Bagus! Draf mempunyai perincian dan dua ungkapan indah. Semak lagi jalan cerita serta kesantunan bahasanya.");
    if(!state.completed[1])renderDialog();
  }
  function checkLanguage(){
    const score=state.languageAnswers.reduce((acc,a,i)=>acc+(a===String(challenges[i].correct)?1:0),0);
    if(score===4)complete(2,"Syabas! Keempat-empat cabaran bahasa dijawab dengan tepat.");
    else{
      const incorrect=challenges.findIndex((q,i)=>state.languageAnswers[i]!==String(q.correct));
      status(`${score}/4 jawapan betul. Petunjuk soalan ${incorrect+1}: ${challenges[incorrect].why}`,"try");
      renderDialog();
    }
  }
  function checkPerformance(){
    const tooShort=["opening","middle","ending"].filter(key=>state.performance[key].trim().length<20);
    if(tooShort.length>0){
      status("Lengkapkan ketiga-tiga babak dengan sekurang-kurangnya 20 aksara setiap satu.","try");
      renderDialog();
    }else if(!state.performance.practised){
      status("Tandakan kotak latihan setelah anda berlatih membaca cerita dengan nada yang sesuai.","try");
      renderDialog();
    }else complete(3,"Pelan persembahan anda sudah disediakan! Ini kemajuan latihan sahaja; rakaman sebenar masih perlu diserahkan kepada guru melalui platform yang sesuai.");
  }
  function handleAction(button){
    const action=button.dataset.action;
    if(action==="close"){close();return;}
    if(action==="move-up"||action==="move-down"){
      const i=Number(button.dataset.index),other=i+(action==="move-up"?-1:1);
      if(i>=0&&i<5&&other>=0&&other<5){
        [state.sequence[i],state.sequence[other]]=[state.sequence[other],state.sequence[i]];
        invalidate(0);feedback="";renderDialog();
      }
      return;
    }
    if(action==="read-aloud"){
      if(!("speechSynthesis" in window)){
        status("Pelayar ini belum menyokong fungsi bacaan suara. Anda boleh membaca teks secara manual.","try");
        renderDialog();return;
      }
      window.speechSynthesis.cancel();
      const utterance=new SpeechSynthesisUtterance(story.join(" "));
      utterance.lang="ms-MY";utterance.rate=.92;utterance.pitch=1;
      window.speechSynthesis.speak(utterance);return;
    }
    if(action==="stop-reading"){window.speechSynthesis?.cancel();return;}
    if(action==="insert-phrase"){
      const phrase=phrases[Number(button.dataset.index)];
      if(!phrase)return;
      if(!state.chosenPhrases.includes(phrase))state.chosenPhrases.push(phrase);
      state.writtenStory=(state.writtenStory.trim()+(state.writtenStory.trim()?" ":"")+phrase).slice(0,2500);
      invalidate(1);feedback="";renderDialog();
      dialog.querySelector("#student-story-draft")?.focus();
      return;
    }
    if(action==="check-reading")checkReading();
    if(action==="check-writing")checkWriting();
    if(action==="check-language")checkLanguage();
    if(action==="check-performance")checkPerformance();
  }
  dialog.addEventListener("click",e=>{
    const button=e.target.closest("button[data-action]");
    if(button)handleAction(button);
  });
  dialog.addEventListener("input",e=>{
    const t=e.target;
    if(t.matches('[data-field="writtenStory"]')){
      state.writtenStory=t.value.slice(0,2500);
      invalidate(1);
      const counter=dialog.querySelector("#student-story-count");
      if(counter)counter.textContent=String(state.writtenStory.trim().length);
    }else if(t.matches("[data-performance]")){
      state.performance[t.dataset.performance]=t.value.slice(0,900);
      invalidate(3);
    }
  });
  dialog.addEventListener("change",e=>{
    const t=e.target;
    const field=t.dataset.field;
    if(["character","setting","event"].includes(field)){
      state[field]=t.value;invalidate(1);
    }else if(field==="practised"){
      state.performance.practised=t.checked;invalidate(3);
    }else if(t.matches('input[name^="reading-"]')){
      const index=Number(t.name.replace("reading-",""));
      if(index>=0&&index<3){state.readingAnswers[index]=t.value;invalidate(0);}
    }else if(t.matches('input[name^="language-"]')){
      const index=Number(t.name.replace("language-",""));
      if(index>=0&&index<4){state.languageAnswers[index]=t.value;invalidate(2);}
    }else if(t.name==="presentation-format"){
      state.performance.format=t.value==="video"?"video":"audio";invalidate(3);
    }
  });
  document.getElementById("quest-guide")?.addEventListener("click",()=>{
    const next=state.completed.findIndex(x=>!x);
    showHelper(next<0?0:next);
  });
  document.getElementById("quest-continue")?.addEventListener("click",()=>{
    const next=state.completed.findIndex(x=>!x);
    open(next<0?0:next);
  });
  document.getElementById("quest-reset")?.addEventListener("click",()=>{
    if(!window.confirm("Tetapkan semula latihan di peranti dan kemas kini ringkasan kemajuan di Neon? Rekod PBD dan video (jika ada) tidak terlibat."))return;
    Object.assign(state,empty());
    save();feedback="";updateProgress();helper.hidden=true;
    importedFlights.clear();
    try{
      localStorage.removeItem(MISI2_IMPORTS_KEY);
      localStorage.removeItem("hikayat_nusantara_misi2_state_v1");
    }catch(error){}
    window.dispatchEvent(new Event("hikayat:reset"));
  });
  helper.querySelector("#quest-helper-close")?.addEventListener("click",()=>helper.hidden=true);
  document.getElementById('quest-sync-now')?.addEventListener('click',()=>{
    if(cloud.ready)queueCloud();else void initializeCloud();
  });
  updateProgress();
  void initializeCloud();
})();
