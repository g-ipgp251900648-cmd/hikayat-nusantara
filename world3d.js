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
      camera.position.set(9, 12, 22);
      camera.lookAt(0.8, 1.2, -4);
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
      scene.add(new THREE.AmbientLight(0xffffff,.65));
      scene.fog = new THREE.FogExp2(0xe9dcaf,.009);

      // Landskap panorama menggantikan model pulau terapung: bumi menuju ufuk.
      const softGround=mat(0x82a66a,{roughness:1});
      const ground=object(world,new THREE.PlaneGeometry(46,44,20,20),softGround,0,-.075,-3);
      ground.rotation.x=-Math.PI/2;
      ground.castShadow=false;
      const meadow=mat(0x9fbc75,{roughness:1});
      for(let i=0;i<80;i++){
        const angle=i*2.399,r=5+(i%7)*1.05;
        const x=Math.cos(angle)*r,z=Math.sin(angle)*r-2.6;
        const tuft=ball(world,.09+(i%3)*.036,i%2?materials.grassLight:meadow,x,.08,z);
        tuft.scale.set(1.4,.35,.9);tuft.castShadow=false;
      }

      // Siluet hutan dan gunung berlapis, dilukis dalam geometri 3D.
      function mountainLayer(z,baseColor,height,seed){
        const points=[],triangles=[],count=54,spread=23;
        for(let i=0;i<=count;i++){
          const u=i/count,x=-spread+u*spread*2;
          const rise=(Math.sin(u*6.283*2.7+seed)*.31+Math.sin(u*6.283*5.2+seed*2)*.12+.46);
          const peak=1.0+Math.max(0,rise)*height;
          points.push(x,-.2,z,x,peak,z);
          if(i<count){const k=i*2;triangles.push(k,k+1,k+3,k,k+3,k+2);}
        }
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute("position",new THREE.Float32BufferAttribute(points,3));
        geometry.setIndex(triangles);geometry.computeVertexNormals();
        const hill=object(world,geometry,mat(baseColor,{roughness:1,side:THREE.DoubleSide}));
        hill.castShadow=false;
      }
      mountainLayer(-17,0x8da88c,6.4,1.2);
      mountainLayer(-21,0x819b8a,9.2,2.6);
      mountainLayer(-26,0xb7bfa1,11.3,3.2);

      // Sawah padi berteres pada sisi kiri sungai.
      const terraceColors=[mat(0xa1bd61),mat(0x9cbe57),mat(0x84a44b),mat(0xc5c86d)];
      for(let row=0;row<7;row++){
        const z=-9+row*1.58;
        const width=4.7+Math.sin(row*.6)*.9;
        const patch=cube(world,width,.06,1.08,terraceColors[row%4],-6.1,.02+row*.014,z);
        patch.castShadow=false;
        const dike=cube(world,width+.15,.13,.12,materials.earth,-6.1,.05+row*.014,z+.60);
        dike.castShadow=false;
      }
      // Padi hijau keemasan: sebahagian besar sebagai instanced mesh yang ringan.
      const stalkGeo=new THREE.ConeGeometry(.075,.31,3);
      const stalks=new THREE.InstancedMesh(stalkGeo,mat(0xd5b65e,{side:THREE.DoubleSide}),560);
      const dummy=new THREE.Object3D();
      let rice=0;
      for(let row=0;row<7;row++){
        for(let col=0;col<80;col++){
          const x=-8.3+(col%20)*.21;
          const z=-8.7+row*1.58+Math.floor(col/20)*.19;
          dummy.position.set(x,.25+row*.014,z);
          dummy.rotation.y=(col*2.17)%(Math.PI*2);
          dummy.scale.setScalar(.65+(col%3)*.11);
          dummy.updateMatrix();
          stalks.setMatrixAt(rice++,dummy.matrix);
        }
      }
      stalks.instanceMatrix.needsUpdate=true;
      stalks.castShadow=false;
      world.add(stalks);

      // Sungai berliku daripada ufuk ke foreground — berlapis riak keemasan.
      const riverCenter=(t)=>-2.8+5.1*t+.65*Math.sin(t*4.6);
      function waterRibbon(){
        const positions=[], indices=[], steps=100;
        for(let i=0;i<=steps;i++){
          const t=i/steps,z=-13+t*29,x=riverCenter(t);
          const width=.50+1.62*t;
          positions.push(x-width,.075,z,x+width,.075,z);
          if(i<steps){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
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
        const t=.14+i*.091;
        const x=riverCenter(t);
        const z=-13+t*29;
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
      // Tekstur artistik dijana sendiri dalam pelayar. Bukan gambar rujukan yang disalin.
      function createGrainTexture(base,grain,kind){
        const canvas=document.createElement("canvas");
        canvas.width=256;canvas.height=256;
        const context=canvas.getContext("2d");
        if(!context)return null;
        context.fillStyle=base;context.fillRect(0,0,256,256);
        let seed=4321;
        const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
        for(let i=0;i<(kind==="thatch"?1050:430);i++){
          const x=rnd()*256,y=rnd()*256,length=(kind==="thatch"?8:14)+rnd()*38;
          context.strokeStyle=i%4===0?"rgba(255,225,154,.65)":grain;
          context.globalAlpha=.22+rnd()*.55;
          context.lineWidth=.45+rnd()*.8;
          context.beginPath();
          context.moveTo(x,y);
          context.lineTo(x+(kind==="thatch"?length*.15:0),y+length);
          context.stroke();
        }
        context.globalAlpha=1;
        const texture=new THREE.CanvasTexture(canvas);
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
        texture.repeat.set(2,2);
        return texture;
      }
      const thatchMap=createGrainTexture("#b98e4e","rgba(84,46,25,.75)","thatch");
      const woodMap=createGrainTexture("#b37a4f","rgba(70,40,18,.6)","wood");
      if(woodMap){materials.wood.map=woodMap;materials.wood.needsUpdate=true;}
      // Rumah berpanggung di kanan sungai, menghadap sawah dan jambatan.
      const thatchRoof=new THREE.MeshStandardMaterial({color:0xf0d19b,map:thatchMap,roughness:1});
      const mainHouse=house(4.0,-1.2,1.62,thatchRoof);
      const secondHouse=house(7.5,-6.4,.95,mat(0xbb8a4c,{roughness:1}));
      house(7.8,3.4,.73,mat(0xb98a4e,{roughness:1}));

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
      [[-10,-4,1.8],[-9,1,1.6],[-8,5,1.5],[-6,-11,1.5],[0,-11,1.4],[3,-9,1.4],[10,-8,1.2],[10,-1,1.4],[11,4,1.5],[1,7,1.1]].forEach(args=>tree(...args));

      // Bunga, batu dan jejak batu kecil.
      const stoneMat=mat(0xd0c59b),petal=mat(0xf7c3a3);
      for(let i=0;i<28;i++){
        const a=(i*2.42)%(Math.PI*2),r=2.3+(i%5)*.57;
        const x=Math.cos(a)*r,z=Math.sin(a)*r;
        if(z>0.2&&z<2.35)continue;
        const stone=ball(world,.07+(i%3)*.025,i%4===0?petal:stoneMat,x,.10,z);
        stone.scale.set(1.5,.45,.9);
      }

      // Jambatan buluh bersilang dengan pagar kekisi menuju rumah.
      for(let i=0;i<24;i++)cube(world,.16,.12,2.35,materials.woodDark,-1.35+i*.19,.30,2.2);
      for(let dz of [-.94,.94]){
        for(let i=0;i<7;i++){
          const x=-1.3+i*.65;
          cube(world,.065,.8,.065,materials.woodDark,x,.68,2.2+dz);
          if(i<6){
            const brace=cube(world,.045,.8,.045,materials.woodDark,x+.33,.70,2.2+dz);
            brace.rotation.z=i%2===0?.58:-.58;
          }
        }
        cube(world,4.28,.065,.075,materials.woodDark,.7,1.13,2.2+dz);
      }

      // Sampan di sungai, bergerak perlahan.
      const sampan=new THREE.Group();world.add(sampan);
      const hull=object(sampan,new THREE.SphereGeometry(.7,10,7),materials.woodDark,0,0,0);
      hull.scale.set(1,.22,.34);
      cube(sampan,.72,.035,.36,materials.wood,.02,.12,0);
      cylinder(sampan,.026,.026,1.0,materials.wood,0,.57,0,6).rotation.z=-.22;

      // Pelita emas sebagai ikon pusat pengembaraan.
      const lamp=new THREE.Group();
      lamp.position.set(2.3,2.15,-.1);
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
      const point=new THREE.PointLight(0xffc15a,8,5,2.2);
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
      cloud(-9.2,8.7,-12,1.4);
      cloud(-4.2,10.6,-16,1.0);
      cloud(3.8,8.9,-14,1.25);
      cloud(10.7,11.2,-18,1.1);
      cloud(.8,11,-20,.8);


      // FASA PERINCIAN: seni bina kampung tradisional yang lebih jelas.
      // Segala hiasan dibuat menggunakan geometri ringan dan bahan sedia ada.
      const carvings=mat(0xdab275,{roughness:.7});
      const stepsMat=mat(0x8d6241),leafVein=mat(0x39734d);
      function detailHouse(h){
        const pairs=[[-.72,1.57],[.72,1.57]];
        pairs.forEach(([x,y])=>{
          // Bingkai dan silang kayu pada tingkap.
          cube(h,.51,.055,.09,materials.woodDark,x,y+.29,.956);
          cube(h,.51,.055,.09,materials.woodDark,x,y-.25,.956);
          cube(h,.045,.56,.09,materials.woodDark,x-.26,y,.955);
          cube(h,.045,.56,.09,materials.woodDark,x+.26,y,.955);
          cube(h,.038,.48,.11,materials.woodDark,x,y,.959);
          cube(h,.49,.03,.12,carvings,x,y,.967);
        });
        // Rasuk kayu melintang, serambi dan ukiran hiasan.
        cube(h,2.54,.14,.18,materials.woodDark,0,2.10,.96);
        cube(h,2.64,.12,.22,carvings,0,2.02,.99);
        for(let i=0;i<8;i++){
          const px=-.98+i*.28;
          const detail=ball(h,.085,carvings,px,1.99,1.07,1);
          detail.scale.set(1.0,.42,.4);
        }
        for(let i=0;i<9;i++){
          const px=-1.05+i*.26;
          cube(h,.05,.22,.07,materials.woodDark,px,.86,1.07);
        }
        for(let i=0;i<4;i++){
          cube(h,.94,.065,.39,stepsMat,0,.53-i*.14,1.20+i*.28);
        }
        // Garis bumbung seperti genting klasik.
        for(let i=0;i<7;i++){
          for(let side of [-1,1]){
            const beam=cube(h,.035,.035,2.24,materials.woodDark,side*(.22+i*.20),2.70-i*.12,0);
            beam.rotation.z=side===-1?.58:-.58;
          }
        }
      }
      [mainHouse,secondHouse].forEach(detailHouse);

      // Kain songket ringkas pada tingkap dan anjung untuk suasana warisan.
      const clothColors=[mat(0xb44a34),mat(0x30657d),mat(0xd7a94c)];
      function heritageTextiles(h){
        for(let i=0;i<3;i++){
          const x=-.55+i*.47;
          cube(h,.34,.44,.045,clothColors[i],x,1.36,1.05);
          for(let j=0;j<3;j++)
            cube(h,.26,.016,.048,carvings,x,1.2+j*.11,1.077);
        }
      }
      heritageTextiles(mainHouse);
      // Tokoh penduduk kampung bersiluet ringkas, bukan imej individu sebenar.
      const clothes=[mat(0xc44d35),mat(0x487b87),mat(0xd2ab55),mat(0x557b53)];
      for(let i=0;i<4;i++){
        const folk=new THREE.Group();
        folk.position.set(1.4+i*.71,.07,3.65-(i%2)*.56);
        world.add(folk);
        cylinder(folk,.18,.21,.59,clothes[i],0,.45,0,7);
        ball(folk,.15,mat(0xc18d5b),0,.83,0,1);
        cylinder(folk,.20,.16,.09,materials.woodDark,0,.97,0,8);
        for(let side of [-1,1]){
          cylinder(folk,.052,.053,.41,materials.woodDark,side*.08,.09,0,5);
        }
      }

      // Pokok kelapa dengan batang melengkung dan daun berjari.
      const palms=[];
      function coconutPalm(x,z,scale=1){
        const palm=new THREE.Group();
        palm.position.set(x,0,z);palm.scale.setScalar(scale);world.add(palm);
        const trunk=mat(0x8b6546);
        for(let i=0;i<6;i++){
          const part=cylinder(palm,.105-i*.011,.13-i*.009,.51,trunk,i*.057,.26+i*.45,0,9);
          part.rotation.z=-.14;
          if(i%2===0)cylinder(palm,.135,.135,.045,materials.woodDark,i*.057,.35+i*.45,0,9);
        }
        const crown=new THREE.Group();
        crown.position.set(.33,2.92,0);palm.add(crown);
        for(let i=0;i<9;i++){
          const angle=(i/9)*Math.PI*2;
          const blade=object(crown,new THREE.ConeGeometry(.22,2.3,4),i%2?materials.leaf:materials.leafLight,Math.cos(angle)*.95,-.22,Math.sin(angle)*.95);
          blade.rotation.z=Math.cos(angle)*1.16-Math.PI/2;
          blade.rotation.x=Math.sin(angle)*1.13;
          for(let j=0;j<2;j++){
            const tip=ball(crown,.19,leafVein,Math.cos(angle)*(1.2+j*.2),-.35-j*.13,Math.sin(angle)*(1.2+j*.2),0);
            tip.scale.set(.48,.33,1.3);
            tip.rotation.y=angle;
          }
        }
        for(let i=0;i<3;i++)ball(crown,.17,materials.woodDark,Math.sin(i*2.1)*.22,-.22,Math.cos(i*2.1)*.20,1);
        palms.push({group:palm,crown,phase:x+z});
      }
      coconutPalm(-9.1,1.0,1.15);
      coconutPalm(9.9,-3.25,1.15);
      coconutPalm(-10.3,7.2,1.2);
      coconutPalm(6.1,-9,.9);

      // Semak dan bunga di tepi rumah dan laluan kampung.
      const flowerCenters=[[-3.3,-.2],[-2.7,2.7],[-.8,-2.9],[3.3,-3.1],[4.7,2.3]];
      flowerCenters.forEach(([x,z],i)=>{
        for(let n=0;n<5;n++){
          const dx=Math.cos(n*2.4)*.29,dz=Math.sin(n*2.4)*.29;
          const stem=cylinder(world,.025,.035,.35,materials.leaf,x+dx,.30,z+dz,5);
          stem.castShadow=false;
          ball(world,.08,i%2===0?petal:carvings,x+dx,.51,z+dz,1);
        }
      });
      // Pagar kecil bercorak kayu di halaman.
      for(let row of [-3.7,3.2]){
        for(let i=0;i<9;i++){
          const x=-4.05+i*.44;
          cube(world,.07,.48,.08,materials.woodDark,x,.36,row);
        }
        cube(world,3.6,.045,.09,stepsMat,-2.29,.37,row);
        cube(world,3.6,.045,.09,stepsMat,-2.29,.55,row);
      }

      // Perahu kedua di sisi jeti; papan sisi, rusuk perahu dan pendayung.
      const mooredBoat=new THREE.Group();
      mooredBoat.position.set(2.1,.19,7.45);
      mooredBoat.rotation.y=-.31;
      world.add(mooredBoat);
      const boatHull=object(mooredBoat,new THREE.SphereGeometry(.85,14,9),materials.woodDark,0,0,0);
      boatHull.scale.set(1.13,.29,.43);
      const boatRim=object(mooredBoat,new THREE.TorusGeometry(.73,.045,5,28),carvings,0,.14,0);
      boatRim.scale.set(1,.43,.46);
      boatRim.rotation.x=Math.PI/2;
      for(let i=-2;i<=2;i++){
        cube(mooredBoat,.08,.20,.70,materials.wood,i*.23,.08,0);
      }
      const paddle=cylinder(mooredBoat,.025,.025,1.58,stepsMat,.23,.34,.25,7);
      paddle.rotation.z=.58;
      const paddleBlade=cube(mooredBoat,.18,.08,.33,materials.wood,.72,.67,.26);
      paddleBlade.rotation.z=.58;
      const rope=object(world,new THREE.CylinderGeometry(.015,.015,1.7,6),carvings,3.15,.36,1.96);
      rope.rotation.z=1.1;

      // Sungai: pusaran cahaya dan riak berlapis yang turut bergerak.
      const riverSheens=[];
      const sheenMat=mat(0xd4e9cf,{transparent:true,opacity:.65,emissive:0x60b2b6,emissiveIntensity:.25,side:THREE.DoubleSide});
      for(let i=0;i<16;i++){
        const u=.16+i*.052;
        const x=riverCenter(u);
        const z=-13+u*29;
        const ripple=object(world,new THREE.TorusGeometry(.13+(i%3)*.05,.015,4,18),sheenMat,x,.10,z+(i%2===0?.26:-.27));
        ripple.rotation.x=-Math.PI/2;
        ripple.scale.set(1.6,.62,1);
        ripple.castShadow=false;
        riverSheens.push({mesh:ripple,phase:i*.55});
      }

      // Pelita gantung kecil di hadapan rumah.
      const villageLights=[];
      for(let [x,z] of [[-3.7,-.35],[-.85,-.42],[2.15,-.65]]){
        cylinder(world,.028,.035,.9,materials.woodDark,x,.57,z,6);
        const small=ball(world,.115,glowMat,x,1.02,z,1);
        const glow=new THREE.PointLight(0xffbd6e,1.0,2.3);
        glow.position.set(x,1.02,z);world.add(glow);
        villageLights.push({small,glow});
      }

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
      const sunOrb=ball(world,1.7,mat(0xffe2a5,{emissive:0xeec177,emissiveIntensity:.55}),-10.5,11,-26,2);
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
        const vertical=aspect<1?13.3:10.7;
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
          sampan.position.set(1.7+Math.sin(t*.32)*.7,.18,5.1+Math.sin(t*.8)*.16);
          sampan.rotation.y=Math.sin(t*.6)*.14;
          trees.forEach((g,i)=>g.rotation.z=Math.sin(t*.7+i)*.018);
          palms.forEach(({crown,phase})=>crown.rotation.z=Math.sin(t*.65+phase)*.045);
          mooredBoat.position.y=.19+Math.sin(t*1.15+1)*.06;
          mooredBoat.rotation.z=Math.sin(t*.85+1)*.055;
          riverSheens.forEach(({mesh,phase})=>{
            const scale=.75+.2*Math.sin(t*1.5+phase);
            mesh.scale.set(scale*1.6,scale*.72,scale);
          });
          villageLights.forEach(({glow},i)=>glow.intensity=.8+Math.sin(t*3+i)*.22);
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
          c.position.x=[-9.2,-4.2,3.8,10.7,.8][i]+Math.sin(t*(.12+i*.02)+i*1.3)*.75;
          c.position.y=[8.7,10.6,8.9,11.2,11][i]+Math.sin(t*.4+i)*.08;
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
