/* Tetapan Guru — authenticated, private and connected to Neon. */
(() => {
  'use strict';
  const root=document.getElementById('hn-teacher-settings-root');
  if(!root)return;
  const api=(url,options)=>window.hnApiRequest(url,options);
  const text=(tag,value,cls)=>{
    const node=document.createElement(tag);
    if(value!==undefined)node.textContent=String(value);
    if(cls)node.className=cls;
    return node;
  };
  const field=(label,input)=>{
    const wrap=text('label',label,'hn-settings-field');
    wrap.append(input);return wrap;
  };
  const button=(label,callback,cls)=>{
    const b=text('button',label,cls||'');b.type='button';
    b.addEventListener('click',callback);return b;
  };
  function section(title,desc){
    const box=text('section',undefined,'hn-settings-card');
    box.append(text('h3',title),text('p',desc,'hn-settings-description'));return box;
  }
  function status(root){
    const note=text('p','','hn-settings-status');note.setAttribute('role','status');root.append(note);
    return note;
  }
  function input(type,value='',maxLength=100){
    const e=document.createElement('input');e.type=type;e.maxLength=maxLength;
    e.value=value;return e;
  }
  function checkbox(label,checked){
    const wrap=text('label',undefined,'hn-settings-check');
    const control=document.createElement('input');control.type='checkbox';control.checked=!!checked;
    wrap.append(control,text('span',label));return {wrap,control};
  }
  function post(url,body){
    return api(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  }
  let current=null,classes=[],loading=null;
  window.hnTeacherSettings={getDefaultClassId:()=>current?.preferences?.default_class_id||null};
  function applyAppearance(prefs){
    const dash=document.getElementById('guru-view');
    if(!dash)return;
    dash.classList.toggle('hn-guru-compact',prefs.compact_tables===true);
    dash.classList.toggle('hn-guru-reduced-motion',prefs.reduce_motion===true);
    dash.classList.toggle('hn-guru-contrast',prefs.high_contrast===true);
  }
  async function refresh(){
    const [settings,classesResult]=await Promise.all([
      api('/api/teacher/settings'),api('/api/teacher/classes')
    ]);
    if(!settings.ok)throw Error(settings.data?.error||'SETTINGS_UNAVAILABLE');
    current=settings.data;
    classes=classesResult.ok?(classesResult.data.classes||[]):[];
    applyAppearance(current.preferences);
    render();return current;
  }
  function profileSection(){
    const box=section('Profil Guru',
      'Nama ini digunakan pada ucapan Selamat Datang dan rekod akaun. Pengesahan kata laluan diperlukan untuk menukarnya.');
    const login=input('text',current.profile.loginId);login.readOnly=true;
    const role=input('text','Guru');role.readOnly=true;
    const name=input('text',current.profile.name);name.required=true;
    const password=input('password','',128);password.autocomplete='current-password';
    box.append(field('ID Guru (tidak boleh diubah)',login),
      field('Peranan Akaun',role),field('Nama Paparan Guru',name),
      field('Kata Laluan Semasa untuk Pengesahan',password));
    const feedback=status(box);
    box.append(button('Simpan Profil Guru',async()=>{
      const value=name.value.trim();
      if(value.length<2||value.length>100){feedback.textContent='Nama perlu mengandungi 2 hingga 100 aksara.';return;}
      if(!password.value){feedback.textContent='Masukkan kata laluan semasa.';return;}
      const btn=box.querySelector('button');btn.disabled=true;
      feedback.textContent='Menyimpan profil...';
      try{
        const res=await post('/api/teacher/settings/profile',{name:value,currentPassword:password.value});
        password.value='';
        if(!res.ok){
          feedback.textContent=res.status===401?'Kata laluan semasa tidak betul.':
            'Profil tidak dapat dikemas kini. Semak nama dan cuba semula.';
          return;
        }
        current.profile.name=res.data.profile.name;
        const top=document.getElementById('hn-guru-top-name');
        const greeting=document.getElementById('hn-guru-greeting');
        const avatar=document.getElementById('hn-guru-avatar');
        if(top){top.textContent=current.profile.name;top.title=current.profile.name;}
        if(greeting)greeting.textContent=current.profile.name+'!';
        if(avatar)avatar.textContent=current.profile.name.split(/\s+/).slice(0,2)
          .map(x=>x.charAt(0).toLocaleUpperCase('ms-MY')).join('')||'GU';
        feedback.textContent='Nama Guru berjaya dikemas kini.';
      }catch{feedback.textContent='Sambungan bermasalah. Sila cuba semula.';}
      finally{btn.disabled=false;}
    },'hn-settings-primary'));
    return box;
  }
  function securitySection(){
    const box=section('Keselamatan Akaun',
      'Tukar kata laluan anda secara berkala. Selepas ditukar, sesi log masuk pada peranti lain akan ditamatkan.');
    const old=input('password','',128);old.autocomplete='current-password';
    const fresh=input('password','',128);fresh.autocomplete='new-password';
    const confirmNew=input('password','',128);confirmNew.autocomplete='new-password';
    box.append(field('Kata Laluan Semasa',old),
      field('Kata Laluan Baharu (minimum 12 aksara)',fresh),
      field('Sahkan Kata Laluan Baharu',confirmNew));
    const feedback=status(box);
    const save=button('Tukar Kata Laluan',async()=>{
      if(fresh.value.length<12||fresh.value.length>128){
        feedback.textContent='Kata laluan baharu mesti mempunyai 12 hingga 128 aksara.';return;
      }
      if(fresh.value!==confirmNew.value){
        feedback.textContent='Pengesahan kata laluan baharu tidak sepadan.';return;
      }
      if(fresh.value===old.value){
        feedback.textContent='Kata laluan baharu perlu berbeza daripada yang lama.';return;
      }
      save.disabled=true;feedback.textContent='Mengemas kini kata laluan...';
      try{
        const r=await post('/api/auth/change-password',{
          currentPassword:old.value,newPassword:fresh.value
        });
        old.value='';fresh.value='';confirmNew.value='';
        if(!r.ok){
          feedback.textContent=r.status===401?'Kata laluan semasa tidak tepat.':
            'Kata laluan tidak dapat diubah. Sila semak syarat keselamatan.';
          return;
        }
        feedback.textContent='Kata laluan berjaya ditukar. Sesi peranti lain telah ditamatkan.';
        await refreshSessions();
      }catch{feedback.textContent='Sambungan terputus. Sila cuba semula.';}
      finally{save.disabled=false;}
    },'hn-settings-primary');
    box.append(save);return box;
  }
  function preferenceSection(){
    const p=current.preferences;
    const box=section('Kelas Utama dan Keutamaan Paparan',
      'Tetapan ini disimpan pada akaun Guru, boleh digunakan semula apabila log masuk di peranti lain.');
    const dropdown=document.createElement('select');
    dropdown.add(new Option('Tiada kelas utama',''));
    for(const c of classes)dropdown.add(new Option(c.name+' · '+c.school_year,c.id));
    dropdown.value=p.default_class_id||'';
    if(!classes.some(c=>c.id===dropdown.value))dropdown.value='';
    const compact=checkbox('Paparan jadual padat untuk senarai murid dan laporan',p.compact_tables);
    const reduce=checkbox('Kurangkan animasi dan pergerakan paparan',p.reduce_motion);
    const contrast=checkbox('Kontras tinggi untuk teks dan kawalan Dashboard Guru',p.high_contrast);
    box.append(field('Kelas Utama',dropdown),compact.wrap,reduce.wrap,contrast.wrap);
    const feedback=status(box);
    const save=button('Simpan Keutamaan',async()=>{
      save.disabled=true;feedback.textContent='Menyimpan keutamaan Guru...';
      try{
        const r=await post('/api/teacher/settings/preferences',{
          defaultClassId:dropdown.value||null,
          compactTables:compact.control.checked,
          reduceMotion:reduce.control.checked,
          highContrast:contrast.control.checked,
          expectedRevision:p.revision
        });
        if(!r.ok){
          feedback.textContent=r.status===409?'Tetapan telah berubah di peranti lain. Muat semula sebelum cuba lagi.':
            'Tetapan tidak dapat disimpan. Cuba semula.';
          return;
        }
        current.preferences=r.data.preferences;
        applyAppearance(current.preferences);
        feedback.textContent='Keutamaan berjaya disimpan. Kelas utama digunakan apabila membuka semula lima menu pembelajaran.';
      }catch{feedback.textContent='Sambungan bermasalah. Sila cuba semula.';}
      finally{save.disabled=false;}
    },'hn-settings-primary');
    box.append(save);
    return box;
  }
  let sessionsBox;
  async function refreshSessions(){
    try{
      const r=await api('/api/teacher/settings');
      if(r.ok){current.sessions=r.data.sessions;drawSessions();}
    }catch{/* Stay on current data if temporarily offline. */}
  }
  function drawSessions(){
    if(!sessionsBox)return;
    sessionsBox.replaceChildren();
    const sessions=current.sessions||[];
    for(const s of sessions){
      const entry=text('div',undefined,'hn-settings-session');
      entry.append(text('strong',s.current?'Peranti ini (sesi semasa)':'Sesi pada peranti lain'));
      const created=new Date(s.createdAt);
      const expires=new Date(s.expiresAt);
      entry.append(text('span','Log masuk: '+(Number.isNaN(+created)?'—':created.toLocaleString('ms-MY'))+
        ' · Tamat: '+(Number.isNaN(+expires)?'—':expires.toLocaleString('ms-MY'))));
      sessionsBox.append(entry);
    }
    if(!sessions.length)sessionsBox.append(text('p','Tiada sesi aktif yang dapat dipaparkan.'));
  }
  function sessionsSection(){
    const box=section('Sesi dan Privasi Akaun',
      'Semak sesi log masuk yang masih aktif. Anda boleh menamatkan sesi lain tanpa menutup sesi pada peranti ini.');
    sessionsBox=text('div',undefined,'hn-settings-sessions');box.append(sessionsBox);
    drawSessions();
    const feedback=status(box);
    box.append(button('Muat Semula Senarai Sesi',async()=>{
      feedback.textContent='Menyemak sesi aktif...';
      await refreshSessions();feedback.textContent='Semakan selesai.';
    }));
    const stop=button('Log Keluar Semua Peranti Lain',async()=>{
      const id=current.profile.loginId;
      const confirmed=prompt('Taip ID Guru '+id+' untuk menamatkan semua sesi pada peranti lain:');
      if(confirmed===null)return;
      if(confirmed.trim()!==id){feedback.textContent='ID pengesahan tidak sepadan.';return;}
      stop.disabled=true;feedback.textContent='Menamatkan sesi lain...';
      try{
        const r=await post('/api/teacher/settings/sessions/logout-others',{confirmation:id});
        if(!r.ok){feedback.textContent='Sesi tidak dapat ditamatkan. Sila cuba semula.';return;}
        feedback.textContent=(r.data.revoked||0)+' sesi pada peranti lain telah ditamatkan.';
        await refreshSessions();
      }catch{feedback.textContent='Sambungan bermasalah. Sila cuba semula.';}
      finally{stop.disabled=false;}
    });
    box.append(stop);
    const privacy=section('Privasi dan Pengurusan Data',
      'Maklumat Murid hanya boleh diakses mengikut kebenaran kelas. Rekod PBD dan portfolio bukan maklumat awam.');
    privacy.append(text('p','Gunakan menu Laporan dan Eksport untuk laporan pembelajaran. Jangan edarkan fail yang mengandungi data murid melalui pautan awam.'));
    privacy.append(text('p','Penukaran hak akses, nyahaktif akaun Guru dan pemindahan kelas diurus melalui pentadbir sekolah.'));
    return [box,privacy];
  }
  function render(){
    if(!current)return;
    root.replaceChildren();
    const cards=text('div',undefined,'hn-settings-grid');
    cards.append(profileSection(),securitySection(),preferenceSection());
    for(const p of sessionsSection())cards.append(p);
    root.append(cards);
  }
  async function start(){
    if(location.hash!=='#guru')return null;
    const user=await window.hnGetSession?.().catch(()=>null);
    if(user?.role!=='guru'||user.mustChangePassword)return null;
    if(loading)return loading;
    loading=refresh().catch(()=>{
      root.replaceChildren(text('p','Tetapan belum dapat dimuatkan. Pastikan migrasi Neon Tetapan Guru sudah dijalankan dan sambungan tersedia.'));
      root.append(button('Cuba Lagi',()=>{loading=null;void start();}));
      return null;
    }).finally(()=>{loading=null;});
    return loading;
  }
  window.hnTeacherSettingsReady=start();
  window.addEventListener('hashchange',()=>{if(location.hash==='#guru')void start();});
})();