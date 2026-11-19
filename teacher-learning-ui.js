/* Hikayat Nusantara — five connected, teacher-only learning management menus.
   No credentials, videos, raw game drafts or fake TP values are stored here. */
(() => {
  'use strict';
  const dashboard=document.getElementById('guru-view');
  if(!dashboard)return;
  const pages={
    pbd:document.getElementById('guru-pbd'),
    analysis:document.getElementById('guru-analisis'),
    feedback:document.getElementById('guru-maklum-balas'),
    portfolio:document.getElementById('guru-portfolio'),
    reports:document.getElementById('guru-laporan')
  };
  const names=['Jejak Naskhah Pusaka','Balai Olah Hikayat','Warisan Bahasa','Pentas Warisan'];
  const statuses={draft:'Draf',confirmed:'Disahkan Guru',published:'Diterbitkan',
    revision_requested:'Perlu Penambahbaikan',submitted:'Dihantar',reviewed:'Disemak',
    planned:'Dirancang',in_progress:'Sedang Dilaksanakan',completed:'Selesai'};
  const selected=Object.fromEntries(Object.keys(pages).map(k=>[k,{classId:'',studentId:'',missionId:1}]));
  let current=null,loading=false,initialized=false;
  const api=(url,options)=>window.hnApiRequest(url,options);
  const el=(tag,text,cls)=>{
    const n=document.createElement(tag);if(cls)n.className=cls;
    if(text!==undefined)n.textContent=String(text);return n;
  };
  function button(text,callback,cls=''){
    const b=el('button',text,cls);b.type='button';b.addEventListener('click',callback);return b;
  }
  function field(text,input){
    const label=el('label',text,'hn-learning-field');label.append(input);return label;
  }
  function select(options,value){
    const s=document.createElement('select');
    for(const [id,name] of options)s.add(new Option(String(name),String(id)));
    if(value!==undefined)s.value=String(value);return s;
  }
  function textarea(text,max=1500,value=''){
    const n=document.createElement('textarea');n.rows=3;n.maxLength=max;n.value=String(value||'');n.placeholder=text;
    return field(text,n);
  }
  function intro(root,title,description){
    root.replaceChildren(el('h2',title),el('p',description,'hn-learning-intro'));
  }
  function message(root,msg){
    let n=root.querySelector('.hn-learning-message');
    if(!n){n=el('p','','hn-learning-message');n.setAttribute('role','status');root.append(n);}
    n.textContent=msg;
  }
  function ownStudents(clsId){
    return (current?.students||[]).filter(x=>x.active&&(!clsId||x.class_id===clsId))
      .sort((a,b)=>a.display_name.localeCompare(b.display_name,'ms'));
  }
  const same=(a,b)=>String(a)===String(b);
  function stateOf(key){
    const x=selected[key],classes=current?.classes||[];
    if(!classes.some(c=>same(c.id,x.classId))){
      const preferred=window.hnTeacherSettings?.getDefaultClassId?.();
      x.classId=classes.find(c=>same(c.id,preferred))?.id||classes[0]?.id||'';
    }
    const eligible=ownStudents(x.classId);
    if(!eligible.some(p=>same(p.id,x.studentId)))x.studentId=eligible[0]?.id||'';
    return x;
  }
  function filters(root,key,{student=true,mission=true}={}){
    const x=stateOf(key),line=el('div','','hn-learning-filters');
    const c=select((current.classes||[]).map(r=>[r.id,r.name+' ('+r.school_year+')']),x.classId);
    line.append(field('Kelas',c));
    c.addEventListener('change',()=>{x.classId=c.value;x.studentId='';x.videoId='';render(key);});
    if(student){
      const people=ownStudents(x.classId);
      const p=select(people.map(r=>[r.id,r.display_name+' · '+r.login_id]),x.studentId);
      p.addEventListener('change',()=>{x.studentId=p.value;x.videoId='';render(key);});
      line.append(field('Murid',p));
    }
    if(mission){
      const m=select(names.map((name,i)=>[i+1,'Misi '+(i+1)+' · '+name]),x.missionId);
      m.addEventListener('change',()=>{x.missionId=Number(m.value);x.videoId='';render(key);});
      line.append(field('Misi',m));
    }
    root.append(line);return x;
  }
  function matchingProgress(studentId,missionId){
    return (current.progress||[]).filter(x=>same(x.studentId,studentId)&&x.missionId===missionId)
      .sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt))[0];
  }
  function matchingPbd(studentId,missionId){
    return current.learning.assessments.find(x=>same(x.student_id,studentId)&&x.mission_id===missionId);
  }
  function done(p){return p?.recordType==='latihan'&&p.completed===true;}
  function safePercent(part,total){return total?Math.round(part/total*100):0;}
  function bar(root,name,value,total){
    const line=el('div','','hn-learning-bar');
    const header=el('div','','hn-learning-bar-header');
    header.append(el('span',name),el('strong',value+' / '+total+' ('+safePercent(value,total)+'%)'));
    const track=el('div','','hn-learning-track');
    const fill=el('span','','hn-learning-fill');fill.style.width=safePercent(value,total)+'%';
    track.setAttribute('role','progressbar');track.setAttribute('aria-label',name);
    track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
    track.setAttribute('aria-valuenow',String(safePercent(value,total)));track.append(fill);
    line.append(header,track);root.append(line);
  }
  function empty(root,detail){
    root.append(el('p',detail||'Belum ada data untuk pilihan ini.','hn-learning-muted'));
  }
  async function post(path,body,root){
    const r=await api(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok){
      const explanations={PBD_REVISION_CONFLICT:'Rekod telah berubah. Muat semula sebelum menyimpan.',
        STUDENT_NOT_IN_CLASS:'Akaun murid ini bukan dalam kelas anda.',
        INVALID_PBD_ASSESSMENT:'Sila lengkapkan TP, rubrik, evidens dan justifikasi sebelum mengesahkan.',
        INVALID_FEEDBACK:'Sila isi sekurang-kurangnya satu ruangan ulasan dengan jelas.',
        INVALID_INTERVENTION:'Sila sediakan pelan bimbingan sekurang-kurangnya 10 aksara.'};
      message(root,explanations[r.data?.error]||'Tidak dapat menyimpan. Sila semak maklumat atau cuba semula.');
    }
    return r;
  }
  async function reload(key){
    const result=await api('/api/teacher/learning');
    if(result.ok){current.learning=result.data;render(key);}
    else message(pages[key],'Rekod tidak dapat dimuatkan. Sila cuba semula.');
  }
  function renderPbd(){
    const root=pages.pbd;
    intro(root,'Pentaksiran Bilik Darjah (PBD)',
      'Pentaksiran berdasarkan evidens dan pertimbangan profesional Guru. Markah latihan permainan tidak menentukan Tahap Penguasaan secara automatik.');
    const x=filters(root,'pbd');
    if(!x.studentId){empty(root,'Daftarkan murid dalam kelas untuk memulakan pentaksiran.');return;}
    const p=matchingProgress(x.studentId,x.missionId);
    const recent=(current.learning.portfolio||[]).filter(r=>same(r.student_id,x.studentId)&&r.mission_id===x.missionId);
    const existing=matchingPbd(x.studentId,x.missionId);
    const evidencePanel=el('section','','hn-learning-panel');
    evidencePanel.append(el('h3','Evidens dan rekod latihan'));
    evidencePanel.append(el('p','Status latihan: '+(done(p)?'Selesai':p?'Belum selesai':'Belum ada rekod')+
      ' · '+(p?.attemptCount||0)+' percubaan · Markah terakhir: '+
      (p?.lastScore!==null&&p?.lastScore!==undefined?p.lastScore+' / '+p.lastTotal:'Belum ada markah')));
    if(!recent.length)empty(evidencePanel,'Belum ada karya bertulis dihantar untuk misi ini.');
    else for(const item of recent.slice(0,3)){
      evidencePanel.append(el('strong',item.title));
      const text=el('p',item.content,'hn-learning-evidence');evidencePanel.append(text);
      evidencePanel.append(el('small','Dihantar pada '+new Date(item.created_at).toLocaleString('ms-MY')));
    }
    root.append(evidencePanel);
    const form=el('form','','hn-learning-form');
    const tp=select([['','Belum ditetapkan'],...[1,2,3,4,5,6].map(n=>[n,'TP'+n])],existing?.tp??'');
    form.append(field('Tahap Penguasaan (ditetapkan Guru)',tp));
    form.append(el('p','Skala rubrik 1–4 bagi pemerhatian Guru; pilih 0 jika tidak berkaitan dengan misi.','hn-learning-muted'));
    const scores=el('div','','hn-learning-rubric');
    const dims=[['olah','Pengolahan cerita'],['bahasa','Keindahan bahasa'],['santun','Kesantunan bahasa'],['persembahan','Persembahan kreatif']];
    const inputs={};
    for(const [id,label] of dims){
      const val=select([[0,'Tidak dinilai'],...[1,2,3,4].map(n=>[n,String(n)])],existing?.rubric?.[id]??0);
      inputs[id]=val;scores.append(field(label,val));
    }
    form.append(scores);
    const ev=textarea('Evidens yang diperhatikan (min. 12 aksara untuk pengesahan)',2500,existing?.evidence);
    const why=textarea('Justifikasi pertimbangan profesional Guru',2500,existing?.justification);
    form.append(ev,why);
    const previous=el('p',existing?'Status: '+(statuses[existing.status]||existing.status)+' · Versi '+existing.revision:
      'Belum ada pentaksiran untuk misi ini.','hn-learning-muted');
    form.append(previous);
    const actions=el('div','','hn-learning-actions');
    let saving=false;
    const save=async status=>{
      if(saving)return;
      if(status==='confirmed'&&!confirm('Sahkan TP murid ini? Pengesahan akan direkodkan dalam sejarah pentaksiran.'))return;
      saving=true;
      const payload={studentId:x.studentId,missionId:x.missionId,expectedRevision:existing?.revision||0,
        tp:tp.value?Number(tp.value):null,rubric:Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,Number(v.value)])),
        evidence:ev.querySelector('textarea').value,justification:why.querySelector('textarea').value,status};
      try{const result=await post('/api/teacher/pbd',payload,root);if(result.ok)await reload('pbd');}
      catch{message(root,'Sambungan terganggu. Sila cuba lagi.');}
      finally{saving=false;}
    };
    actions.append(button('Simpan Draf',()=>save('draft')),
      button('Sahkan Tahap Penguasaan',()=>save('confirmed'),'hn-learning-primary'));
    form.addEventListener('submit',event=>event.preventDefault());
    form.append(actions);root.append(form);
    root.append(el('p','Rekod TP yang disahkan hanya dipaparkan kepada Murid selepas Guru membuat pengesahan. Setiap perubahan mempunyai rekod sejarah dan audit.','hn-learning-muted'));
  }
  function renderAnalysis(){
    const root=pages.analysis;
    intro(root,'Analisis Prestasi','Pantau kemajuan latihan, trend percubaan dan tindakan bimbingan. Analisis ini bukan penetapan TP secara automatik.');
    const x=filters(root,'analysis',{student:false,mission:false});
    const people=ownStudents(x.classId);const ids=new Set(people.map(x=>x.id));
    const cards=el('div','', 'hn-learning-graph-grid');
    for(let mission=1;mission<=4;mission++){
      const card=el('section','','hn-learning-panel');
      card.append(el('h3','Misi '+mission+' · '+names[mission-1]));
      const completed=people.filter(p=>done(matchingProgress(p.id,mission))).length;
      bar(card,'Murid selesai',completed,people.length);
      const attempts=people.reduce((sum,p)=>sum+(matchingProgress(p.id,mission)?.attemptCount||0),0);
      card.append(el('p','Jumlah percubaan direkodkan: '+attempts,'hn-learning-muted'));cards.append(card);
    }
    root.append(cards);
    const support=el('section','','hn-learning-panel');
    support.append(el('h3','Murid Perlu Bimbingan dan Belum Siap'));
    const table=el('table');const tbody=el('tbody');
    const head=el('thead');const tr=el('tr');
    ['Nama murid','Misi belum selesai','Petunjuk bimbingan'].forEach(v=>tr.append(el('th',v)));
    head.append(tr);table.append(head,tbody);
    for(const person of people){
      const pending=[],reason=[];
      for(let i=1;i<=4;i++){
        const p=matchingProgress(person.id,i);
        if(done(p))continue;
        pending.push('Misi '+i);
        if(p&&(p.attemptCount>=2||(typeof p.lastScore==='number'&&typeof p.lastTotal==='number'&&
            p.lastTotal>0&&p.lastScore/p.lastTotal<0.6)))reason.push('Misi '+i);
      }
      if(!pending.length)continue;
      const row=el('tr');
      [person.display_name,pending.join(', '),reason.length?reason.join(', '):'Belum cukup data untuk bimbingan']
        .forEach(v=>row.append(el('td',v)));
      tbody.append(row);
    }
    if(!tbody.childNodes.length)empty(support,'Semua latihan empat misi telah diselesaikan bagi murid aktif dalam kelas.');
    else{const wrap=el('div','','table-wrap');wrap.append(table);support.append(wrap);}
    root.append(support);
    const interventions=current.learning.interventions||[];
    const form=el('section','','hn-learning-panel');form.append(el('h3','Rancang Intervensi Individu'));
    const pick=filters(form,'analysis');
    if(pick.studentId){
      const plan=textarea('Pelan bimbingan atau latihan tambahan (minimum 10 aksara)',1500);
      const status=select([['planned','Dirancang'],['in_progress','Sedang Dilaksanakan'],['completed','Selesai']],'planned');
      form.append(plan,field('Status pelan',status));
      form.append(button('Simpan Pelan Bimbingan',async()=>{
        const payload={studentId:pick.studentId,missionId:pick.missionId,
          plan:plan.querySelector('textarea').value,status:status.value};
        try{const r=await post('/api/teacher/interventions',payload,form);if(r.ok)await reload('analysis');}
        catch{message(form,'Sambungan terganggu.');}
      },'hn-learning-primary'));
    }
    const history=el('div','','hn-learning-history');
    history.append(el('h3','Tindakan Susulan Terkini'));
    for(const item of interventions.filter(v=>ids.has(v.student_id)).slice(0,15)){
      const person=people.find(x=>same(x.id,item.student_id));
      const row=el('div','','hn-learning-entry');
      row.append(el('strong',(person?.display_name||'Murid')+' · Misi '+item.mission_id+' · '+(statuses[item.status]||item.status)));
      row.append(el('p',item.plan));
      if(item.status!=='completed'){
        row.append(button('Tandakan Selesai',async()=>{
          try{const r=await post('/api/teacher/interventions',{
            studentId:item.student_id,missionId:item.mission_id,
            interventionId:item.id,plan:item.plan,status:'completed'},history);
            if(r.ok)await reload('analysis');
          }catch{message(history,'Sambungan bermasalah.');}
        }));
      }history.append(row);
    }
    if(history.childNodes.length===1)empty(history,'Belum ada intervensi direkodkan.');
    root.append(form,history);
  }
  function renderFeedback(){
    const root=pages.feedback;
    intro(root,'Maklum Balas Guru','Berikan ulasan membina yang boleh dibaca Murid apabila diterbitkan. Draf kekal dalam akaun Guru.');
    const x=filters(root,'feedback');
    if(!x.studentId){empty(root,'Tiada murid aktif untuk kelas ini.');return;}
    const list=current.learning.feedback.filter(r=>same(r.student_id,x.studentId)&&r.mission_id===x.missionId);
    const previous=list[0];
    const form=el('div','','hn-learning-form');
    const strengths=textarea('Kekuatan Murid',1500,previous?.strengths);
    const improvements=textarea('Aspek Penambahbaikan',1500,previous?.improvements);
    const next=textarea('Cadangan Tindakan Seterusnya',1500,previous?.next_steps);
    form.append(strengths,improvements,next);
    // Link a published Misi 4 comment to the precise private recording being reviewed.
    let videoSelect=null;
    if(x.missionId===4){
      const recordingPanel=el('section','','hn-learning-panel');
      recordingPanel.append(el('h3','Rakaman Misi 4 untuk Dinilai'));
      videoSelect=select([['','Tiada rakaman dipilih']],selected.feedback.videoId||previous?.video_id||'');
      recordingPanel.append(field('Pilih rakaman murid',videoSelect));
      const watchContainer=el('div','','hn-feedback-watch');
      const watch=button('▶ Tonton Rakaman Dipilih',()=>{
        const id=videoSelect.value;
        watchContainer.replaceChildren();
        if(!id)return;
        const video=document.createElement('video');
        video.controls=true;video.playsInline=true;video.preload='none';
        video.style.cssText='width:100%;max-width:660px;margin:12px 0;border-radius:12px';
        video.src='/api/misi4/watch/'+encodeURIComponent(id);
        video.addEventListener('error',()=>message(recordingPanel,'Rakaman tidak dapat dimainkan. Semak sesi guru atau storan Neon.'));
        watchContainer.append(video);
      },'hn-learning-primary');
      recordingPanel.append(watch,watchContainer);
      form.append(recordingPanel);
      void (async()=>{
        try{
          const r=await api('/api/misi4/teacher');
          if(!r.ok)throw Error('NOT_AVAILABLE');
          const videos=(r.data?.submissions||[]).filter(v=>same(v.student_id,x.studentId));
          videos.forEach(v=>videoSelect.add(new Option(
            new Date(v.submitted_at).toLocaleString('ms-MY')+' · '+v.id.slice(0,8),v.id
          )));
          const target=selected.feedback.videoId||previous?.video_id||'';
          if(videos.some(v=>same(v.id,target)))videoSelect.value=target;
          if(!videos.length)recordingPanel.append(el('p','Belum ada rakaman aktif untuk murid ini. Komen umum Misi 4 masih boleh diterbitkan.','hn-learning-muted'));
        }catch{recordingPanel.append(el('p','Senarai rakaman tidak dapat dimuatkan. Komen umum masih boleh diterbitkan.','hn-learning-muted'));}
      })();
      videoSelect.addEventListener('change',()=>{selected.feedback.videoId=videoSelect.value;});
    }
    form.append(el('p',previous?'Maklum balas terkini: '+(statuses[previous.status]||previous.status)+
      ' · '+new Date(previous.updated_at).toLocaleString('ms-MY'):'Belum ada ulasan untuk misi ini.','hn-learning-muted'));
    const save=async status=>{
      if(status!=='draft'&&!confirm('Terbitkan maklum balas ini kepada akaun Murid?'))return;
      try{const r=await post('/api/teacher/feedback',{
        studentId:x.studentId,missionId:x.missionId,
        strengths:strengths.querySelector('textarea').value,
        improvements:improvements.querySelector('textarea').value,
        nextSteps:next.querySelector('textarea').value,
        status,...(videoSelect?.value?{videoId:videoSelect.value}:{}),...(previous?{feedbackId:previous.id}:{})
      },root);if(r.ok){selected.feedback.videoId='';await reload('feedback');}}
      catch{message(root,'Sambungan bermasalah. Sila cuba lagi.');}
    };
    const actions=el('div','','hn-learning-actions');
    actions.append(button('Simpan Draf',()=>save('draft')),
      button('Terbitkan kepada Murid',()=>save('published'),'hn-learning-primary'),
      button('Minta Penambahbaikan',()=>save('revision_requested')));
    form.append(actions);root.append(form);
    const history=el('section','','hn-learning-panel');history.append(el('h3','Rekod Maklum Balas Kelas'));
    const ids=new Set(ownStudents(x.classId).map(p=>p.id));
    const feedback=current.learning.feedback.filter(r=>ids.has(r.student_id)).slice(0,25);
    if(!feedback.length)empty(history,'Belum ada maklum balas disimpan.');
    for(const item of feedback){
      const person=ownStudents(x.classId).find(p=>same(p.id,item.student_id));
      const card=el('div','','hn-learning-entry');
      card.append(el('strong',(person?.display_name||'Murid')+' · Misi '+item.mission_id+' · '+(statuses[item.status]||item.status)));
      if(item.strengths)card.append(el('p','Kekuatan: '+item.strengths));
      if(item.improvements)card.append(el('p','Penambahbaikan: '+item.improvements));
      if(item.next_steps)card.append(el('p','Cadangan: '+item.next_steps));
      history.append(card);
    }root.append(history);
  }
  async function renderMisi4Videos(root,studentId){
    const panel=el('section','','hn-learning-panel');
    panel.append(el('h3','Rakaman Video Misi 4'));
    root.append(panel);
    try{
      const result=await api('/api/misi4/teacher');
      if(!result.ok){empty(panel,'Rakaman belum tersedia. Pastikan storan video dan pangkalan data dikonfigurasi.');return;}
      const videos=(result.data?.submissions||[]).filter(v=>same(v.student_id,studentId));
      if(!videos.length){empty(panel,'Belum ada rakaman video yang disahkan untuk murid ini.');return;}
      for(const item of videos){
        const card=el('div','','hn-learning-entry');
        card.append(el('strong',item.display_name+' · '+item.class_name+' · Misi 4'));
        card.append(el('p','Dihantar pada '+new Date(item.submitted_at).toLocaleString('ms-MY'),'hn-learning-muted'));
        const watch=button('▶ Tonton Rakaman',async()=>{
          let video=card.querySelector('video');
          if(!video){video=document.createElement('video');video.controls=true;video.playsInline=true;
            video.style.cssText='width:100%;max-width:540px;border-radius:12px;margin-top:10px';
            card.append(video);}
          video.src='/api/misi4/watch/'+encodeURIComponent(item.id);video.load();
        },'hn-learning-primary');
        card.append(watch,el('p','Gunakan menu PBD dan Maklum Balas Guru untuk menilai persembahan ini.','hn-learning-muted'));
        panel.append(card);
      }
    }catch{empty(panel,'Gagal memuatkan rekod video.');}
  }
  function renderPortfolio(){
    const root=pages.portfolio;
    intro(root,'Portfolio Digital','Karya bertulis serta rakaman video Misi 4 yang dihantar oleh Murid.');
    const x=filters(root,'portfolio',{mission:false});
    if(!x.studentId){empty(root,'Tiada murid aktif dalam kelas ini.');return;}
    void renderMisi4Videos(root,x.studentId);
    const records=current.learning.portfolio.filter(r=>same(r.student_id,x.studentId));
    const count=el('p',records.length+' karya bertulis direkodkan untuk murid ini.','hn-learning-muted');
    root.append(count);
    if(!records.length){empty(root,'Belum ada karya dihantar. Murid boleh membuka Portfolio Pengembara untuk menghantar teks.');return;}
    for(const item of records){
      const card=el('article','','hn-learning-panel');
      card.append(el('h3',item.title));
      card.append(el('p','Misi '+item.mission_id+' · '+(statuses[item.status]||item.status)+
        ' · '+new Date(item.created_at).toLocaleString('ms-MY'),'hn-learning-muted'));
      card.append(el('pre',item.content,'hn-learning-work'));
      const actions=el('div','','hn-learning-actions');
      const update=async status=>{
        try{const r=await post('/api/teacher/portfolio/review',{entryId:item.id,status},card);
          if(r.ok)await reload('portfolio');
        }catch{message(card,'Gagal menyimpan status semakan.');}
      };
      actions.append(button('Tandakan Disemak',()=>update('reviewed'),'hn-learning-primary'),
        button('Minta Penambahbaikan',()=>update('revision_requested')));
      card.append(actions);root.append(card);
    }
  }
  function reportData(){
    const x=stateOf('reports'),all=ownStudents(x.classId);
    const mode=selected.reports.mode||'student';
    const people=mode==='class'?all:all.filter(p=>same(p.id,x.studentId));
    const rows=[];
    for(const person of people)for(let mission=1;mission<=4;mission++){
      const progress=matchingProgress(person.id,mission);
      const assessment=matchingPbd(person.id,mission);
      const validTp=assessment?.status==='confirmed'?assessment.tp:null;
      const fb=current.learning.feedback.filter(f=>same(f.student_id,person.id)&&f.mission_id===mission&&f.status!=='draft');
      const portfolio=current.learning.portfolio.filter(f=>same(f.student_id,person.id)&&f.mission_id===mission);
      const interventions=current.learning.interventions.filter(f=>same(f.student_id,person.id)&&f.mission_id===mission);
      rows.push({
        name:person.display_name,id:person.login_id,cls:person.class_name,mission,
        status:done(progress)?'Latihan selesai':progress?'Belum selesai':'Belum mula',
        attempts:progress?.attemptCount||0,
        score:typeof progress?.lastScore==='number'?progress.lastScore+'/'+progress.lastTotal:'',
        tp:validTp?'TP'+validTp:'Belum disahkan',
        feedback:fb.length,portfolio:portfolio.length,intervention:interventions.length
      });
    }return rows;
  }
  function csvQuote(value){
    let s=String(value??'');
    if(/^[=+\-@\t\r]/.test(s))s="'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  }
  function csvExport(rows){
    const columns=[
      ['Nama Murid','name'],['ID Murid','id'],['Kelas','cls'],
      ['Misi','mission'],['Status Latihan','status'],['Percubaan','attempts'],
      ['Markah Latihan Terakhir','score'],['TP Disahkan Guru','tp'],
      ['Maklum Balas Diterbitkan','feedback'],['Karya Bertulis','portfolio'],
      ['Intervensi','intervention']
    ];
    return '\uFEFF'+[columns.map(x=>x[0]),...rows.map(r=>columns.map(x=>r[x[1]]))]
      .map(row=>row.map(csvQuote).join(',')).join('\r\n');
  }
  function renderReports(){
    const root=pages.reports;
    intro(root,'Laporan dan Eksport','Jana laporan berasaskan rekod sebenar tanpa kata laluan murid. TP hanya dipaparkan jika sudah disahkan Guru.');
    const x=filters(root,'reports',{mission:false});
    const opts=select([['student','Laporan Murid'],['class','Laporan Seluruh Kelas']],selected.reports.mode||'student');
    const controls=el('div','','hn-learning-filters');
    controls.append(field('Jenis Laporan',opts));root.append(controls);
    opts.addEventListener('change',()=>{selected.reports.mode=opts.value;render('reports');});
    const rows=reportData();
    const printArea=el('section','','hn-learning-print');
    printArea.append(el('h2',opts.value==='class'?'Laporan Kelas':'Laporan Murid'));
    const cls=current.classes.find(c=>same(c.id,x.classId));
    printArea.append(el('p',(cls?.name||'Kelas')+' · Sesi '+(cls?.school_year||'')+' · '+new Date().toLocaleDateString('ms-MY'),
      'hn-learning-muted'));
    if(!rows.length)empty(printArea,'Tiada murid atau rekod untuk laporan ini.');
    else{
      const table=el('table'),thead=el('thead'),tr=el('tr');
      ['Murid','Misi','Status','Percubaan','Markah Terakhir','TP Guru','Portfolio','Intervensi'].forEach(label=>tr.append(el('th',label)));
      thead.append(tr);table.append(thead);
      const tbody=el('tbody');
      for(const row of rows){
        const tr=el('tr');
        [row.name+' ('+row.id+')',row.mission,row.status,row.attempts,row.score||'—',
          row.tp,row.portfolio,row.intervention].forEach(v=>tr.append(el('td',v)));
        tbody.append(tr);
      }
      table.append(tbody);const wrap=el('div','','table-wrap');wrap.append(table);printArea.append(wrap);
      const doneCount=rows.filter(r=>r.status==='Latihan selesai').length;
      printArea.append(el('p','Rumusan: '+doneCount+' daripada '+rows.length+' latihan selesai. '+
        'Baki '+(rows.length-doneCount)+' belum selesai. Tahap Penguasaan tidak ditentukan oleh markah permainan.',
        'hn-learning-conclusion'));
    }
    root.append(printArea);
    const actions=el('div','','hn-learning-actions');
    actions.append(button('Eksport CSV (Excel)',()=>{
      if(!rows.length)return;
      const csv=csvExport(rows),blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download='Laporan_Hikayat_'+(cls?.name||'Kelas').replace(/[^A-Za-z0-9-]/g,'_')+
        '_'+opts.value+'.csv';
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),15000);
    },'hn-learning-primary'));
    actions.append(button('Cetak / Simpan PDF',()=>{
      if(!rows.length)return;
      document.body.classList.add('hn-print-learning-report');
      const cleanup=()=>document.body.classList.remove('hn-print-learning-report');
      window.addEventListener('afterprint',cleanup,{once:true});
      window.print();
    }));
    actions.append(button('Muat Semula Data',()=>void loadData()));
    root.append(actions,el('p','Fail CSV boleh dibuka dalam Excel. Untuk PDF, pilih “Save as PDF” dalam tetingkap cetakan. Simpan laporan secara sulit.','hn-learning-muted'));
  }
  function render(key){
    if(!current)return;
    ({pbd:renderPbd,analysis:renderAnalysis,feedback:renderFeedback,
      portfolio:renderPortfolio,reports:renderReports})[key]?.();
  }
  async function loadData(){
    if(loading)return;loading=true;
    const targets=Object.values(pages).filter(Boolean);
    for(const page of targets)message(page,'Memuatkan rekod pembelajaran...');
    try {
      const [classes,students,progress,learning]=await Promise.all([
        api('/api/teacher/classes'),api('/api/teacher/students'),
        api('/api/teacher/progress'),api('/api/teacher/learning')
      ]);
      if([classes,students,progress,learning].some(r=>!r.ok)){
        for(const page of targets){
          intro(page,'Maklumat belum tersedia','Pentaksiran dan portfolio memerlukan sambungan pangkalan data yang telah dikemas kini.');
          page.append(button('Cuba Lagi',()=>void loadData()));
        }
        return;
      }
      current={classes:classes.data.classes,students:students.data.students,
        progress:progress.data.progress,learning:learning.data};
      for(const key of Object.keys(pages))render(key);
    }catch {
      for(const page of targets){
        intro(page,'Tidak dapat memuatkan data','Semak sambungan internet dan cuba lagi.');
        page.append(button('Cuba Lagi',()=>void loadData()));
      }
    }finally{loading=false;}
  }
  async function init(){
    if(location.hash!=='#guru')return;
    const user=await window.hnGetSession?.().catch(()=>null);
    if(user?.role!=='guru'||user.mustChangePassword)return;
    if(!initialized){
      initialized=true;
      await window.hnTeacherSettingsReady?.catch?.(()=>null);
      await loadData();
    }
  }
  window.addEventListener('hn:teacher-review-video',event=>{
    const detail=event.detail||{};
    if(!current||!detail.studentId||!detail.videoId)return;
    const person=ownStudents().find(p=>same(p.id,detail.studentId));
    if(!person)return;
    selected.feedback.classId=person.class_id;
    selected.feedback.studentId=person.id;
    selected.feedback.missionId=4;
    selected.feedback.videoId=detail.videoId;
    render('feedback');
  });
  window.addEventListener('hashchange',()=>void init());
  void init();
})();