/* Pusat Warisan — Dashboard Admin. Rekod aktif datang daripada API berautentikasi. */
(() => {
  'use strict';
  const dashboard = document.getElementById('admin-view');
  if (!dashboard) return;
  const sidebar = dashboard.querySelector('.sidebar');
  const content = dashboard.querySelector('.dash-content');
  const breadcrumb = dashboard.querySelector('.breadcrumbs');
  if (!sidebar || !content) return;

  const pages = [
    ['admin-ringkasan','Ringkasan Sistem','⌂'],
    ['admin-organisasi','Pengurusan Organisasi','▣'],
    ['admin-kepimpinan','Kepimpinan Bahasa Melayu','♕'],
    ['admin-guru','Pengurusan Guru','♙'],
    ['admin-kelas','Pengurusan Kelas','▦'],
    ['admin-murid','Pengurusan Murid','♧'],
    ['admin-misi','Pemantauan Misi','◇'],
    ['admin-audit','Aktiviti & Log Audit','☷'],
    ['admin-penghantaran','Penghantaran & Karya','✒'],
    ['admin-laporan','Analitik & Laporan','▥'],
    ['admin-media','Pusat Media','◉'],
    ['admin-notifikasi','Notifikasi & Pengumuman','✉'],
    ['admin-backup','Sandaran & Pemulihan','↶'],
    ['admin-sistem','Tetapan Sistem','⚙']
  ];
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const pendingPages=new Set(['admin-organisasi','admin-audit','admin-media','admin-notifikasi','admin-backup']);
  const emptyTable = headings => '<div class="table-wrap"><table><thead><tr>' +
    headings.map(h => '<th>' + escapeHTML(h) + '</th>').join('') +
    '</tr></thead><tbody><tr><td colspan="' + headings.length +
    '" class="hn-admin-empty">Belum ada rekod daripada sistem yang disahkan.</td></tr></tbody></table></div>';
  const stats = items => '<div class="stats-grid three">' + items.map(item =>
    '<div class="stat"><span>' + escapeHTML(item) +
    '</span><strong>—</strong><em>Menunggu data sebenar</em></div>').join('') + '</div>';
  const make = (id,eyebrow,title,intro,body) => {
    const section = document.createElement('section');
    section.id=id; section.className='dash-section hn-admin-page';
    section.innerHTML='<div class="section-line"><div><span class="mini-label">' +
      escapeHTML(eyebrow) + '</span><h2>' + escapeHTML(title) +
      '</h2></div></div><p class="hn-admin-intro">' + escapeHTML(intro) + '</p>' + (pendingPages.has(id)?'<p class="hn-admin-muted">Fungsi ini sedang disediakan.</p>':'') + body;
    content.appendChild(section);
  };

  make('admin-kepimpinan','KEPIMPINAN BM','Guru Kanan & Ketua Panitia',
    'Kedua-dua jawatan mempunyai kuasa pengurusan yang sama seperti Admin untuk organisasi ini.',
    emptyTable(['Jawatan','Nama','ID','Status']));
  make('admin-organisasi','ORGANISASI','Pengurusan Organisasi',
    'Urus organisasi dan sekolah yang berdaftar tanpa membenarkan capaian silang kepada data peribadi.',
    stats(['Sekolah berdaftar','Organisasi aktif','Permohonan menunggu']) +
    '<div class="hn-admin-actions"><button type="button" disabled>+ Daftar Sekolah</button><button type="button" disabled>Semak Permohonan</button></div>' +
    emptyTable(['Organisasi','Kod Sekolah','Pentadbir','Status']));
  make('admin-murid','AKAUN MURID','Pengurusan Murid',
    'Semak status akaun mengikut organisasi. Guru diberi kuasa mendaftarkan murid dalam kelasnya sendiri.',
    stats(['Murid berdaftar','Akaun aktif','Murid tanpa kelas']) +
    emptyTable(['ID Murid','Sekolah','Kelas','Status']));
  make('admin-misi','EMPAT MISI','Pemantauan Misi',
    'Pantau penyelesaian Misi 1–4 dan masalah penyelarasan tanpa memaparkan data peribadi secara terbuka.',
    '<div class="hn-admin-tiles">' + ['Jejak Naskhah Pusaka','Balai Olah Hikayat','Warisan Bahasa','Pentas Warisan'].map((x,i)=>
      '<article><small>MISI ' + (i+1) + '</small><strong>' + escapeHTML(x) +
      '</strong><span>Status misi</span></article>').join('') + '</div>');
  make('admin-audit','JEJAK SISTEM','Aktiviti & Log Audit',
    'Log audit akan menyimpan siapa, tindakan apa, bila, organisasi dan keputusan tindakan. Elakkan merekod kata laluan atau kandungan sensitif.',
    emptyTable(['Masa','Pengguna / Peranan','Peristiwa','Organisasi','Hasil']));
  make('admin-penghantaran','KARYA','Penghantaran & Karya',
    'Pantau penghantaran video Misi 4 dan status maklum balas guru berdasarkan rekod Neon. Rakaman murid kekal persendirian.',
    '<div id="hn-admin-submissions-root" role="region" aria-label="Rekod penghantaran Misi 4"><p role="status">Klik menu ini untuk memuatkan rekod sebenar.</p></div>');
  make('admin-laporan','ANALITIK','Analitik & Laporan',
    'Laporan agregat mengikut organisasi, sekolah, kelas dan misi dengan akses yang dibenarkan.',
    stats(['Murid aktif','Penyelesaian misi','Tugasan tertangguh']) +
    '<div class="hn-admin-actions"><button type="button" disabled>Jana Laporan</button><button type="button" disabled>Eksport CSV</button></div>');
  make('admin-media','KAMERA & AUDIO','Pusat Media',
    'Semak status penghantaran media, kapasiti storan persendirian dan ralat muat naik. Bukan untuk membuka kamera atau mikrofon murid.',
    stats(['Penghantaran disahkan','Rakaman menunggu','Storan tersedia']) +
    '<p class="hn-admin-muted">Izin kamera dan mikrofon diminta pada peranti murid ketika mereka memilih untuk merakam dalam Misi 4.</p>');
  make('admin-notifikasi','HEBAHAN','Notifikasi & Pengumuman',
    'Hebahan sistem boleh diterbitkan kepada organisasi, guru atau murid selepas akaun disahkan.',
    emptyTable(['Tarikh','Tajuk','Penerima','Status']) +
    '<div class="hn-admin-actions"><button type="button" disabled>+ Pengumuman Baharu</button></div>');
  make('admin-backup','KESELAMATAN DATA','Sandaran & Pemulihan',
    'Semak status sandaran, tempoh simpanan dan ujian pemulihan. Jangan dakwa backup aktif sebelum diuji.',
    stats(['Sandaran terakhir','Status integriti','Pemulihan terakhir']) +
    '<p class="hn-admin-muted">Sandaran dan pemulihan akan disediakan selepas pengujian keselamatan selesai.</p>');

  // Read-only monitoring of authenticated, organization-scoped Misi 4 submissions.
  // Admin can monitor status, not stream/download private pupil recordings.
  const submissionsRoot=document.getElementById('hn-admin-submissions-root');
  let submissions=[];
  let submissionsLimited=false;
  const submissionsStats=(d)=>[
    ['Video diterima',d.received],
    ['Menunggu semakan guru',d.pending_review],
    ['Telah diberi maklum balas',d.commented],
    ['Muat naik belum lengkap',d.unfinished_upload],
    ['Rakaman dikeluarkan',d.removed]
  ];
  const renderSubmissions=()=>{
    if(!submissionsRoot)return;
    const tbody=submissionsRoot.querySelector('[data-hn-submissions-tbody]');
    if(!tbody)return;
    const className=submissionsRoot.querySelector('[data-hn-submissions-class]')?.value||'';
    const status=submissionsRoot.querySelector('[data-hn-submissions-status]')?.value||'';
    const search=(submissionsRoot.querySelector('[data-hn-submissions-search]')?.value||'').trim().toLowerCase();
    const shown=submissions.filter(r=>
      (!className||r.className===className)&&(!status||r.status===status)&&
      (!search||[r.studentName,r.studentLoginId,r.className].some(x=>String(x||'').toLowerCase().includes(search)))
    );
    tbody.innerHTML=shown.length?shown.map(r=>{
      const when=r.submittedAt||r.createdAt;
      const date=when?new Date(when):null;
      const formatted=date&&!Number.isNaN(date.getTime())?date.toLocaleString('ms-MY'):'—';
      return '<tr><td>'+escapeHTML(r.studentName)+'<br><small>'+escapeHTML(r.studentLoginId)+'</small></td>'+
        '<td>'+escapeHTML(r.className)+'</td><td>Misi 4</td>'+
        '<td>'+escapeHTML(r.kind)+'</td><td>'+escapeHTML(formatted)+'</td>'+
        '<td>'+escapeHTML(r.status)+'</td></tr>';
    }).join(''):'<tr><td colspan="6">Tiada penghantaran yang sepadan dengan penapis.</td></tr>';
    const count=submissionsRoot.querySelector('[data-hn-submissions-count]');
    if(count)count.textContent=shown.length+' daripada '+submissions.length+' rekod dipaparkan'+(submissionsLimited?' (500 terkini sahaja)':'');
  };
  const loadAdminSubmissions=async()=>{
    if(!submissionsRoot)return;
    submissionsRoot.replaceChildren();
    const progress=document.createElement('p');
    progress.setAttribute('role','status');
    progress.textContent='Memuatkan rekod penghantaran Neon...';
    submissionsRoot.append(progress);
    try{
      const response=await fetch('/api/admin/submissions',{credentials:'same-origin',cache:'no-store'});
      const data=await response.json();
      if(!response.ok||data?.ok!==true||!Array.isArray(data.submissions)||!data.stats)
        throw Error('NOT_AVAILABLE');
      submissions=data.submissions;
      submissionsLimited=data.limited===true;
      const cards=document.createElement('div');cards.className='stats-grid three';
      for(const [label,count] of submissionsStats(data.stats)){
        const card=document.createElement('div');
        card.className='stat';
        const l=document.createElement('span');l.textContent=label;
        const n=document.createElement('strong');
        n.textContent=String(Number.isSafeInteger(count)?count:0);
        const caption=document.createElement('em');caption.textContent='Daripada rekod Neon organisasi';
        card.append(l,n,caption);cards.append(card);
      }
      const filters=document.createElement('div');filters.className='hn-admin-actions';
      filters.style.cssText='display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:18px 0';
      const search=document.createElement('input');search.type='search';search.placeholder='Cari nama atau ID murid';
      search.setAttribute('aria-label','Cari nama atau ID murid');
      search.dataset.hnSubmissionsSearch='';
      const classes=document.createElement('select');classes.dataset.hnSubmissionsClass='';
      classes.setAttribute('aria-label','Tapis kelas');
      const classOptions=['',...new Set(submissions.map(r=>r.className))].sort();
      for(const c of classOptions){const opt=document.createElement('option');opt.value=c;opt.textContent=c||'Semua kelas';classes.append(opt);}
      const statuses=document.createElement('select');statuses.dataset.hnSubmissionsStatus='';
      statuses.setAttribute('aria-label','Tapis status');
      for(const status of ['', 'Menunggu semakan','Telah diberikan maklum balas','Muat naik belum lengkap','Dikeluarkan']){
        const opt=document.createElement('option');opt.value=status;opt.textContent=status||'Semua status';statuses.append(opt);
      }
      const refresh=document.createElement('button');refresh.type='button';refresh.textContent='↻ Muat Semula';
      refresh.addEventListener('click',()=>{void loadAdminSubmissions();});
      filters.append(search,classes,statuses,refresh);
      const count=document.createElement('p');count.dataset.hnSubmissionsCount='';
      count.setAttribute('role','status');
      const note=document.createElement('p');note.className='hn-admin-muted';
      note.textContent='Status menunggu semakan berdasarkan maklum balas yang dipautkan pada video. Rekod muat naik belum lengkap bukan semestinya gagal. Admin tidak dapat membuka fail video murid dari halaman ini.';
      const table=document.createElement('div');table.className='table-wrap';
      table.innerHTML='<table><thead><tr><th>Murid</th><th>Kelas</th><th>Misi</th><th>Jenis karya</th><th>Tarikh</th><th>Status</th></tr></thead><tbody data-hn-submissions-tbody></tbody></table>';
      submissionsRoot.replaceChildren(cards,filters,count,note,table);
      search.addEventListener('input',renderSubmissions);
      classes.addEventListener('change',renderSubmissions);
      statuses.addEventListener('change',renderSubmissions);
      renderSubmissions();
    }catch{
      submissionsRoot.replaceChildren();
      const warning=document.createElement('p');warning.setAttribute('role','alert');
      warning.textContent='Rekod belum dapat dimuatkan. Pastikan sesi Admin aktif dan sambungan Neon tersedia.';
      const retry=document.createElement('button');retry.type='button';retry.textContent='Cuba Lagi';
      retry.addEventListener('click',()=>void loadAdminSubmissions());
      submissionsRoot.append(warning,retry);
    }
  };

  // Replace ADMIN navigation only. Student experience and Teacher navigation are untouched.
  sidebar.querySelectorAll('.side-link[data-target]').forEach(node => node.remove());
  const nav=document.createElement('nav');
  nav.className='hn-admin-nav';
  nav.setAttribute('aria-label','Menu Dashboard Admin');
  pages.forEach(([id,label,symbol])=>{
    const button=document.createElement('button');
    button.type='button'; button.className='side-link';
    button.dataset.adminMenu=id; button.setAttribute('aria-controls',id);
    button.innerHTML='<span aria-hidden="true">'+escapeHTML(symbol)+'</span>'+escapeHTML(label);
    nav.appendChild(button);
  });
  const spacer=sidebar.querySelector('.side-spacer');
  if(spacer)sidebar.insertBefore(nav,spacer);
  else sidebar.appendChild(nav);

  const sections=pages.map(([id])=>document.getElementById(id)).filter(Boolean);
  let activeId='admin-ringkasan';
  function select(id,quiet=false) {
    if(!pages.some(p=>p[0]===id))return;
    activeId=id;
    sections.forEach(section => { section.hidden=section.id!==id; });
    if(id==='admin-penghantaran')void loadAdminSubmissions();
    nav.querySelectorAll('[data-admin-menu]').forEach(button=>{
      const active=button.dataset.adminMenu===id;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    const label=pages.find(p=>p[0]===id)?.[1] || 'Ringkasan Sistem';
    if(breadcrumb)breadcrumb.innerHTML='Hikayat Nusantara <span>/</span> Admin <span>/</span> '+escapeHTML(label);
    if(!quiet){
      dashboard.classList.remove('menu-open');
      const shade=document.getElementById('sidebar-shade');
      if(shade)shade.hidden=true;
      if(!dashboard.hidden)window.scrollTo({top:0,behavior:'instant'});
    }
  }
  nav.addEventListener('click',event=>{
    const button=event.target.closest('[data-admin-menu]');
    if(button)select(button.dataset.adminMenu);
  });
  window.addEventListener('hashchange',()=>{if(location.hash==='#admin')select(activeId,true);});
  select('admin-ringkasan',true);
})();
