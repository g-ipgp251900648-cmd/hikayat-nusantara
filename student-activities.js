/** Hikayat Nusantara: empat aktiviti interaktif Dashboard Murid (data demonstrasi setempat sahaja). */
(function studentActivities(){
  "use strict";
  const dashboard=document.getElementById("murid-view");
  if(!dashboard)return;

  const STORAGE_KEY="hikayat-nusantara-murid-demo-v2";
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
      if(parsed.performance&&typeof parsed.performance==="object"){
        for(const k of ["opening","middle","ending"])if(typeof parsed.performance[k]==="string")base.performance[k]=parsed.performance[k].slice(0,900);
        base.performance.format=parsed.performance.format==="video"?"video":"audio";
        base.performance.practised=parsed.performance.practised===true;
      }
      // Migrate old localStorage safely: old sessions simply have 0 attempts.
      if(Array.isArray(parsed.attempts)){
        base.attempts=base.attempts.map((item,i)=>{
          const saved=parsed.attempts[i];
          if(!saved||typeof saved!=="object")return item;
          const count=Math.min(100000,Math.max(0,Math.trunc(Number(saved.count)||0)));
          const history=Array.isArray(saved.history)?saved.history.slice(-30).filter(entry=>
            entry&&typeof entry==="object"&&Number.isFinite(entry.score)&&Number.isFinite(entry.total)
            &&entry.total>0&&typeof entry.at==="string"
          ).map(entry=>({
            number:Math.min(100000,Math.max(1,Math.trunc(Number(entry.number)||1))),
            score:Math.max(0,Math.min(entry.total,Math.trunc(entry.score))),
            total:Math.max(1,Math.trunc(entry.total)),
            percent:Math.max(0,Math.min(100,Math.round(100*entry.score/entry.total))),
            success:entry.success===true,
            at:entry.at.slice(0,35)
          })):[];
          return {count:Math.max(count,history.at(-1)?.number||0),history};
        });
      }
    }catch(e){console.warn("Data demo belum dapat dibaca.",e);}
    return base;
  }
  const state=load();
  // Hanya baca kemajuan demo daripada modul misi, bukan bukti kelulusan guru.
  window.getStudentCertificateProgress=()=>({
    completed:[...state.completed],
    performance:{...state.performance}
  });
  // Baca sahaja: graf dibina daripada percubaan dalam localStorage pelayar ini.
  window.getStudentAttemptStats=()=>state.attempts.map(({count,history},i)=>({
    mission:i+1,
    completed:state.completed[i],
    count,
    history:history.map(entry=>({...entry}))
  }));
  let activeMission=-1;
  let feedback="";
  let feedbackTone="note";
  function save(){
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
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
    const entry=state.attempts[index];
    if(!entry||entry.count>=100000)return;
    entry.count++;
    entry.history.push({
      number:entry.count,
      score,
      total,
      percent:Math.round(score*100/total),
      success,
      at:new Date().toISOString()
    });
    // Batasan storan: simpan hanya 30 semakan paling baharu bagi setiap misi.
    if(entry.history.length>30)entry.history.splice(0,entry.history.length-30);
    save();
    window.dispatchEvent(new Event("hikayat:attempt"));
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
    <p class="quest-privacy">Latihan ini hanya disimpan pada pelayar/peranti yang digunakan (jika storan tersedia). Tiada jawapan dihantar kepada guru. Jangan tulis maklumat peribadi.</p>`;
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
    const banner=dashboard.querySelector(".student-banner");
    if(banner){
      const h=banner.querySelector("h2");
      const p=banner.querySelector("p");
      const b=banner.querySelector("b");
      const track=banner.querySelector(".progress-track span");
      if(h)h.textContent=done===4?"Pelita Warisan bersinar!":"Pengembaraan Desa Hikayat";
      if(p)p.textContent=`${done} daripada 4 latihan misi telah diselesaikan pada peranti ini.`;
      if(b)b.textContent=`${done*25}% latihan selesai (demo)`;
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
      if(h)h.textContent=state.writtenStory.trim()?"Draf Hikayat Saya":"Kitab Pengembara";
      if(p)p.textContent=state.writtenStory.trim()?state.writtenStory.slice(0,170)+(state.writtenStory.length>170?"…":""):"Draf cerita yang ditulis dalam Misi 2 akan dipaparkan di sini.";
      if(tag)tag.textContent="Draf latihan setempat · Tidak dihantar kepada guru";
    }
    window.dispatchEvent(new Event("hikayat:progress"));
  }

  function introLayout(title,body){
    return `<header class="student-play-top">
      <div><span class="student-play-eyebrow">DESA HIKAYAT · MOD LATIHAN DEMO · ${missions[activeMission].time}</span>
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
    return `${introLayout(missions[3].name,"Rancang persembahan kreatif. Rakaman sebenar belum boleh dimuat naik dalam mod demo.")}
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
  function checkReading(){
    if(state.readingAnswers.some(answer=>answer==="")){
      status("Jawab ketiga-tiga soalan pemahaman sebelum menekan Semak. Percubaan hanya dikira setelah semua dijawab.","try");
      renderDialog();return;
    }
    const correctPositions=state.sequence.reduce((acc,value,i)=>acc+(value===i?1:0),0);
    const correctSequence=correctPositions===5;
    const score=state.readingAnswers.reduce((acc,a,i)=>acc+(a===String(comprehension[i].correct)?1:0),0);
    recordAttempt(0,correctPositions+score,8,correctSequence&&score===3);
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
    if(!text){
      status("Tulis dahulu draf cerita sebelum menyemak. Percubaan kosong tidak direkodkan.","try");
      renderDialog();return;
    }
    const meetsLength=text.length>=70,meetsPhrases=used.length>=2;
    recordAttempt(1,Number(meetsLength)+Number(meetsPhrases),2,meetsLength&&meetsPhrases);
    if(text.length<70)status("Tambah perincian pada draf. Tulis sekurang-kurangnya 70 aksara supaya cerita lebih jelas.","try");
    else if(used.length<2)status("Masukkan sekurang-kurangnya dua ungkapan indah yang dipilih ke dalam cerita.","try");
    else complete(1,"Bagus! Draf mempunyai perincian dan dua ungkapan indah. Semak lagi jalan cerita serta kesantunan bahasanya.");
    if(!state.completed[1])renderDialog();
  }
  function checkLanguage(){
    if(state.languageAnswers.some(answer=>answer==="")){
      status("Jawab keempat-empat cabaran bahasa sebelum menekan Semak. Percubaan hanya dikira setelah semua dijawab.","try");
      renderDialog();return;
    }
    const score=state.languageAnswers.reduce((acc,a,i)=>acc+(a===String(challenges[i].correct)?1:0),0);
    recordAttempt(2,score,4,score===4);
    if(score===4)complete(2,"Syabas! Keempat-empat cabaran bahasa dijawab dengan tepat.");
    else{
      const incorrect=challenges.findIndex((q,i)=>state.languageAnswers[i]!==String(q.correct));
      status(`${score}/4 jawapan betul. Petunjuk soalan ${incorrect+1}: ${challenges[incorrect].why}`,"try");
      renderDialog();
    }
  }
  function checkPerformance(){
    const parts=["opening","middle","ending"];
    if(parts.every(key=>!state.performance[key].trim())){
      status("Isi dahulu rancangan persembahan. Percubaan kosong tidak dikira.","try");
      renderDialog();return;
    }
    const tooShort=parts.filter(key=>state.performance[key].trim().length<20);
    const criteria=parts.length-tooShort.length+Number(state.performance.practised);
    recordAttempt(3,criteria,4,criteria===4);
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
    if(!window.confirm("Padam semua jawapan, draf dan kemajuan latihan yang disimpan pada peranti ini?"))return;
    Object.assign(state,empty());
    save();feedback="";updateProgress();helper.hidden=true;
  });
  helper.querySelector("#quest-helper-close")?.addEventListener("click",()=>helper.hidden=true);
  updateProgress();
})();
