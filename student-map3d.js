/**
 * Desa Hikayat 3D — dashboard Murid Tahun 5.
 * Semua adegan dibina daripada geometri asli Three.js (tiada imej / data murid).
 * Paparan SVG lama dikekalkan apabila WebGL tidak tersedia.
 */
"use strict";

const wrapper = document.getElementById("desa-hikayat-map");
const stage = document.getElementById("desa-map-stage");
const dashboard = document.getElementById("murid-view");
const modeButton = document.getElementById("desa-toggle-2d");
const pauseButton = document.getElementById("desa-toggle-motion");
const panel = document.getElementById("desa-location-panel");
const closePanelButton = document.getElementById("desa-close-panel");
const openMissionButton = document.getElementById("desa-open-mission");
const buttons = [...document.querySelectorAll("#desa-hikayat-map [data-location]")];
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

const destinations = [
  {title:"Rumah Naskhah Pusaka",kicker:"MISI 01 · 10 MINIT",subtitle:"Baca atau dengar hikayat, susun lima peristiwa dan jawab tiga soalan pemahaman.",position:[-4.6,0,-3.9]},
  {title:"Balai Olah Hikayat",kicker:"MISI 02 · 15 MINIT",subtitle:"Pilih watak, latar dan peristiwa, kemudian ubah suai cerita dengan bahasa indah serta santun.",position:[4.5,0,-3.2]},
  {title:"Taman Bahasa Ajaib",kicker:"MISI 03 · 10 MINIT",subtitle:"Selesaikan empat cabaran ungkapan indah dan kesantunan bahasa.",position:[-4.5,0,4.2]},
  {title:"Pentas Warisan",kicker:"MISI 04 · 15 MINIT",subtitle:"Rancang jalan cerita dan sediakan persembahan melalui rakaman suara atau video.",position:[4.5,0,4.5]}
];

let activatePlace = () => {};
let running = !reduceMotion;
let currentPlace = -1;

function showPlace(index){
  const place=destinations[index];
  if(!place||!panel)return;
  currentPlace=index;
  document.getElementById("desa-location-kicker").textContent=place.kicker;
  document.getElementById("desa-location-title").textContent=place.title;
  document.getElementById("desa-location-desc").textContent=place.subtitle;
  panel.hidden=false;
  buttons.forEach((button,i)=>button.classList.toggle("is-selected",index===i));
  activatePlace(index);
}
buttons.forEach(button=>button.addEventListener("click",()=>showPlace(Number(button.dataset.location))));
closePanelButton?.addEventListener("click",()=>{
  panel.hidden=true;currentPlace=-1;
  buttons.forEach(button=>button.classList.remove("is-selected"));
  activatePlace(-1);
});
openMissionButton?.addEventListener("click",()=>{
  if(currentPlace<0)return;
  // Butang misi sedia ada menguruskan dialog mod demo.
  dashboard?.querySelector(`.mission-card[data-mission="${currentPlace}"]`)?.click();
});

