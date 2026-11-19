/* Explicit pupil text-portfolio submissions and teacher-published feedback.
   No automatic uploads from the local game drafts; no video/media storage. */
(async()=>{
  'use strict';
  const root=document.getElementById('murid-portfolio');
  if(!root)return;
  const user=await window.hnGetSession?.().catch(()=>null);
  if(!user||user.role!=='murid'||user.mustChangePassword)return;
  const api=(url,opts)=>window.hnApiRequest(url,opts);
  const el=(tag,text,cls)=>{
    const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);
    if(cls)n.className=cls;return n;
  };
  const section=el('section','','hn-pupil-portfolio');
  section.append(el('h2','Hantar Karya Bertulis'));
  section.append(el('p','Pilih misi dan hantar karya teks kepada Guru. Rakaman Misi 4 pula dihantar melalui butang Hantar dalam permainan selepas disahkan oleh sistem.','hn-learning-muted'));
  const form=el('form','','hn-learning-form');
  const choose=el('select');
  ['Jejak Naskhah Pusaka','Balai Olah Hikayat','Warisan Bahasa','Pentas Warisan'].forEach((name,i)=>{
    choose.add(new Option('Misi '+(i+1)+' · '+name,String(i+1)));
  });
  const label=(name,input)=>{
    const n=el('label',name,'hn-learning-field');n.append(input);return n;
  };
  const title=document.createElement('input');
  title.type='text';title.maxLength=120;title.required=true;title.placeholder='Tajuk karya';
  const content=document.createElement('textarea');
  content.rows=6;content.maxLength=5000;content.minLength=20;content.required=true;
  content.placeholder='Tampalkan atau tulis hasil kerja anda (minimum 20 aksara)';
  form.append(label('Pilih Misi',choose),label('Tajuk Karya',title),label('Hasil Penulisan',content));
  const submit=el('button','Hantar Karya kepada Guru','hn-learning-primary');submit.type='submit';
  const msg=el('p','','hn-learning-message');msg.setAttribute('role','status');
  form.append(submit,msg);section.append(form);
  const list=el('section','','hn-pupil-portfolio-records');section.append(list);
  root.append(section);
  async function load(){
    const r=await api('/api/student/learning');
    if(!r.ok){list.replaceChildren(el('p','Rekod PBD dan portfolio tidak dapat dipaparkan. Cuba lagi selepas perkhidmatan dikemas kini.'));return;}
    const p=r.data||{};
    list.replaceChildren(el('h3','Rekod Karya Saya'));
    if(!p.portfolio?.length)list.append(el('p','Belum ada karya yang dihantar.','hn-learning-muted'));
    for(const item of (p.portfolio||[]).slice(0,25)){
      const card=el('article','','hn-learning-entry');
      card.append(el('strong',item.title+' · Misi '+item.mission_id));
      const status={submitted:'Dihantar',reviewed:'Disemak Guru',revision_requested:'Perlu Penambahbaikan'};
      card.append(el('p',(status[item.status]||item.status)+' · '+
        new Date(item.created_at).toLocaleString('ms-MY'),'hn-learning-muted'));
      card.append(el('p',item.content,'hn-pupil-work-preview'));list.append(card);
    }
    list.append(el('h3','Rakaman dan Maklum Balas Misi 4'));
    try{
      const videoResponse=await api('/api/misi4/state');
      const videos=videoResponse.ok?(videoResponse.data.submissions||[]):[];
      if(!videos.length)list.append(el('p','Belum ada rakaman Misi 4 dihantar kepada Guru.','hn-learning-muted'));
      for(const video of videos.slice(0,20)){
        const card=el('article','','hn-learning-entry');
        card.append(el('strong',(video.storyTitle||'Persembahan Hikayat')+' · '+video.referenceNo));
        card.append(el('p','Status: '+video.status+' · '+new Date(video.submittedAt).toLocaleString('ms-MY'),'hn-learning-muted'));
        if(video.review?.comment){
          card.append(el('p','Maklum Balas Guru: '+video.review.comment));
        }else{
          card.append(el('p','Rakaman diterima dan masih menunggu semakan Guru.','hn-learning-muted'));
        }
        card.append(el('button','▶ Lihat Rakaman Saya'));
        const watch=card.querySelector('button');
        watch.type='button';
        watch.addEventListener('click',async()=>{
          try{
            const r=await api('/api/misi4/media/'+encodeURIComponent(video.id));
            if(!r.ok){watch.textContent='Rakaman tidak dapat dibuka. Cuba semula.';return;}
            const player=document.createElement('video');
            player.controls=true;player.playsInline=true;player.preload='none';
            player.style.cssText='display:block;max-width:100%;width:100%;max-height:320px;margin-top:10px';
            player.src=r.data.url;player.load();card.append(player);
            watch.remove();
          }catch{watch.textContent='Tidak dapat membuka rakaman. Cuba lagi.';}
        });
        list.append(card);
      }
    }catch{
      list.append(el('p','Rekod rakaman belum dapat dimuatkan. Cuba lagi.','hn-learning-muted'));
    }
    list.append(el('h3','Maklum Balas Guru'));
    if(!p.feedback?.length)list.append(el('p','Belum ada maklum balas diterbitkan.','hn-learning-muted'));
    for(const item of (p.feedback||[]).slice(0,15)){
      const card=el('article','','hn-learning-entry');
      card.append(el('strong','Misi '+item.mission_id+
        (item.status==='revision_requested'?' · Perlu Penambahbaikan':' · Maklum Balas')));
      if(item.strengths)card.append(el('p','Kekuatan: '+item.strengths));
      if(item.improvements)card.append(el('p','Penambahbaikan: '+item.improvements));
      if(item.next_steps)card.append(el('p','Cadangan Guru: '+item.next_steps));
      list.append(card);
    }
    list.append(el('h3','Tahap Penguasaan Disahkan Guru'));
    if(!p.assessments?.length)list.append(el('p','Belum ada pentaksiran yang disahkan.','hn-learning-muted'));
    for(const a of p.assessments||[]){
      list.append(el('p','Misi '+a.mission_id+' · TP'+a.tp+
        ' · Disahkan Guru pada '+new Date(a.confirmed_at||a.updated_at).toLocaleDateString('ms-MY')));
    }
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const text=content.value.trim(),name=title.value.trim();
    if(name.length<3||text.length<20){
      msg.textContent='Sila masukkan tajuk dan teks karya sekurang-kurangnya 20 aksara.';return;
    }
    if(!confirm('Hantar karya bertulis ini kepada Guru? Ia akan disimpan di portfolio pembelajaran anda.'))return;
    submit.disabled=true;msg.textContent='Sedang menghantar karya...';
    try{
      const r=await api('/api/student/portfolio',{method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({missionId:Number(choose.value),title:name,content:text})});
      if(r.ok){
        msg.textContent='Karya berjaya dihantar kepada Guru.';title.value='';content.value='';
        await load();
      }else msg.textContent=r.data?.error==='CLASS_ENROLLMENT_REQUIRED'
        ?'Akaun belum ditetapkan kepada kelas. Maklumkan Guru.'
        :'Karya belum dapat dihantar. Sila cuba lagi.';
    }catch{msg.textContent='Sambungan terganggu. Sila cuba lagi.';}
    finally{submit.disabled=false;}
  });
  await load();
  root.append(el('button','↻ Muat Semula Portfolio','hn-learning-refresh'))
    .addEventListener('click',()=>void load());
})();