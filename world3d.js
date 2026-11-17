/**
 * Hikayat Nusantara — kampung 3D asli (Three.js).
 * Model dicipta secara prosedural; tiada aset komersial, imej atau data peribadi.
 * SVG asal kekal sebagai fallback jika CDN/WebGL tidak tersedia.
 */
const hero = document.querySelector(".hero-art");
const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
if (hero) {
  const stage = document.createElement("div");
  stage.className = "three-stage";
  stage.setAttribute("role", "img");
  stage.setAttribute("aria-label", "Pemandangan kampung Nusantara 3D: rumah kayu, pepohon, sungai, sampan, awan serta pelita bercahaya.");
  const label = document.createElement("div");
  label.className = "world-label";
  label.innerHTML = '<span class="world-label-dot"></span> KAMPUNG PELITA WARISAN <small>✦ DUNIA 3D INTERAKTIF</small>';
  const controls = document.createElement("div");
  controls.className = "world-controls";
  const modeButton = document.createElement("button");
  modeButton.type = "button";
  modeButton.className = "world-control";
  modeButton.textContent = "◈ Lihat 2D";
  modeButton.setAttribute("aria-label", "Tukar paparan ke ilustrasi dua dimensi");
  const pauseButton = document.createElement("button");
  pauseButton.type = "button";
  pauseButton.className = "world-control";
  pauseButton.textContent = reducedMotion ? "▶ Gerakkan" : "Ⅱ Henti animasi";
  pauseButton.setAttribute("aria-pressed", String(reducedMotion));
  controls.append(modeButton, pauseButton);
  const hint = document.createElement("div");
  hint.className = "world-hint";
  hint.textContent = "↔ Seret atau gerakkan tetikus untuk melihat kampung";
  hero.append(stage, label, controls, hint);

  let THREE;
  try {
    THREE = await import("https://cdn.jsdelivr.net/npm/three@0.177.0/build/three.module.js");
  } catch (error) {
    console.warn("Mod 3D tidak dapat dimuatkan. Menggunakan ilustrasi 2D.", error);
    stage.remove();
    label.remove();
    hint.remove();
    controls.remove();
  }

  if (THREE) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power"
      });
    } catch (error) {
      console.warn("WebGL tidak disokong pada peranti ini.", error);
    }

    if (!renderer) {
      stage.remove();
      label.remove();
      hint.remove();
      controls.remove();
    } else {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.7;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.className = "world-canvas";
      renderer.domElement.setAttribute("aria-hidden", "true");
      stage.append(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-7.9, 7.9, 6.2, -6.2, 0.1, 90);
      camera.position.set(12, 13, 17);
      camera.lookAt(0, 0.8, 0);
      const world = new THREE.Group();
      scene.add(world);

      const colors = {
        earth: 0x7e5a3b, grass: 0x628e5e, grassLight: 0x91b678,
        wood: 0xb0794d, woodDark: 0x684831, roof: 0x693c30,
        leaf: 0x2e6c53, leafLight: 0x4d8e64, sand: 0xd2bb86,
        water: 0x62b9b7, window: 0xf6d18c, white: 0xfff7df
      };
      const mat = (color, options={}) => new THREE.MeshStandardMaterial({ color, roughness:.84, metalness:.02, ...options });
      const materials = Object.fromEntries(Object.entries(colors).map(([key, value])=>[key,mat(value)]));
      const object = (parent, geometry, material, x=0,y=0,z=0) => {
        const m = new THREE.Mesh(geometry, material);
        m.position.set(x,y,z);
        m.castShadow = true;
        m.receiveShadow = true;
        parent.add(m);
        return m;
      };
      const cube = (parent, w,h,d, material,x,y,z) => object(parent,new THREE.BoxGeometry(w,h,d),material,x,y,z);
      const ball = (parent, radius,material,x,y,z,detail=0) => object(parent,new THREE.IcosahedronGeometry(radius,detail),material,x,y,z);
      const cylinder = (parent, rt,rb,h, material,x,y,z,sides=7) => object(parent,new THREE.CylinderGeometry(rt,rb,h,sides),material,x,y,z);
      const sun = new THREE.DirectionalLight(0xffe1a4,3.2);
      sun.position.set(-5,13,9);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024,1024);
      sun.shadow.camera.left=-12; sun.shadow.camera.right=12;
      sun.shadow.camera.top=12; sun.shadow.camera.bottom=-12;
      sun.shadow.normalBias=.045;
      scene.add(sun);
      scene.add(new THREE.HemisphereLight(0xe3f8e8,0x5e513b,2.1));
      scene.add(new THREE.AmbientLight(0xffffff,.55));

      // Pulau kecil — tapak kampung berbentuk diorama terapung.
      const earth = cylinder(world,6.6,6.15,1.15,materials.earth,0,-.74,0,12);
      earth.castShadow=false;
      cylinder(world,6.65,6.63,.19,materials.grass,0,-.055,0,12);
      for (let i=0;i<30;i++){
        const a=i*2.399963, r=5.4+(i%3)*.27;
        const x=Math.cos(a)*r,z=Math.sin(a)*r;
        const tuft=ball(world,.18, i%2?materials.grassLight:materials.leafLight,x,.12,z);
        tuft.scale.set(1.1,.55,.8);
      }

      // Sungai — pita segi tiga lembut yang merentasi pulau.
      function waterRibbon(){
        const positions=[], indices=[], steps=28;
        for(let i=0;i<=steps;i++){
          const t=i/steps;
          const x=-6.5+t*13, z=1.0+Math.sin(t*Math.PI*1.7)*.57;
          const width=.72+Math.sin(t*Math.PI)*.28;
          positions.push(x,.062,z-width, x,.062,z+width);
          if(i<steps){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
        }
        const geo=new THREE.BufferGeometry();
        geo.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
        geo.setIndex(indices);geo.computeVertexNormals();
        return geo;
      }
      const water=object(world,waterRibbon(),mat(colors.water,{transparent:true,opacity:.95,roughness:.36,side:THREE.DoubleSide}));
      water.castShadow=false;
      const ripples=[];
      for(let i=0;i<9;i++){
        const x=-5.3+i*1.3;
        const z=1+Math.sin(((x+6.5)/13)*Math.PI*1.7)*.57;
        const ring=object(world,new THREE.TorusGeometry(.23,.013,3,20),mat(0xdbf2d5,{transparent:true,opacity:.6,emissive:0x90e6dc,emissiveIntensity:.1}),x,.089,z);
        ring.rotation.x=-Math.PI/2;
        ring.castShadow=false;
        ripples.push(ring);
      }

      // Rumah Melayu bertiang, dengan lantai, tingkap, tangga dan bumbung pelana.
      function house(x,z,scale=1,roofColor=materials.roof){
        const g=new THREE.Group();world.add(g);g.position.set(x,0,z);g.scale.setScalar(scale);
        for(let px of [-1.03,1.03]) for(let pz of [-.76,.76]){
          cube(g,.15,.65,.16,materials.woodDark,px,.35,pz);
        }
        cube(g,2.5,.14,2.0,materials.woodDark,0,.7,0);
        cube(g,2.22,1.28,1.75,materials.wood,0,1.42,0);
        for(let px=-1;px<=1.01;px+=.22)
          cube(g,.035,1.15,.018,materials.woodDark,px,1.42,.886);
        const leftRoof=cube(g,1.72,.13,2.23,roofColor,-.69,2.36,0);
        leftRoof.rotation.z=.58;
        const rightRoof=cube(g,1.72,.13,2.23,roofColor,.69,2.36,0);
        rightRoof.rotation.z=-.58;
        cube(g,.14,.12,2.28,materials.woodDark,0,2.82,0);
        cube(g,.55,.96,.052,materials.woodDark,0,1.17,.91);
        cube(g,.38,.47,.055,materials.window,-.72,1.6,.923);
        cube(g,.38,.47,.055,materials.window,.72,1.6,.923);
        for (let t=0;t<4;t++)cube(g,.84,.1,.3,materials.woodDark,0,.55-t*.13,1.14+t*.27);
        // Tiang tepi anjung.
        for(let xx of [-1.16,1.16])cube(g,.09,.82,.09,materials.woodDark,xx,1.09,1.03);
        return g;
      }
      const mainHouse=house(-2.25,-1.35,1.24);
      const secondHouse=house(2.55,-1.85,.85,mat(0x7a5140));
      house(4.4,1.1,.55,mat(0x85543c));

      // Pokok hutan, dedaunan hijau pelbagai tona.
      const trees=[];
      function tree(x,z,scale=1){
        const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);world.add(g);
        cylinder(g,.12,.2,1.2,materials.woodDark,0,.65,0);
        const canopy=ball(g,.82,materials.leaf,0,1.65,0,1);
        canopy.scale.set(1.04,1.1,.9);
        ball(g,.57,materials.leafLight,-.37,1.45,.25,1);
        ball(g,.49,materials.grass,.38,1.52,.14,1);
        trees.push(g);
      }
      [[-4.65,-2.6,1.1],[-4.9,.3,.86],[-3.9,3.2,.76],[.0,-3.45,1.0],[1.1,-4.4,.8],[4.8,-2.1,.84],[5.3,3.35,.73],[-1.9,4.4,.61]].forEach(args=>tree(...args));

      // Bunga, batu dan jejak batu kecil.
      const stoneMat=mat(0xd0c59b),petal=mat(0xf7c3a3);
      for(let i=0;i<28;i++){
        const a=(i*2.42)%(Math.PI*2),r=2.3+(i%5)*.57;
        const x=Math.cos(a)*r,z=Math.sin(a)*r;
        if(z>0.2&&z<2.35)continue;
        const stone=ball(world,.07+(i%3)*.025,i%4===0?petal:stoneMat,x,.10,z);
        stone.scale.set(1.5,.45,.9);
      }

      // Jambatan papan kecil.
      for(let i=0;i<9;i++)cube(world,.18,.12,2.6,materials.woodDark,.6+i*.22,.26,1.5);
      for(let dz of [-1.2,1.2]){
        for(let dx of [0,1.85])cylinder(world,.035,.035,.65,materials.woodDark,.6+dx,.54,1.5+dz,6);
      }

      // Sampan di sungai, bergerak perlahan.
      const sampan=new THREE.Group();world.add(sampan);
      const hull=object(sampan,new THREE.SphereGeometry(.7,10,7),materials.woodDark,0,0,0);
      hull.scale.set(1,.22,.34);
      cube(sampan,.72,.035,.36,materials.wood,.02,.12,0);
      cylinder(sampan,.026,.026,1.0,materials.wood,0,.57,0,6).rotation.z=-.22;

      // Pelita emas sebagai ikon pusat pengembaraan.
      const lamp=new THREE.Group();
      lamp.position.set(.0,1.15,-.75);
      world.add(lamp);
      const glowMat=mat(0xffd46b,{emissive:0xffa92c,emissiveIntensity:2.8,roughness:.34});
      cylinder(lamp,.26,.37,.15,materials.woodDark,0,-.23,0,9);
      cylinder(lamp,.32,.28,.12,mat(0xd6a54e,{metalness:.3}),0,-.14,0,9);
      cylinder(lamp,.22,.25,.72,mat(0xffdda1,{transparent:true,opacity:.57,emissive:0xe6a94b,emissiveIntensity:.32}),0,.24,0,8);
      cylinder(lamp,.23,.32,.15,materials.woodDark,0,.68,0,9);
      const flame=object(lamp,new THREE.ConeGeometry(.13,.42,7),glowMat,0,.18,0);
      for(let i=0;i<6;i++){
        const a=(i/6)*Math.PI*2;
        cylinder(lamp,.028,.028,.78,materials.woodDark,Math.sin(a)*.225,.23,Math.cos(a)*.225,6);
      }
      const handle=object(lamp,new THREE.TorusGeometry(.2,.035,6,16,Math.PI),materials.woodDark,0,.81,0);
      handle.rotation.z=Math.PI/2;
      const point=new THREE.PointLight(0xffc15a,13,6,2.2);
      point.position.set(0,.3,0);lamp.add(point);

      // Awan 3D bergerak perlahan.
      const cloudMaterial=mat(0xfff2d7,{transparent:true,opacity:.92,roughness:1});
      const clouds=[];
      function cloud(x,y,z,s=1){
        const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);world.add(g);
        ball(g,.65,cloudMaterial,0,0,0,1);
        ball(g,.49,cloudMaterial,-.6,-.12,.08,1);
        ball(g,.48,cloudMaterial,.58,-.16,.08,1);
        ball(g,.42,cloudMaterial,.12,.22,-.06,1);
        clouds.push(g);return g;
      }
      cloud(-3.9,4.35,-4,1.0);
      cloud(2.5,4.83,-4.9,.82);
      cloud(4.8,3.6,-3.7,.63);

      // Kelip-kelip bermaya pada waktu senja.
      const glitters=[];
      const sparkMat=mat(0xffe7a5,{emissive:0xffc761,emissiveIntensity:3.0});
      for(let i=0;i<19;i++){
        const a=i*2.399,r=1.2+(i%7)*.56;
        const s=ball(world,.035+(i%3)*.012,sparkMat,Math.sin(a)*r,1.4+(i%6)*.32,Math.cos(a)*r);
        s.castShadow=false;
        glitters.push({mesh:s,base:s.position.y,phase:i*1.71});
      }
      // Matahari dan burung kecil.
      const sunOrb=ball(world,.69,mat(0xffe2a5,{emissive:0xeec177,emissiveIntensity:.45}),4.8,5.55,-5.7,1);
      sunOrb.castShadow=false;
      const birds=[];
      const birdMat=new THREE.LineBasicMaterial({color:0x365248,transparent:true,opacity:.75});
      for(let i=0;i<3;i++){
        const geom=new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-.24,0,0),new THREE.Vector3(0,-.08,0),new THREE.Vector3(.24,0,0)
        ]);
        const bird=new THREE.Line(geom,birdMat);bird.position.set(-2+i*.55,4+i*.22,-3.5);
        world.add(bird);birds.push(bird);
      }

      // Struktur dunia mengisi kad; kekalkan nisbah yang konsisten.
      let currentWidth=0,currentHeight=0,needsRender=true;
      function resize(){
        const rect=stage.getBoundingClientRect();
        const w=Math.max(1,Math.round(rect.width)), h=Math.max(1,Math.round(rect.height));
        if(w===currentWidth&&h===currentHeight)return;
        currentWidth=w;currentHeight=h;
        renderer.setSize(w,h,false);
        const aspect=w/h;
        const vertical=aspect<1?7.9:6.5;
        camera.left=-vertical*aspect;camera.right=vertical*aspect;
        camera.top=vertical;camera.bottom=-vertical;camera.updateProjectionMatrix();
        needsRender=true;
      }
      const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
      resize();

      let paused=reducedMotion,mode3d=true,tilt=0,targetTilt=0,dragging=false,lastX=0;
      pauseButton.addEventListener("click",()=>{
        paused=!paused;
        pauseButton.textContent=paused?"▶ Gerakkan":"Ⅱ Henti animasi";
        pauseButton.setAttribute("aria-pressed",String(paused));
        document.body.classList.toggle("motion-paused",paused);
        needsRender=true;
      });
      document.body.classList.toggle("motion-paused",paused);
      modeButton.addEventListener("click",()=>{
        mode3d=!mode3d;
        hero.classList.toggle("is-3d",mode3d);
        modeButton.textContent=mode3d?"◈ Lihat 2D":"▣ Lihat 3D";
        modeButton.setAttribute("aria-label",mode3d?"Tukar paparan ke ilustrasi dua dimensi":"Tukar paparan ke pemandangan tiga dimensi");
        pauseButton.hidden=!mode3d;
        hint.hidden=!mode3d;
        needsRender=true;
      });
      renderer.domElement.addEventListener("pointerdown",event=>{
        dragging=true;lastX=event.clientX;
        renderer.domElement.setPointerCapture?.(event.pointerId);
      });
      renderer.domElement.addEventListener("pointerup",()=>dragging=false);
      renderer.domElement.addEventListener("pointercancel",()=>dragging=false);
      renderer.domElement.addEventListener("pointermove",event=>{
        if(dragging)targetTilt=THREE.MathUtils.clamp(targetTilt+(event.clientX-lastX)*.005,-.43,.43);
        else{
          const r=renderer.domElement.getBoundingClientRect();
          targetTilt=THREE.MathUtils.clamp(((event.clientX-r.left)/r.width-.5)*.21,-.2,.2);
        }
        lastX=event.clientX;
        needsRender=true;
      });
      renderer.domElement.addEventListener("pointerleave",()=>{if(!dragging){targetTilt=0;needsRender=true}});

      hero.classList.add("is-3d");
      const clock=new THREE.Clock();
      let lastFrame=0;
      function render(time){
        requestAnimationFrame(render);
        if(!mode3d||document.hidden||document.getElementById("home-view")?.hidden)return;
        if(time-lastFrame<30 && !needsRender)return;
        if(time-lastFrame<30)return;
        lastFrame=time;
        resize();
        const t=clock.getElapsedTime();
        const active=!paused;
        tilt+=(targetTilt-tilt)*.055;
        world.rotation.y=tilt;
        if(active){
          cloudForTime(t);
          for(let i=0;i<ripples.length;i++){
            const r=ripples[i],pulse=.9+Math.sin(t*1.65+i*1.6)*.14;
            r.scale.set(pulse,pulse,pulse);
          }
          lamp.position.y=1.15+Math.sin(t*1.6)*.11;
          flame.scale.y=.85+Math.sin(t*6)*.22;
          point.intensity=10+Math.sin(t*5)*2;
          sampan.position.set(-.5+Math.sin(t*.32)*1.15,.17,1.5+Math.sin(t*.8)*.07);
          sampan.rotation.y=Math.sin(t*.6)*.14;
          trees.forEach((g,i)=>g.rotation.z=Math.sin(t*.7+i)*.018);
          glitters.forEach(({mesh,base,phase})=>{
            mesh.position.y=base+Math.sin(t*1.4+phase)*.2;
            mesh.scale.setScalar(.6+.45*(1+Math.sin(t*2+phase)));
          });
          birds.forEach((b,i)=>b.position.x=-2+i*.55+Math.sin(t*.3+i)*.3);
        }
        renderer.render(scene,camera);
        needsRender=false;
      }
      function cloudForTime(t){
        clouds.forEach((c,i)=>{
          c.position.x=[-3.9,2.5,4.8][i]+Math.sin(t*.15+i*1.3)*.65;
          c.position.y=[4.35,4.83,3.6][i]+Math.sin(t*.4+i)*.08;
        });
      }
      requestAnimationFrame(render);
      window.addEventListener("pagehide",()=>{
        resizeObserver.disconnect();
        renderer.dispose();
      },{once:true});
    }
  }
}
