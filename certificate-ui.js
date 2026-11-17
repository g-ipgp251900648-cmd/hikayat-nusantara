/** Sijil demonstrasi — hanya guru dengan kunci server boleh meluluskan. */
(function certificateInterface() {
  "use strict";
  const student=document.getElementById("murid-view"),teacher=document.getElementById("guru-view");
  if(!student||!teacher)return;
  const KEY="hikayat-cert-session-demo-v1";
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dmy=s=>new Date(s).toLocaleDateString("ms-MY",{day:"numeric",month:"long",year:"numeric"});
  const progress=()=>window.getStudentCertificateProgress?.()||{completed:[],performance:null};
  const ready=()=>{
    const p=progress();return p.completed?.length===4&&p.completed.every(Boolean)&&p.performance?.practised===true&&["opening","middle","ending"].every(k=>(p.performance[k]||"").trim().length>=20);
  };
  let ticket=null,certificate=null,key="",queue=[];
  try{const t=JSON.parse(localStorage.getItem(KEY)||"null");if(t?.id&&t?.token)ticket={...t,status:"pending",comment:""};}catch{}
  function save(){
    try{if(ticket)localStorage.setItem(KEY,JSON.stringify({id:ticket.id,token:ticket.token,alias:ticket.alias}));else localStorage.removeItem(KEY);}catch{}
  }
  async function api(path,body,teacherKey){
    const headers={"Content-Type":"application/json"};
    if(teacherKey)headers["X-Teacher-Key"]=teacherKey;
    const response=await fetch("/api/certificate/"+path,{
      method:body===undefined?"GET":"POST",headers,body:body===undefined?undefined:JSON.stringify(body),
      cache:"no-store",credentials:"same-origin"
    });
    const payload=await response.json().catch(()=>({error:"Tiada respons daripada pelayan."}));
    if(!response.ok)throw Error(payload.error||"Permintaan tidak berjaya");
    return payload;
  }
  const mount=document.createElement("section");
  mount.className="cert-status-widget";mount.id="murid-sijil";
  student.querySelector("#murid-ganjaran")?.append(mount);
  const nav=teacher.querySelector(".sidebar .side-link[data-target='guru-tugasan']");
  if(nav){
    const button=document.createElement("button");
    button.className="side-link";button.type="button";button.dataset.target="guru-sijil";
    button.innerHTML="<span>🎓</span> Semakan Sijil";
    nav.before(button);
    button.addEventListener("click",()=>{
      teacher.querySelectorAll(".side-link").forEach(x=>x.classList.toggle("active",x===button));
      document.getElementById("guru-sijil")?.scrollIntoView({behavior:"smooth",block:"start"});
    });
  }
  const review=document.createElement("section");review.id="guru-sijil";review.className="dash-section cert-teacher-section";
  review.innerHTML=`<div class="section-line"><div><span class="mini-label">PENGESAHAN GURU · DEMO</span><h2>Balai Pengesahan Sijil</h2></div></div>
   <div class="cert-review-intro"><h3>🔐 Respons dan Kelulusan Guru</h3>
   <p>Semak tiga bahagian rancangan Misi 4, beri respons dan luluskan sijil hanya jika hasilnya sesuai.</p>
   <p class="cert-caution">Gunakan nama contoh sahaja. Data prototaip ini berada dalam memori server dan akan hilang apabila Render restart atau deploy semula.</p>
   <div class="cert-review-login">
   <label>Nama penyemak (contoh)<input id="cert-teacher-name" autocomplete="off" maxlength="65" placeholder="Cikgu Suria"></label>
   <label>Kunci guru dari Render<input id="cert-teacher-key" type="password" autocomplete="off" placeholder="Masukkan kunci Environment"></label>
   <button type="button" id="cert-load-queue">Buka Senarai</button><button type="button" id="cert-clear-key">Kosongkan Kunci</button></div>
   <p id="cert-review-msg" class="cert-message" aria-live="polite"></p></div><div id="cert-review-queue"></div>`;
  teacher.querySelector(".dash-content")?.append(review);
  const dlg=document.createElement("dialog");dlg.className="cert-print-dialog";
  dlg.innerHTML=`<div class="cert-print-toolbar"><strong>🎓 Sijil Pengembara Warisan (Demo)</strong>
   <div><button id="cert-print-btn" type="button">Cetak / Simpan PDF</button><button id="cert-close-btn" type="button">Tutup ✕</button></div></div>
   <div id="cert-print-mount"></div>`;
  document.body.append(dlg);
  const el=id=>document.getElementById(id);
  function notice(text,bad=false){
    const msg=mount.querySelector(".cert-message");
    if(msg){msg.textContent=text;msg.classList.toggle("error",bad);}
  }
  function paintStudent(){
    const count=progress().completed?.filter(Boolean).length||0;
    let status="",body="";
    if(certificate&&ticket?.status==="approved"){
      status="✅ Sijil Tersedia";
      body=`<p>Tahniah! Guru telah memberi respons dan meluluskan sijil DEMO untuk <b>${esc(certificate.name)}</b>.</p>
       <p class="cert-comment">Respons guru: ${esc(ticket.comment||"Diluluskan.")}</p>
       <button type="button" id="cert-view" class="cert-primary">🏆 Lihat / Cetak Sijil</button>`;
    }else if(ticket?.status==="pending"){
      status="⌛ Menunggu Respons Guru";
      body=`<p>Rancangan Misi 4 telah dihantar. Sijil masih dikunci sehingga guru menyemak dan meluluskannya.</p>
       <p>Nama pada sijil: <b>${esc(ticket.alias)}</b></p>
       <button type="button" id="cert-refresh" class="cert-secondary">↻ Semak Kelulusan</button>`;
    }else if(ticket?.status==="revision"){
      status="✍️ Perlu Penambahbaikan";
      body=`<p>Guru meminta penambahbaikan pada Misi 4.</p><p class="cert-comment">${esc(ticket.comment)}</p>
       <button type="button" id="cert-edit" class="cert-secondary">Buka Misi 4</button>
       <button type="button" id="cert-resubmit" class="cert-primary">Hantar Semula</button>`;
    }else if(ready()){
      status="📮 Sedia Dihantar";
      body=`<p>Keempat-empat latihan selesai. Nama contoh ini akan tertera secara automatik pada sijil setelah guru meluluskan Misi 4.</p>
       <label class="cert-alias-label">Nama untuk sijil (samaran sahaja)<input id="cert-alias" maxlength="55" autocomplete="off" placeholder="Contoh: Pengembara Melur"></label>
       <button type="button" id="cert-submit" class="cert-primary">Hantar Misi 4 untuk Semakan Guru</button>`;
    }else{
      status="🔒 Sijil Masih Dikunci";
      body=`<p>Lengkapkan semua empat misi serta rancangan persembahan Misi 4 terlebih dahulu. Kemajuan latihan: <b>${count}/4</b>.</p>
       <button type="button" id="cert-to-mission" class="cert-secondary">Teroka Misi</button>`;
    }
    mount.innerHTML=`<div class="cert-widget-head"><div><span class="mini-label">KHAZANAH KEJAYAAN</span><h2>Sijil Pengembara Warisan</h2>
       <p>Sijil muncul selepas empat misi, respons guru dan kelulusan.</p></div><div class="cert-widget-icon" aria-hidden="true">🏮</div></div>
       <div class="cert-widget-body"><strong class="cert-status">${status}</strong>${body}
       <p class="cert-message" role="status" aria-live="polite"></p>
       <small>SIJIL DEMONSTRASI · BUKAN DOKUMEN RASMI. Jangan masukkan nama sebenar murid.</small></div>`;
  }
  async function updateStatus(silent=false){
    if(!ticket)return;
    try{
      const result=await api("status",{id:ticket.id,token:ticket.token});
      ticket.status=result.status;ticket.comment=result.comment||"";
      certificate=result.certificate;
      paintStudent();
      if(!silent)notice(result.status==="approved"?"Tahniah! Sijil telah diluluskan.":result.status==="revision"?"Guru meminta penambahbaikan.":"Masih menunggu semakan guru.");
    }catch(error){
      ticket=null;certificate=null;save();paintStudent();
      notice("Rekod demo tidak ditemui (mungkin server telah dimulakan semula). Sila hantar semula jika perlu.",true);
    }
  }
  async function submit(alias){
    if(!ready()){notice("Semua misi dan latihan Misi 4 mesti lengkap terlebih dahulu.",true);return;}
    if(alias.length<2||alias.length>55||/[<>]/.test(alias)){notice("Masukkan nama samaran 2–55 aksara.",true);return;}
    try{
      notice("Menghantar latihan kepada guru...");
      const result=await api("submit",{alias,completed:progress().completed,performance:progress().performance});
      ticket={...result,alias,comment:""};certificate=null;save();paintStudent();
      notice("Penghantaran diterima! Minta guru semak menggunakan Dashboard Guru.");
    }catch(error){notice(error.message,true);}
  }
  mount.addEventListener("click",event=>{
    const id=event.target?.id;
    if(id==="cert-submit")submit(el("cert-alias")?.value.trim()||"");
    if(id==="cert-refresh")updateStatus();
    if(id==="cert-view")showCertificate();
    if(id==="cert-edit")window.openStudentMission?.(3);
    if(id==="cert-resubmit")submit(ticket?.alias||"");
    if(id==="cert-to-mission")student.querySelector("#murid-misi")?.scrollIntoView({behavior:"smooth"});
  });
  function showCertificate(){
    if(ticket?.status!=="approved"||!certificate)return;
    const c=certificate;
    el("cert-print-mount").innerHTML=`<article class="cert-sheet" id="cert-sheet">
      <div class="cert-pattern">❖ ✺ ❖ ✺ ❖ ✺ ❖ ✺ ❖</div>
      <div class="cert-inner">
        <div class="cert-lantern">🏮</div><div class="cert-school">HIKAYAT NUSANTARA <span>DESA PELITA WARISAN</span></div>
        <div class="cert-flourish">✧ ❁ ✧</div><h1>SIJIL PENGHARGAAN</h1>
        <p class="cert-intro">Dengan ini diperakui bahawa</p>
        <h2 class="cert-person">${esc(c.name)}</h2><div class="cert-rule"></div>
        <p class="cert-text">telah melengkapkan <b>empat misi pembelajaran Bahasa Melayu Tahun 5</b> dalam
        pengembaraan <b>Desa Hikayat: Pelita Warisan</b> serta menerima respons dan kelulusan guru penyemak.</p>
        <p class="cert-motto">“Bahasa Indah, Warisan Terpelihara.”</p>
        <div class="cert-seal">✺ <span>LULUS<br>DEMO</span></div>
        <div class="cert-details">
          <div><span>Tarikh</span><b>${esc(dmy(c.issuedAt))}</b></div>
          <div><span>Disemak oleh</span><b>${esc(c.teacherName)}</b><small>Guru Penyemak</small></div>
          <div><span>ID Sijil</span><b>${esc(c.id)}</b></div>
        </div>
        <p class="cert-not-official">SIJIL DEMONSTRASI · BUKAN SIJIL RASMI SEKOLAH</p>
      </div><div class="cert-pattern bottom">❖ ✺ ❖ ✺ ❖ ✺ ❖ ✺ ❖</div>
    </article>`;
    if(!dlg.open)dlg.showModal();
  }
  dlg.querySelector("#cert-close-btn").addEventListener("click",()=>dlg.close());
  dlg.querySelector("#cert-print-btn").addEventListener("click",()=>{if(certificate&&ticket?.status==="approved")window.print();});
  dlg.addEventListener("click",e=>{if(e.target===dlg)dlg.close();});
  const msg=el("cert-review-msg");
  async function loadQueue(){
    if(key.length<16){msg.textContent="Masukkan kunci guru sekurang-kurangnya 16 aksara dari Render.";return;}
    msg.textContent="Membuka senarai semakan...";
    try{
      const data=await api("reviews",{},key);
      queue=data.queue;msg.textContent="Senarai semakan dibuka (data sementara).";
      const dest=el("cert-review-queue");
      dest.innerHTML=queue.length?queue.map((item,i)=>`
        <article class="cert-review-card"><div class="cert-review-card-head"><h3>📜 ${esc(item.alias)}</h3>
        <span>${item.status==="approved"?"✅ Diluluskan":item.status==="revision"?"✍️ Perlu pembetulan":"⌛ Menunggu semakan"}</span></div>
        <p><b>Tarikh hantar:</b> ${esc(dmy(item.createdAt))}</p>
        <div class="cert-plans"><p><b>Permulaan</b>${esc(item.plan.opening)}</p>
          <p><b>Perkembangan</b>${esc(item.plan.middle)}</p>
          <p><b>Pengakhiran</b>${esc(item.plan.ending)}</p>
          <p><b>Format dirancang</b>${item.plan.format==="video"?"Video":"Suara"} (belum ada fail rakaman)</p></div>
        ${item.status==="pending"?`<label>Respons guru<textarea id="cert-comment-${i}" rows="3" maxlength="500" placeholder="Berikan maklum balas sekurang-kurangnya lima aksara"></textarea></label>
          <div class="cert-review-buttons"><button type="button" data-id="${esc(item.id)}" data-kind="revision" data-row="${i}" class="cert-secondary">Minta Pembetulan</button>
          <button type="button" data-id="${esc(item.id)}" data-kind="approve" data-row="${i}" class="cert-primary">✓ Luluskan Sijil DEMO</button></div>`:
          `<p class="cert-comment">${esc(item.comment||"Sudah disemak.")}</p>`}
        </article>`).join(""):`<p class="cert-empty">Belum ada Misi 4 dihantar untuk semakan pada sesi server ini.</p>`;
    }catch(error){msg.textContent=error.message;msg.classList.add("error");}
  }
  el("cert-load-queue").addEventListener("click",()=>{
    key=el("cert-teacher-key").value;
    msg.classList.remove("error");loadQueue();
  });
  el("cert-clear-key").addEventListener("click",()=>{
    key="";el("cert-teacher-key").value="";el("cert-review-queue").innerHTML="";
    msg.textContent="Kunci guru telah dikosongkan daripada sesi pelayar.";
  });
  el("cert-review-queue").addEventListener("click",async e=>{
    const target=e.target.closest("button[data-id]");
    if(!target)return;
    const teacherName=el("cert-teacher-name").value.trim();
    const comment=el("cert-comment-"+target.dataset.row)?.value.trim()||"";
    if(teacherName.length<2||comment.length<5){msg.textContent="Nama penyemak dan respons (minimum lima aksara) diperlukan.";return;}
    const isApproved=target.dataset.kind==="approve";
    if(!confirm(isApproved?"Benar-benar mahu meluluskan sijil DEMO selepas menyemak Misi 4?":"Hantar maklum balas untuk penambahbaikan?"))return;
    target.disabled=true;
    try{
      const out=await api("review",{id:target.dataset.id,teacherName,comment,decision:target.dataset.kind},key);
      msg.textContent=out.message;await loadQueue();
    }catch(error){target.disabled=false;msg.textContent=error.message;msg.classList.add("error");}
  });
  paintStudent();
  if(ticket)updateStatus(true);
  window.addEventListener("hikayat:progress",()=>{if(!certificate)paintStudent();});
  api("config").then(config=>{
    msg.textContent=config.teacherConfigured?
      "Kunci guru telah dikonfigurasikan pada server. Masukkan kunci untuk semakan.":
      "Kelulusan belum diaktifkan: tambah CERTIFICATE_TEACHER_KEY dalam Render → Environment (min. 16 aksara).";
  }).catch(()=>{});
})();
