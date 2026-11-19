/* Login client. All authorization is verified again by the backend on each API request. */
(() => {
  'use strict';
  async function request(url, options) {
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
    let data;
    try {data=await response.json();}catch {data={};}
    return {ok:response.ok,status:response.status,data};
  }
  const roles=['murid','guru','admin'];
  const adminLike=role=>['admin','gkmp','panitia'].includes(role);
  const dashboardRole=role=>adminLike(role)?'admin':role;
  let remembered=null;
  window.hnGetSession=async () => {
    const result=await request('/api/auth/session');
    remembered=result.ok&&result.data.authenticated?result.data.user:null;
    return remembered;
  };
  window.hnAuthorize=async role => {
    if(!roles.includes(role))return false;
    try {
      const user=await window.hnGetSession();
      if(user&&!user.mustChangePassword&&(user.role===role||(role==='admin'&&adminLike(user.role))))return true;
      location.replace('/login.html?role='+encodeURIComponent(role));
    } catch {location.replace('/login.html?role='+encodeURIComponent(role));}
    return false;
  };
  window.hnApiRequest=request;
  window.hnSignOut=async()=>{
    try{await request('/api/auth/logout',{method:'POST'});}finally{location.replace('/login.html');}
  };
  if(!document.getElementById('login-form')){
    document.addEventListener('DOMContentLoaded',()=>{
      for(const dash of document.querySelectorAll('.dashboard')){
        const side=dash.querySelector('.sidebar');
        if(!side || side.querySelector('.hn-logout'))continue;
        const button=document.createElement('button');
        button.type='button';button.textContent='Keluar Akaun';button.className='side-exit hn-logout';
        button.style.cssText='border:0;background:transparent;text-align:left;width:100%;cursor:pointer';
        button.addEventListener('click',window.hnSignOut);
        side.appendChild(button);
      }
    });
    return;
  }
  const form=document.getElementById('login-form');
  const changeForm=document.getElementById('password-change');
  const status=document.getElementById('login-status');
  const submit=document.getElementById('login-submit');
  const id=document.getElementById('login-id');
  const password=document.getElementById('login-password');
  const roleButtons=[...document.querySelectorAll('[data-role]')];
  let chosen=dashboardRole(new URLSearchParams(location.search).get('role')||'murid');
  if(!roles.includes(chosen))chosen='murid';
  let sessionRole=null;
  const setRole=role=>{
    chosen=role;
    roleButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===role)));
    document.getElementById('id-label').textContent='ID '+({murid:'Murid',guru:'Guru',admin:'Admin / GKMP / Ketua Panitia'}[role]);
  };
  roleButtons.forEach(b=>b.addEventListener('click',()=>setRole(b.dataset.role)));
  setRole(chosen);
  const message=text=>{status.textContent=text;};
  async function afterLogin(user) {
    sessionRole=dashboardRole(user.role);
    if(user.mustChangePassword){
      form.hidden=true;changeForm.hidden=false;
      message('Sila tukar kata laluan sementara sebelum memasuki dashboard.');
      return;
    }
    location.replace('/#'+dashboardRole(user.role));
  }
  (async()=>{
    try {
      const availability=await request('/api/auth/status');
      if(!availability.ok || !availability.data.configured){
        message('Sistem akaun belum diaktifkan. Pangkalan data dan akaun pentadbir perlu disediakan terlebih dahulu.');
        return;
      }
      submit.disabled=false;
      message('Sila gunakan ID dan kata laluan yang diberikan oleh pentadbir atau guru.');
      const session=await window.hnGetSession();
      if(session)await afterLogin(session);
    }catch{message('Tidak dapat menghubungi sistem akaun. Sila cuba semula.');}
  })();
  form.addEventListener('submit',async event=>{
    event.preventDefault();submit.disabled=true;message('Sedang menyemak akaun...');
    try {
      const result=await request('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id.value.trim().toUpperCase(),password:password.value})});
      password.value='';
      if(!result.ok){message(result.status===429?'Terlalu banyak percubaan. Sila cuba kemudian.':'ID atau kata laluan tidak sah.');return;}
      if(dashboardRole(result.data.user?.role)!==chosen){
        await request('/api/auth/logout',{method:'POST'});
        message('Jenis portal tidak sepadan dengan akaun. Sila pilih Murid, Guru atau Admin yang betul.');
        return;
      }
      await afterLogin(result.data.user);
    }catch{message('Sambungan bermasalah. Sila cuba semula.');}
    finally{submit.disabled=false;}
  });
  changeForm.addEventListener('submit',async event=>{
    event.preventDefault();
    const current=document.getElementById('current-password'),fresh=document.getElementById('new-password');
    message('Menyimpan kata laluan baharu...');
    try{
      const result=await request('/api/auth/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:current.value,newPassword:fresh.value})});
      current.value='';fresh.value='';
      if(!result.ok){message('Kata laluan tidak dapat dikemas kini. Semak kata laluan sementara dan panjang kata laluan baharu.');return;}
      location.replace('/#'+sessionRole);
    }catch{message('Tidak dapat menyimpan kata laluan. Sila cuba semula.');}
  });
})();