if(!wrapper||!stage||!dashboard){
  console.warn("Desa Hikayat: struktur peta tidak ditemukan; gunakan paparan sedia ada.");
}else{
  try{
    const THREE=await import("https://cdn.jsdelivr.net/npm/three@0.177.0/build/three.module.js");
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"low-power"});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.48;
    renderer.domElement.className="desa-map-canvas";
    renderer.domElement.setAttribute("aria-hidden","true");
    stage.append(renderer.domElement);

    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0xcbd9b4);
    scene.fog=new THREE.FogExp2(0xd7d9b8,.018);
    const camera=new THREE.OrthographicCamera(-12,12,7,-7,.1,90);
    camera.position.set(14,17,21);
    camera.lookAt(0,1,0);
    const cameraAim=new THREE.Vector3(0,1,0);
    const destinationAim=new THREE.Vector3(0,1,0);
    const world=new THREE.Group();scene.add(world);

    const sunlight=new THREE.DirectionalLight(0xffd491,2.8);
    sunlight.position.set(-12,17,9);
    sunlight.castShadow=true;
    sunlight.shadow.mapSize.set(1024,1024);
    sunlight.shadow.camera.left=-22;
    sunlight.shadow.camera.right=22;
    sunlight.shadow.camera.top=22;
    sunlight.shadow.camera.bottom=-22;
    sunlight.shadow.normalBias=.035;
    scene.add(sunlight);
    scene.add(new THREE.HemisphereLight(0xe8f2d1,0x5c5642,2.0));

    const material=(color,props={})=>new THREE.MeshStandardMaterial({color,roughness:.88,...props});
    const earth=material(0x8b6743),grass=material(0x76a16d),grass2=material(0x8fba7a);
    const wood=material(0xa36d47),darkwood=material(0x634330),trim=material(0xe8bd75);
    const thatch=material(0xc49456),leaves=material(0x386d52),leaves2=material(0x579060);
    const waterMat=material(0x50aeb1,{metalness:.12,roughness:.3,side:THREE.DoubleSide});
    const lit=material(0xffedac,{emissive:0xffb957,emissiveIntensity:1.7});
    const white=material(0xf7ecd4),stone=material(0xbcb89c);
    const mesh=(parent,geo,mat,x=0,y=0,z=0)=>{
      const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);
      m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
    };
    const box=(p,w,h,d,m,x=0,y=0,z=0)=>mesh(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
    const cylinder=(p,r1,r2,h,m,x=0,y=0,z=0,sides=8)=>mesh(p,new THREE.CylinderGeometry(r1,r2,h,sides),m,x,y,z);
    const orb=(p,r,m,x=0,y=0,z=0,detail=1)=>mesh(p,new THREE.IcosahedronGeometry(r,detail),m,x,y,z);

    // Alas kampung dan sawah: terbentang tanpa pulau terapung.
    const ground=mesh(world,new THREE.PlaneGeometry(36,31,10,10),grass,0,-.04,0);
    ground.rotation.x=-Math.PI/2;
    ground.castShadow=false;
    const pathMat=material(0xdcc799);
    function path(from,to,width=.5){
      const [x1,z1]=from,[x2,z2]=to;
      const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz);
      const p=box(world,width,.035,len,pathMat,(x1+x2)/2,.05,(z1+z2)/2);
      p.rotation.y=Math.atan2(-dx,dz);
      p.castShadow=false;
    }
    // Bentuk sungai mengalir dari ufuk ke hadapan.
    const riverX=(z)=>.38+Math.sin(z*.37)*1.12;
    const vertices=[],indices=[],steps=72;
    for(let i=0;i<=steps;i++){
      const z=-15+30*i/steps,wide=1.55+.25*Math.sin(z*.24);
      vertices.push(riverX(z)-wide,.04,z,riverX(z)+wide,.04,z);
      if(i<steps){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
    }
    const riverGeo=new THREE.BufferGeometry();
    riverGeo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
    riverGeo.setIndex(indices);riverGeo.computeVertexNormals();
    const river=mesh(world,riverGeo,waterMat);
    river.castShadow=false;

    // Gunung yang kelihatan dari jauh.
    const hillMat=[material(0x7f9d79),material(0x9cb18d),material(0xb2bf9e)];
    [-15,-19,-23].forEach((z,i)=>{
      for(let k=0;k<7;k++){
        const h=4+(k%3)*1.6+i*1.6;
        const mountain=mesh(world,new THREE.ConeGeometry(4.6+(i*.35),h,5),hillMat[i],-14+k*5,.13+h/2,z);
        mountain.rotation.y=.12*k;
        mountain.castShadow=false;
      }
    });

    // Sawah bertingkat dan rumpun padi ringkas.
    for(let i=0;i<6;i++){
      const terrace=box(world,5.3,.08,1.1, i%2?grass2:material(0x98b95b),-11,.045,-7.4+i*1.37);
      terrace.castShadow=false;
      box(world,5.4,.1,.07,earth,-11,.07,-6.8+i*1.37).castShadow=false;
    }
    const rice=new THREE.InstancedMesh(new THREE.ConeGeometry(.06,.25,3),material(0xc2c56d),240);
    const dummy=new THREE.Object3D();
    for(let i=0;i<240;i++){
      dummy.position.set(-13.3+(i%20)*.245,.23,-7.1+Math.floor(i/20)*.61);
      dummy.rotation.y=(i*.19)%(Math.PI*2);
      dummy.updateMatrix();rice.setMatrixAt(i,dummy.matrix);
    }
    rice.instanceMatrix.needsUpdate=true;
    rice.castShadow=false;world.add(rice);

    // Jambatan kayu merentasi sungai pada tengah peta.
    for(let i=0;i<29;i++)box(world,.16,.15,3.9,wood,-2.65+i*.19,.25,.95);
    [-1.82,1.82].forEach(z=>{
      for(let i=0;i<8;i++){
        const x=-2.7+i*.76;
        cylinder(world,.045,.045,.9,darkwood,x,.7,.95+z,6);
      }
      box(world,5.4,.08,.08,wood,0,1.12,.95+z);
    });

    function tree(x,z,scale=.8){
      const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);world.add(g);
      cylinder(g,.14,.2,1.45,darkwood,0,.75,0);
      orb(g,.78,leaves,0,1.76,0);
      orb(g,.55,leaves2,-.32,1.65,.25);
      orb(g,.53,grass2,.35,1.57,.11);
      return g;
    }
    const swayTrees=[];
    for(let i=0;i<35;i++){
      const angle=i*2.4,r=7.1+(i%5)*.67;
      const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
      if(Math.abs(x)<2.7||Math.abs(x)>14)continue;
      swayTrees.push(tree(x,z,.6+(i%4)*.14));
    }
    const palms=[];
    function palm(x,z,s=.9){
      const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);world.add(g);
      for(let i=0;i<5;i++)cylinder(g,.1-i*.01,.13-i*.01,.55,darkwood,i*.035,.26+i*.52,0);
      const crown=new THREE.Group();crown.position.set(.17,2.85,0);g.add(crown);
      for(let k=0;k<8;k++){
        const a=k*Math.PI/4;
        const blade=mesh(crown,new THREE.ConeGeometry(.23,2.4,4),k%2?leaves:leaves2,Math.cos(a)*.85,-.20,Math.sin(a)*.85);
        blade.rotation.z=Math.cos(a)*1.1-Math.PI/2;blade.rotation.x=Math.sin(a)*1.15;
      }
      palms.push(crown);
    }
    palm(-7,-5.8,1.12);palm(8,-6.2,1.07);palm(-8,6.6,.94);palm(8,6.4,.85);

    const missionGroups=[];
    const anchors=[];
    function placeMission(group,index,x,z,anchorHeight=2.8){
      group.position.set(x,0,z);
      group.userData.mission=index;
      world.add(group);
      missionGroups[index]=group;
      anchors[index]=new THREE.Vector3(x,anchorHeight,z);
    }
    function house(index,x,z,scale=1.0,roofMat=thatch){
      const g=new THREE.Group();g.scale.setScalar(scale);
      for(let px of [-1.12,1.12])for(let pz of [-.83,.83])box(g,.14,.78,.16,darkwood,px,.43,pz);
      box(g,2.6,.16,2.15,darkwood,0,.83,0);
      box(g,2.35,1.36,1.9,wood,0,1.56,0);
      for(let i=0;i<9;i++)box(g,.025,1.2,.017,darkwood,-1.03+i*.26,1.5,.96);
      const roofL=box(g,1.86,.17,2.65,roofMat,-.64,2.56,0);roofL.rotation.z=.64;
      const roofR=box(g,1.86,.17,2.65,roofMat,.64,2.56,0);roofR.rotation.z=-.64;
      box(g,.14,.13,2.7,darkwood,0,3.12,0);
      box(g,.54,.87,.052,darkwood,0,1.3,.98);
      [-.75,.75].forEach(px=>{
        box(g,.50,.5,.07,lit,px,1.7,.98);
        box(g,.044,.5,.085,darkwood,px,1.7,1.02);
        box(g,.53,.05,.09,trim,px,1.98,1.02);
      });
      for(let i=0;i<4;i++)box(g,.91,.10,.34,wood,0,.69-i*.16,1.22+i*.29);
      // Ukiran pada alang pintu.
      for(let i=0;i<7;i++)orb(g,.06,trim,-.9+i*.3,2.22,1.01,0).scale.set(.9,.35,.5);
      placeMission(g,index,x,z,3.4*scale);
      return g;
    }
    house(0,-4.6,-3.9,1.08);
    // Naskhah yang terapung di serambi.
    const manuscript=new THREE.Group();manuscript.position.set(-4.6,2.35,-2.75);world.add(manuscript);
    const leftPage=box(manuscript,.48,.055,.6,white,-.25,0,0);leftPage.rotation.z=-.14;
    const rightPage=box(manuscript,.48,.055,.6,white,.25,0,0);rightPage.rotation.z=.14;
    box(manuscript,.95,.04,.67,material(0x82513d),0,-.07,0);

    // Balai menulis: pavilion terbuka dan meja pena.
    const balai=new THREE.Group();
    box(balai,3.5,.2,2.6,darkwood,0,.68,0);
    for(let xx of [-1.5,1.5])for(let zz of [-1,1]){
      cylinder(balai,.10,.10,2.3,wood,xx,1.74,zz,8);
    }
    const balaiR=box(balai,2.32,.14,3.1,thatch,-.78,3.09,0);balaiR.rotation.z=.6;
    const balaiL=box(balai,2.32,.14,3.1,thatch,.78,3.09,0);balaiL.rotation.z=-.6;
    box(balai,2.3,.14,.75,wood,0,1.2,.25);
    box(balai,1.3,.07,.62,white,0,1.29,.24);
    cylinder(balai,.035,.035,.82,trim,.45,1.7,.24).rotation.z=.3;
    placeMission(balai,1,4.5,-3.2,3.75);

    // Taman Bahasa: pepohon, papan ungkapan, bunga dan gerbang.
    const garden=new THREE.Group();
    for(let i=0;i<7;i++){
      const a=i*Math.PI*2/7;
      orb(garden,.37,i%2?leaves:leaves2,Math.cos(a)*1.5,.38,Math.sin(a)*1.2);
      orb(garden,.13,material(i%2?0xe4bc65:0xe7a5a2),Math.cos(a)*1.5,.67,Math.sin(a)*1.2,0);
    }
    for(let xx of [-1.1,1.1])cylinder(garden,.13,.13,2.4,wood,xx,1.2,-.55);
    box(garden,2.45,.28,.3,trim,0,2.4,-.55);
    box(garden,1.4,.75,.12,darkwood,0,1.63,-.56);
    box(garden,1.16,.54,.14,white,0,1.64,-.45);
    orb(garden,.24,lit,0,2.8,-.55);
    placeMission(garden,2,-4.5,4.2,3.3);

    // Pentas persembahan: lantai bertingkat, tirai dan lampu pelita.
    const stageHouse=new THREE.Group();
    box(stageHouse,3.65,.36,2.45,darkwood,0,.45,0);
    for(let i=0;i<10;i++)box(stageHouse,.07,.65,.15,trim,-1.5+i*.34,1.1,-1.03);
    for(let xx of [-1.7,1.7])cylinder(stageHouse,.12,.12,3,wood,xx,1.85,-.85,8);
    box(stageHouse,3.85,.16,.32,trim,0,3.23,-.85);
    const curtain=material(0x9b4240);
    for(let xx of [-1.42,1.42]){
      const c=box(stageHouse,.45,2.25,.14,curtain,xx,2,-.75);
      c.rotation.z=xx<0?.07:-.07;
    }
    for(let i=0;i<4;i++)box(stageHouse,.88,.13,.34,wood,0,.39-i*.11,1.4+i*.27);
    for(let xx of [-1.25,1.25])orb(stageHouse,.17,lit,xx,2.68,-.6);
    placeMission(stageHouse,3,4.5,4.5,3.65);

    // Laluan kecil menuju empat lokasi.
    path([-4.4,-2],[-2.0,.7],.55);
    path([4.3,-1.4],[2.2,.5],.55);
    path([-4.4,2.0],[-2.1,1.2],.5);
    path([4.4,2.6],[2.6,1.2],.5);

    // Pelita penunjuk arah dan kunang-kunang.
    const lantern=new THREE.Group();
    lantern.position.set(-.7,2.35,.7);world.add(lantern);
    cylinder(lantern,.2,.28,.16,darkwood,0,-.25,0);
    cylinder(lantern,.22,.20,.68,material(0xf2d8a5,{transparent:true,opacity:.68}),0,.12,0);
    cylinder(lantern,.19,.25,.13,darkwood,0,.51,0);
    orb(lantern,.17,lit,0,.12,0);
    const lanternLight=new THREE.PointLight(0xffc678,8,7,2);
    lanternLight.position.set(0,.2,0);lantern.add(lanternLight);

    const particles=[],sparkle=material(0xffe7b1,{emissive:0xffcb67,emissiveIntensity:2.1});
    for(let i=0;i<20;i++){
      const a=i*2.4,r=1.5+(i%6)*.63;
      const p=orb(world,.045,sparkle,Math.sin(a)*r,1.6+(i%5)*.34,Math.cos(a)*r,0);
      p.castShadow=false;particles.push({p,base:p.position.y,phase:i*.9});
    }
    const clouds=[];
    function cloud(x,y,z,scale=1){
      const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);world.add(g);
      orb(g,.75,white,0,0,0);orb(g,.6,white,-.66,-.15,.02);orb(g,.57,white,.66,-.13,.1);
      clouds.push({g,originX:x});
    }
    cloud(-8,7,-10,1.15);cloud(3,8,-13,1.0);cloud(9,6.6,-10,.8);

    const clickableMeshes=[];
    missionGroups.forEach((group)=>{
      group.traverse(obj=>{
        if(obj.isMesh)clickableMeshes.push(obj);
      });
    });

    const raycaster=new THREE.Raycaster();
    const pointer=new THREE.Vector2();
    let width=0,height=0,mode3D=true,lastFrame=0,dirty=true,focusIndex=-1;
    let yaw=0,targetYaw=0,downAt=null;

    function resize(){
      const rect=stage.getBoundingClientRect();
      const w=Math.max(1,Math.floor(rect.width));
      const h=Math.max(1,Math.floor(rect.height));
      if(w===width&&h===height)return;
      width=w;height=h;
      renderer.setSize(w,h,false);
      const aspect=w/h,vertical=aspect<1?12.8:8.7;
      camera.left=-vertical*aspect;camera.right=vertical*aspect;
      camera.top=vertical;camera.bottom=-vertical;
      camera.updateProjectionMatrix();
      dirty=true;
    }
    const observer=new ResizeObserver(resize);
    observer.observe(stage);
    function positionLabels(){
      const rect=stage.getBoundingClientRect();
      anchors.forEach((anchor,i)=>{
        const projected=anchor.clone();
        projected.applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
        projected.sub(cameraAim.clone().setY(0));
        projected.project(camera);
        const x=(projected.x*.5+.5)*rect.width;
        const y=(-projected.y*.5+.5)*rect.height;
        const button=buttons[i];if(!button)return;
        const minX=Math.min(90,rect.width*.22),maxX=Math.max(minX,rect.width-90);
        button.style.left=`${Math.min(maxX,Math.max(minX,x))}px`;
        button.style.top=`${Math.min(rect.height-55,Math.max(78,y-18))}px`;
      });
    }
    activatePlace=(index)=>{
      focusIndex=index;
      const loc=index<0?new THREE.Vector3(0,1,0):new THREE.Vector3(
        destinations[index].position[0]*.20,1,destinations[index].position[2]*.18
      );
      destinationAim.copy(loc);
      dirty=true;
    };
    function selectAt(event){
      const rect=renderer.domElement.getBoundingClientRect();
      pointer.x=((event.clientX-rect.left)/rect.width)*2-1;
      pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
      raycaster.setFromCamera(pointer,camera);
      const hit=raycaster.intersectObjects(clickableMeshes,false);
      for(const item of hit){
        let obj=item.object;
        while(obj&&!Number.isInteger(obj.userData.mission))obj=obj.parent;
        if(obj){showPlace(obj.userData.mission);return;}
      }
    }
    renderer.domElement.addEventListener("pointerdown",event=>{
      downAt={x:event.clientX,y:event.clientY};
    });
    renderer.domElement.addEventListener("pointerup",event=>{
      if(!downAt)return;
      const dx=event.clientX-downAt.x,dy=event.clientY-downAt.y;
      if(Math.hypot(dx,dy)<10)selectAt(event);
      downAt=null;
    });
    renderer.domElement.addEventListener("pointermove",event=>{
      if(event.pointerType==="touch"||event.buttons)return;
      const rect=renderer.domElement.getBoundingClientRect();
      targetYaw=((event.clientX-rect.left)/rect.width-.5)*.11;
      dirty=true;
    });
    renderer.domElement.addEventListener("pointerleave",()=>{targetYaw=0;dirty=true;});
    modeButton.hidden=false;pauseButton.hidden=false;
    modeButton.addEventListener("click",()=>{
      mode3D=!mode3D;
      wrapper.classList.toggle("desa-has-3d",mode3D);
      modeButton.textContent=mode3D?"◈ Lihat 2D":"▣ Lihat 3D";
      modeButton.setAttribute("aria-pressed",String(!mode3D));
      pauseButton.hidden=!mode3D;
      dirty=true;
    });
    pauseButton.addEventListener("click",()=>{
      running=!running;
      pauseButton.textContent=running?"Ⅱ Henti gerakan":"▶ Gerakkan";
      pauseButton.setAttribute("aria-pressed",String(!running));
      dirty=true;
    });
    pauseButton.textContent=running?"Ⅱ Henti gerakan":"▶ Gerakkan";
    pauseButton.setAttribute("aria-pressed",String(!running));
    wrapper.classList.add("desa-has-3d");
    resize();
    const clock=new THREE.Clock();
    function frame(timestamp){
      requestAnimationFrame(frame);
      if(!mode3D||dashboard.hidden||document.hidden)return;
      if(timestamp-lastFrame<33)return;
      lastFrame=timestamp;
      resize();
      const t=clock.getElapsedTime();
      if(running){
        lantern.position.y=2.35+Math.sin(t*1.5)*.15;
        lanternLight.intensity=7+Math.sin(t*5)*1.4;
        manuscript.rotation.z=Math.sin(t*1.2)*.08;
        manuscript.position.y=2.35+Math.sin(t*1.1)*.12;
        palms.forEach((c,i)=>c.rotation.z=Math.sin(t*.65+i)*.035);
        swayTrees.forEach((g,i)=>g.rotation.z=Math.sin(t*.5+i)*.013);
        clouds.forEach(({g,originX},i)=>g.position.x=originX+Math.sin(t*.12+i)*.6);
        particles.forEach(({p,base,phase})=>{
          p.position.y=base+Math.sin(t*1.7+phase)*.17;
          p.scale.setScalar(.6+.4*(1+Math.sin(t*2.2+phase)));
        });
      }
      cameraAim.lerp(destinationAim,.045);
      yaw+=(targetYaw-yaw)*.045;
      world.rotation.y=yaw;
      const offset=new THREE.Vector3(14,17,21);
      camera.position.copy(cameraAim).add(offset);
      camera.lookAt(cameraAim);
      camera.updateMatrixWorld();
      if(running||dirty||cameraAim.distanceTo(destinationAim)>.008||Math.abs(yaw-targetYaw)>.001){
        renderer.render(scene,camera);
        positionLabels();
        dirty=false;
      }
    }
    requestAnimationFrame(frame);
    window.addEventListener("pagehide",()=>{observer.disconnect();renderer.dispose()},{once:true});
  }catch(error){
    console.warn("Desa Hikayat 3D tidak tersedia; peta ilustrasi masih boleh digunakan.",error);
    wrapper.classList.remove("desa-has-3d");
    modeButton.hidden=true;pauseButton.hidden=true;
    const canvas=stage.querySelector("canvas");canvas?.remove();
  }
}
