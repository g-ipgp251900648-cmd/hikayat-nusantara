/* Pusat Warisan — Dashboard Admin (Fasa reka bentuk).
   This is a navigation/layout preview only.
   Real accounts, teacher permissions, student records and audit logs require a secure backend.
   NEVER accept/store credentials, recordings or actual student data here. */
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
  const note = '<div class="hn-admin-notice" role="status">Mod reka bentuk: akaun, pangkalan data, log audit dan storan media belum diaktifkan. Tiada perubahan pengguna atau data murid akan disimpan di sini.</div>';
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
      '</h2></div></div><p class="hn-admin-intro">' + escapeHTML(intro) + '</p>' + note + body;
    content.appendChild(section);
  };

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
      '</strong><span>Status sinkronisasi: belum tersedia</span></article>').join('') + '</div>');
  make('admin-audit','JEJAK SISTEM','Aktiviti & Log Audit',
    'Log audit akan menyimpan siapa, tindakan apa, bila, organisasi dan keputusan tindakan. Elakkan merekod kata laluan atau kandungan sensitif.',
    emptyTable(['Masa','Pengguna / Peranan','Peristiwa','Organisasi','Hasil']));
  make('admin-penghantaran','KARYA','Penghantaran & Karya',
    'Lihat ringkasan penghantaran dan status semakan guru. Rakaman murid kekal persendirian.',
    stats(['Karya diterima','Belum disemak','Muat naik gagal']) +
    emptyTable(['Kelas','Misi','Jenis karya','Status']));
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
    '<p class="hn-admin-muted">Pelan sandaran akan dilaksanakan bersama pangkalan data berpusat dan storan persendirian.</p>');

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
