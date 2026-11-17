import * as THREE from 'three';
import { KITAB_STATION, SCROLL_STATIONS, ScrollId } from './data';
import { AABB } from './rules';
import { NusantaraTextureSet } from './textures';

export interface ScrollVisual {
  id: ScrollId;
  mesh: THREE.Group;
  light: THREE.PointLight;
  revealed: boolean;
  collected: boolean;
  flying: boolean;
  flyProgress: number;
  startPos: THREE.Vector3;
}

export interface WorldHandles {
  colliders: AABB[];
  worldBounds: AABB;
  groundHeightAt: (x: number, z: number) => number;
  isInsideHouse: (x: number, z: number, y: number) => boolean;
  doorLeft: THREE.Group;
  doorRight: THREE.Group;
  chestLid: THREE.Group;
  deskPapersGroup: THREE.Group;
  pelitaFlame: THREE.Mesh;
  pelitaLight: THREE.PointLight;
  kitabGroup: THREE.Group;
  kitabLight: THREE.PointLight;
  scrollVisuals: Record<ScrollId, ScrollVisual>;
  wallFadeTargets: THREE.Material[];
  updateEnvironment: (
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    foundScrolls: ScrollId[],
    victoryActive: boolean,
    lowGraphics: boolean,
    reduceMotion: boolean
  ) => void;
  triggerChestOpen: () => void;
  triggerScrollFly: (id: ScrollId) => void;
  setDoorOpenAmount: (open01: number) => void;
  setIntroScatterProgress: (t: number) => void;
}

export function buildDesaHikayatWorld(
  scene: THREE.Scene,
  textures: NusantaraTextureSet,
  isSoftwareGl: boolean
): WorldHandles {
  const colliders: AABB[] = [];
  const worldBounds: AABB = { minX: -24, maxX: 24, minZ: -16, maxZ: 24 };
  const wallFadeTargets: THREE.Material[] = [];

  // --- SHARED MATERIALS ---
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.grassGroundColor,
    roughness: 0.92,
    metalness: 0.0,
  });
  const dirtPathMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.stonePathColor,
    roughness: 0.88,
    metalness: 0.02,
  });
  const woodFloorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.woodFloorColor,
    bumpMap: textures.woodFloorBump,
    bumpScale: 0.03,
    roughness: 0.65,
    metalness: 0.05,
  });
  const woodWallMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.woodWallColor,
    roughness: 0.72,
    metalness: 0.04,
  });
  const darkTimberMat = new THREE.MeshStandardMaterial({
    color: 0x3b2110,
    roughness: 0.78,
    metalness: 0.05,
  });
  const rumbiaMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.rumbiaRoofColor,
    roughness: 0.94,
    metalness: 0.0,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd9a938,
    roughness: 0.25,
    metalness: 0.88,
  });
  const clayMat = new THREE.MeshStandardMaterial({
    color: 0x9b5130,
    roughness: 0.82,
    metalness: 0.05,
  });
  const mengkuangMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.mengkuangMatColor,
    roughness: 0.85,
    metalness: 0.0,
  });
  const parchmentMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.parchmentScrollColor,
    emissive: 0x6b4b12,
    emissiveIntensity: 0.35,
    roughness: 0.65,
  });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });

  // --- 1. SKY, CLOUDS, MOUNTAINS & TERRAIN ---
  scene.background = new THREE.Color(0x9bd7f2);
  scene.fog = new THREE.FogExp2(0xc4e7f7, 0.0115);

  // Rolling ground terrain extending far to horizon
  const terrainGeo = new THREE.PlaneGeometry(180, 180, 48, 48);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const gx = posAttr.getX(i);
    const gz = posAttr.getZ(i);
    const distFromCenter = Math.hypot(gx, gz);
    // Keep playable village yard flat, gently undulate outer hills, dip at river channel
    let gy = 0;
    if (gz > 16.5 && gz < 26) {
      const riverDepth = Math.sin(((gz - 16.5) / 9.5) * Math.PI);
      gy -= riverDepth * 1.15;
    } else if (distFromCenter > 26) {
      gy += Math.sin(gx * 0.08) * Math.cos(gz * 0.08) * 1.8 + (distFromCenter - 26) * 0.05;
    }
    posAttr.setY(i, gy);
  }
  terrainGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(terrainGeo, grassMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Stone pathway from bridge to house stairs
  const stonePath = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 13.5), dirtPathMat);
  stonePath.rotation.x = -Math.PI / 2;
  stonePath.position.set(0, 0.025, 13.2);
  stonePath.receiveShadow = true;
  scene.add(stonePath);

  // Distant Mountains (Gunung)
  const mountainMat = new THREE.MeshStandardMaterial({
    color: 0x457568,
    roughness: 0.95,
    metalness: 0,
  });
  const mountainData = [
    { x: -46, z: -62, r: 22, h: 24 },
    { x: -12, z: -72, r: 28, h: 32 },
    { x: 26, z: -66, r: 24, h: 26 },
    { x: 54, z: -55, r: 20, h: 21 },
  ];
  mountainData.forEach((m) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(m.r, m.h, 7), mountainMat);
    cone.position.set(m.x, m.h * 0.45, m.z);
    cone.rotation.y = m.x * 0.1;
    scene.add(cone);
  });

  // Animated Drifting Clouds
  const clouds: THREE.Group[] = [];
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xfffcf5,
    roughness: 0.95,
    metalness: 0,
  });
  for (let i = 0; i < 8; i++) {
    const cg = new THREE.Group();
    for (let p = 0; p < 3; p++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(2.2 - p * 0.35, 10, 8), cloudMat);
      puff.scale.set(1.5, 0.65, 1.0);
      puff.position.set((p - 1) * 2.1, p === 1 ? 0.5 : 0, (p % 2) * 0.6);
      cg.add(puff);
    }
    cg.position.set(-45 + i * 14, 22 + (i % 3) * 3, -38 - (i % 2) * 14);
    scene.add(cg);
    clouds.push(cg);
  }

  // --- 2. FLOWING RIVER (Sungai) & WOODEN BRIDGE (Jambatan Kayu) ---
  const riverUniforms = { uTime: { value: 0 } };
  const riverMat = new THREE.MeshPhysicalMaterial({
    color: 0x2692b8,
    roughness: 0.14,
    metalness: 0.1,
    clearcoat: 0.9,
    clearcoatRoughness: 0.15,
    transparent: true,
    opacity: 0.88,
  });
  riverMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = riverUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         transformed.z += sin(position.x * 0.8 + uTime * 2.4) * 0.08 + cos(position.y * 1.1 + uTime * 1.8) * 0.05;`
      );
  };
  const riverMesh = new THREE.Mesh(new THREE.PlaneGeometry(140, 8.6, 60, 12), riverMat);
  riverMesh.rotation.x = -Math.PI / 2;
  riverMesh.position.set(0, -0.35, 21.2);
  scene.add(riverMesh);

  // Wooden Arched Bridge over River
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(0, 0, 21.2);
  for (let b = -4; b <= 4; b++) {
    const archY = Math.cos((b / 5) * Math.PI * 0.5) * 0.55;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 0.85), woodFloorMat);
    plank.position.set(0, archY, b * 0.95);
    plank.castShadow = true;
    plank.receiveShadow = true;
    bridgeGroup.add(plank);
  }
  [-1.35, 1.35].forEach((rx) => {
    for (let p = -3; p <= 3; p += 3) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.15, 8), darkTimberMat);
      post.position.set(rx, 0.65, p * 1.1);
      bridgeGroup.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 8.2), darkTimberMat);
    rail.position.set(rx, 1.15, 0);
    bridgeGroup.add(rail);
  });
  scene.add(bridgeGroup);
  // Prevent player walking off into deep river water
  colliders.push({ minX: -26, maxX: -1.6, minZ: 17.4, maxZ: 25 });
  colliders.push({ minX: 1.6, maxX: 26, minZ: 17.4, maxZ: 25 });

  // --- 3. SAWAH PADI (Swaying Rice Fields) & TROPICAL FLORA ---
  const paddyWater = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 15),
    new THREE.MeshStandardMaterial({ color: 0x3b6e4c, roughness: 0.35, metalness: 0.1 })
  );
  paddyWater.rotation.x = -Math.PI / 2;
  paddyWater.position.set(-16.5, 0.03, 5);
  scene.add(paddyWater);

  // Bunds around paddy field
  const bundMat = new THREE.MeshStandardMaterial({ color: 0x5c472c, roughness: 0.9 });
  [
    { x: -16.5, z: -2.5, w: 14.5, d: 0.6 },
    { x: -16.5, z: 12.5, w: 14.5, d: 0.6 },
    { x: -9.5, z: 5, w: 0.6, d: 15 },
  ].forEach((b) => {
    const bund = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.25, b.d), bundMat);
    bund.position.set(b.x, 0.1, b.z);
    scene.add(bund);
  });

  // Instanced swaying rice stalks
  const stalkCount = 160;
  const stalkGeo = new THREE.ConeGeometry(0.08, 0.85, 5);
  stalkGeo.translate(0, 0.42, 0);
  const stalkMat = new THREE.MeshStandardMaterial({ color: 0x76b83f, roughness: 0.8 });
  const riceInstanced = new THREE.InstancedMesh(stalkGeo, stalkMat, stalkCount);
  const dummy = new THREE.Object3D();
  const stalkPositions: { x: number; z: number; phase: number; s: number }[] = [];
  for (let i = 0; i < stalkCount; i++) {
    const col = i % 16;
    const row = Math.floor(i / 16);
    const sx = -22.5 + col * 0.8 + ((i % 3) - 1) * 0.12;
    const sz = -1.5 + row * 1.35 + ((i % 2) - 0.5) * 0.15;
    const sc = 0.85 + (i % 5) * 0.08;
    stalkPositions.push({ x: sx, z: sz, phase: i * 0.45, s: sc });
    dummy.position.set(sx, 0.04, sz);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    riceInstanced.setMatrixAt(i, dummy.matrix);
    riceInstanced.setColorAt(
      i,
      new THREE.Color().setHSL(0.25 + (i % 4) * 0.015, 0.62, 0.44 + (i % 3) * 0.04)
    );
  }
  riceInstanced.computeBoundingSphere();
  scene.add(riceInstanced);
  colliders.push({ minX: -24, maxX: -9.5, minZ: -2.6, maxZ: 12.6 });

  // Composite Coconut Palms (Pokok Kelapa)
  const palmClusters: THREE.Group[] = [];
  function createCoconutPalm(x: number, z: number, scale = 1): THREE.Group {
    const palm = new THREE.Group();
    palm.position.set(x, 0, z);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x735238, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x2f873c,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });
    const coconutMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.7 });

    // Segmented curved trunk
    let curY = 0;
    let curX = 0;
    for (let s = 0; s < 5; s++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 - s * 0.018, 0.22 - s * 0.018, 1.35, 8),
        trunkMat
      );
      curX += s * 0.08;
      curY += 1.25;
      seg.position.set(curX, curY - 0.6, 0);
      seg.rotation.z = -s * 0.045;
      seg.castShadow = true;
      palm.add(seg);
    }

    const crown = new THREE.Group();
    crown.position.set(curX + 0.15, curY, 0);
    palm.add(crown);

    for (let f = 0; f < 8; f++) {
      const frondGroup = new THREE.Group();
      const ang = (f / 8) * Math.PI * 2;
      frondGroup.rotation.y = ang;

      const innerBlade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 1.5), leafMat);
      innerBlade.position.set(0, 0.25, 0.72);
      innerBlade.rotation.x = -0.32;
      innerBlade.castShadow = true;

      const outerTip = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.5, 4), leafMat);
      outerTip.scale.set(1.2, 1, 0.14);
      outerTip.position.set(0, 0.05, 1.95);
      outerTip.rotation.x = Math.PI * 0.68;
      outerTip.castShadow = true;

      frondGroup.add(innerBlade, outerTip);
      crown.add(frondGroup);
    }

    for (let c = 0; c < 3; c++) {
      const nut = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), coconutMat);
      const ang = (c / 3) * Math.PI * 2;
      nut.position.set(Math.cos(ang) * 0.22, -0.25, Math.sin(ang) * 0.22);
      crown.add(nut);
    }

    palm.scale.setScalar(scale);
    scene.add(palm);
    palmClusters.push(crown);
    return palm;
  }

  [
    { x: -11, z: -9, s: 1.05 },
    { x: 11.5, z: -8, s: 1.12 },
    { x: 13.5, z: 3, s: 0.95 },
    { x: 10.5, z: 12, s: 1.0 },
    { x: -8.5, z: 15, s: 0.92 },
    { x: 16, z: -12, s: 1.15 },
    { x: -17, z: -11, s: 1.08 },
  ].forEach((p) => {
    createCoconutPalm(p.x, p.z, p.s);
    colliders.push({ minX: p.x - 0.5, maxX: p.x + 0.5, minZ: p.z - 0.5, maxZ: p.z + 0.5 });
  });

  // Banana Trees (Pokok Pisang) & Bunga Raya (Hibiscus Bushes)
  function createBananaTree(x: number, z: number) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5c8c38, roughness: 0.78 });
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x4ca83e,
      roughness: 0.58,
      side: THREE.DoubleSide,
    });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 2.2, 8), stemMat);
    stem.position.y = 1.1;
    stem.castShadow = true;
    g.add(stem);
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 1.5), leafMat);
      const ang = (i / 5) * Math.PI * 2;
      leaf.position.set(Math.sin(ang) * 0.65, 2.15, Math.cos(ang) * 0.65);
      leaf.rotation.y = ang;
      leaf.rotation.x = 0.42;
      g.add(leaf);
    }
    scene.add(g);
  }
  createBananaTree(9.2, 6.2);
  createBananaTree(-8.8, 5.4);
  createBananaTree(11.8, -1.5);

  const hibiscusPositions: { x: number; z: number }[] = [
    { x: -3.4, z: 10.2 },
    { x: 3.4, z: 10.2 },
    { x: -5.6, z: 8.6 },
    { x: 5.6, z: 8.6 },
    { x: 4.5, z: 14.5 },
    { x: -4.5, z: 14.5 },
  ];
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x2a6b31, roughness: 0.85 });
  const redFlowerMat = new THREE.MeshStandardMaterial({
    color: 0xd92638,
    emissive: 0x3b080d,
    roughness: 0.45,
  });
  hibiscusPositions.forEach((hp) => {
    const bg = new THREE.Group();
    bg.position.set(hp.x, 0, hp.z);
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 1), bushMat);
    bush.position.y = 0.45;
    bush.scale.set(1.2, 0.85, 1.1);
    bush.castShadow = true;
    bg.add(bush);
    for (let fl = 0; fl < 4; fl++) {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 7), redFlowerMat);
      flower.position.set(
        Math.cos(fl * 1.6) * 0.5,
        0.55 + (fl % 2) * 0.2,
        Math.sin(fl * 1.6) * 0.5
      );
      bg.add(flower);
    }
    scene.add(bg);
  });

  // Outdoor Clay Tempayan Jars & Wooden Fence & Yard Pelita Torches
  function createTempayan(x: number, y: number, z: number) {
    const pts = [
      new THREE.Vector2(0.01, 0),
      new THREE.Vector2(0.24, 0.02),
      new THREE.Vector2(0.36, 0.35),
      new THREE.Vector2(0.32, 0.62),
      new THREE.Vector2(0.22, 0.74),
      new THREE.Vector2(0.27, 0.82),
      new THREE.Vector2(0.21, 0.82),
    ];
    const jar = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), clayMat);
    jar.position.set(x, y, z);
    jar.castShadow = true;
    scene.add(jar);
  }
  createTempayan(-2.1, 0, 9.6);
  createTempayan(2.1, 0, 9.6);

  // Yard Wooden Fence
  for (let fx = -7; fx <= 7; fx += 1.4) {
    if (Math.abs(fx) < 2.2) continue;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, 0.14), darkTimberMat);
    post.position.set(fx, 0.47, 11.4);
    post.castShadow = true;
    scene.add(post);
  }
  [-4.9, 4.9].forEach((rx) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.1, 0.08), darkTimberMat);
    rail.position.set(rx, 0.7, 11.4);
    scene.add(rail);
  });

  // Yard Pelita Torches
  const yardFlames: THREE.Mesh[] = [];
  [
    { x: -1.8, z: 12.2 },
    { x: 1.8, z: 12.2 },
    { x: -1.8, z: 16.2 },
    { x: 1.8, z: 16.2 },
  ].forEach((yp) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.35, 8), darkTimberMat);
    pole.position.set(yp.x, 0.675, yp.z);
    scene.add(pole);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.09, 0.12, 10), brassMat);
    bowl.position.set(yp.x, 1.38, yp.z);
    scene.add(bowl);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.18, 6), flameMat);
    fl.position.set(yp.x, 1.52, yp.z);
    scene.add(fl);
    yardFlames.push(fl);
  });

  // Flying Birds & Butterflies
  const birds: { group: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; radius: number; speed: number; offset: number; y: number }[] = [];
  const birdMat = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.7 });
  for (let b = 0; b < 5; b++) {
    const bg = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 6), birdMat);
    body.rotation.x = Math.PI / 2;
    bg.add(body);
    const wingGeo = new THREE.BoxGeometry(0.45, 0.03, 0.18);
    const wL = new THREE.Mesh(wingGeo, birdMat);
    wL.position.x = -0.22;
    const wR = new THREE.Mesh(wingGeo, birdMat);
    wR.position.x = 0.22;
    bg.add(wL, wR);
    scene.add(bg);
    birds.push({
      group: bg,
      wingL: wL,
      wingR: wR,
      radius: 14 + b * 2.5,
      speed: 0.28 + b * 0.04,
      offset: b * 1.4,
      y: 11.5 + (b % 3) * 1.8,
    });
  }

  const butterflies: { group: THREE.Group; origin: { x: number; z: number }; phase: number }[] = [];
  const bfColors = [0xf59e0b, 0x38bdf8, 0xf472b6];
  for (let i = 0; i < 6; i++) {
    const bf = new THREE.Group();
    const wingM = new THREE.MeshBasicMaterial({ color: bfColors[i % bfColors.length], side: THREE.DoubleSide });
    const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.1), wingM);
    wl.position.x = -0.07;
    const wr = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.1), wingM);
    wr.position.x = 0.07;
    bf.add(wl, wr);
    const hp = hibiscusPositions[i % hibiscusPositions.length];
    bf.position.set(hp.x, 1.1, hp.z);
    scene.add(bf);
    butterflies.push({ group: bf, origin: hp, phase: i * 1.1 });
  }

  // --- 4. RUMAH NASKHAH PUSAKA (Traditional Malay Elevated House) ---
  const houseGroup = new THREE.Group();
  scene.add(houseGroup);

  const FLOOR_Y = 1.1;

  // Stilts (Tiang Tinggi)
  const stiltCoords = [
    [-6.2, -6.2], [0, -6.2], [6.2, -6.2],
    [-6.2, -0.5], [6.2, -0.5],
    [-6.2, 5.2], [-2.2, 5.2], [2.2, 5.2], [6.2, 5.2],
    [-4.3, 8.0], [-1.5, 8.0], [1.5, 8.0], [4.3, 8.0],
  ];
  stiltCoords.forEach(([sx, sz]) => {
    const stilt = new THREE.Mesh(new THREE.BoxGeometry(0.32, FLOOR_Y, 0.32), darkTimberMat);
    stilt.position.set(sx, FLOOR_Y / 2, sz);
    stilt.castShadow = true;
    stilt.receiveShadow = true;
    houseGroup.add(stilt);
    // Stone plinth footing (lapik tiang)
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.46), dirtPathMat);
    plinth.position.set(sx, 0.07, sz);
    houseGroup.add(plinth);
  });

  // Main Floor Deck (13m x 12m) & Serambi Verandah (9m x 2.7m)
  const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.18, 12.2), woodFloorMat);
  mainDeck.position.set(0, FLOOR_Y - 0.09, -0.5);
  mainDeck.receiveShadow = true;
  houseGroup.add(mainDeck);

  const serambiDeck = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.16, 2.8), woodFloorMat);
  serambiDeck.position.set(0, FLOOR_Y - 0.08, 6.85);
  serambiDeck.receiveShadow = true;
  houseGroup.add(serambiDeck);

  // Serambi Railings (leaving center gap [-1.5, 1.5] for stairs)
  [
    { x: -3.0, z: 8.15, w: 3.0, d: 0.14 },
    { x: 3.0, z: 8.15, w: 3.0, d: 0.14 },
    { x: -4.5, z: 6.85, w: 0.14, d: 2.7 },
    { x: 4.5, z: 6.85, w: 0.14, d: 2.7 },
  ].forEach((r) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.85, r.d), darkTimberMat);
    rail.position.set(r.x, FLOOR_Y + 0.42, r.z);
    rail.castShadow = true;
    houseGroup.add(rail);
  });
  colliders.push({ minX: -4.6, maxX: -1.5, minZ: 7.9, maxZ: 8.4 });
  colliders.push({ minX: 1.5, maxX: 4.6, minZ: 7.9, maxZ: 8.4 });
  colliders.push({ minX: -4.7, maxX: -4.3, minZ: 5.5, maxZ: 8.3 });
  colliders.push({ minX: 4.3, maxX: 4.7, minZ: 5.5, maxZ: 8.3 });

  // Wooden Stairs (Tangga Kayu) from z=10.6 (y=0) to z=8.2 (y=1.1)
  const stepCount = 6;
  for (let s = 0; s < stepCount; s++) {
    const t = (s + 0.5) / stepCount;
    const stepY = t * FLOOR_Y;
    const stepZ = 10.6 - t * 2.4;
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.14, 0.45), woodFloorMat);
    stepMesh.position.set(0, stepY - 0.05, stepZ);
    stepMesh.castShadow = true;
    stepMesh.receiveShadow = true;
    houseGroup.add(stepMesh);
  }
  [-1.55, 1.55].forEach((sx) => {
    const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.25, 2.75), darkTimberMat);
    stringer.position.set(sx, FLOOR_Y * 0.5 + 0.05, 9.4);
    stringer.rotation.x = Math.atan2(FLOOR_Y, 2.4);
    houseGroup.add(stringer);
  });

  // House Walls (height = 3.6m above FLOOR_Y)
  const WALL_H = 3.6;
  const WALL_Y = FLOOR_Y + WALL_H / 2;

  const frontWallMat = woodWallMat.clone();
  frontWallMat.transparent = true;
  wallFadeTargets.push(frontWallMat);

  // Front Wall Left & Right of 2.8m Doorway + Lintel
  const fwLeft = new THREE.Mesh(new THREE.BoxGeometry(5.1, WALL_H, 0.24), frontWallMat);
  fwLeft.position.set(-3.95, WALL_Y, 5.5);
  fwLeft.castShadow = true;
  fwLeft.receiveShadow = true;
  houseGroup.add(fwLeft);

  const fwRight = new THREE.Mesh(new THREE.BoxGeometry(5.1, WALL_H, 0.24), frontWallMat);
  fwRight.position.set(3.95, WALL_Y, 5.5);
  fwRight.castShadow = true;
  fwRight.receiveShadow = true;
  houseGroup.add(fwRight);

  const fwLintel = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 0.24), frontWallMat);
  fwLintel.position.set(0, FLOOR_Y + WALL_H - 0.425, 5.5);
  houseGroup.add(fwLintel);

  // Front wall colliders (leaving doorway x ∈ [-1.4, 1.4] open!)
  colliders.push({ minX: -6.6, maxX: -1.45, minZ: 5.25, maxZ: 5.75 });
  colliders.push({ minX: 1.45, maxX: 6.6, minZ: 5.25, maxZ: 5.75 });

  // Double Entrance Doors (Pintu Utama)
  const doorLeft = new THREE.Group();
  doorLeft.position.set(-1.38, FLOOR_Y, 5.5);
  const doorLeafL = new THREE.Mesh(new THREE.BoxGeometry(1.36, 2.72, 0.1), darkTimberMat);
  doorLeafL.position.set(0.68, 1.36, 0);
  const doorKnobL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), brassMat);
  doorKnobL.position.set(1.2, 1.25, 0.08);
  doorLeft.add(doorLeafL, doorKnobL);
  houseGroup.add(doorLeft);

  const doorRight = new THREE.Group();
  doorRight.position.set(1.38, FLOOR_Y, 5.5);
  const doorLeafR = new THREE.Mesh(new THREE.BoxGeometry(1.36, 2.72, 0.1), darkTimberMat);
  doorLeafR.position.set(-0.68, 1.36, 0);
  const doorKnobR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), brassMat);
  doorKnobR.position.set(-1.2, 1.25, 0.08);
  doorRight.add(doorLeafR, doorKnobR);
  houseGroup.add(doorRight);

  // Back Wall (z = -6.5)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(13.2, WALL_H, 0.24), woodWallMat);
  backWall.position.set(0, WALL_Y, -6.5);
  backWall.receiveShadow = true;
  houseGroup.add(backWall);
  colliders.push({ minX: -6.6, maxX: 6.6, minZ: -6.75, maxZ: -6.25 });

  // Left Wall (x = -6.5)
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.24, WALL_H, 12.2), woodWallMat);
  leftWall.position.set(-6.5, WALL_Y, -0.5);
  leftWall.receiveShadow = true;
  houseGroup.add(leftWall);
  colliders.push({ minX: -6.75, maxX: -6.25, minZ: -6.6, maxZ: 5.6 });

  // Right Wall (x = 6.5) with Carved Window Opening at z = -1.8!
  const rwBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, WALL_H, 3.6), woodWallMat);
  rwBack.position.set(6.5, WALL_Y, -4.7);
  houseGroup.add(rwBack);

  const rwFront = new THREE.Mesh(new THREE.BoxGeometry(0.24, WALL_H, 6.2), woodWallMat);
  rwFront.position.set(6.5, WALL_Y, 2.4);
  houseGroup.add(rwFront);

  const rwBelowWin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.0, 2.4), woodWallMat);
  rwBelowWin.position.set(6.5, FLOOR_Y + 0.5, -1.8);
  houseGroup.add(rwBelowWin);

  const rwAboveWin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.0, 2.4), woodWallMat);
  rwAboveWin.position.set(6.5, FLOOR_Y + WALL_H - 0.5, -1.8);
  houseGroup.add(rwAboveWin);
  colliders.push({ minX: 6.25, maxX: 6.75, minZ: -6.6, maxZ: 5.6 });

  // Carved Window Frame & Open Shutters (Tingkap Berukir) at x = 6.45, z = -1.8
  const windowFrame = new THREE.Group();
  windowFrame.position.set(6.45, FLOOR_Y + 1.8, -1.8);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 2.45), darkTimberMat);
  sill.position.set(-0.1, -0.8, 0);
  windowFrame.add(sill);
  [-0.85, 0, 0.85].forEach((bz) => {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.55, 8), darkTimberMat);
    bar.position.set(0, 0, bz);
    windowFrame.add(bar);
  });
  // Translucent golden sunbeam shaft entering Tingkap Berukir
  const sunShaftMat = new THREE.MeshBasicMaterial({
    color: 0xffe49e,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const sunShaft = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.4, 12, 1, true), sunShaftMat);
  sunShaft.position.set(-1.7, -0.5, 0);
  sunShaft.rotation.z = -Math.PI * 0.34;
  windowFrame.add(sunShaft);
  houseGroup.add(windowFrame);

  // Rumbia Thatched Roof (pitched roof + serambi awning)
  const roofGroup = new THREE.Group();
  const roofPitch = 0.44;
  const roofSlopeL = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.22, 14.2), rumbiaMat);
  roofSlopeL.position.set(-3.4, FLOOR_Y + WALL_H + 1.4, -0.5);
  roofSlopeL.rotation.z = roofPitch;
  roofSlopeL.castShadow = true;

  const roofSlopeR = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.22, 14.2), rumbiaMat);
  roofSlopeR.position.set(3.4, FLOOR_Y + WALL_H + 1.4, -0.5);
  roofSlopeR.rotation.z = -roofPitch;
  roofSlopeR.castShadow = true;

  const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 14.6), darkTimberMat);
  ridgeBeam.position.set(0, FLOOR_Y + WALL_H + 3.05, -0.5);

  const serambiRoof = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.18, 3.6), rumbiaMat);
  serambiRoof.position.set(0, FLOOR_Y + 3.25, 7.1);
  serambiRoof.rotation.x = 0.25;
  serambiRoof.castShadow = true;

  // Traditional Gable Finials (Tunjuk Langit)
  [6.6, -7.6].forEach((tz) => {
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.85, 4), brassMat);
    finial.position.set(0, FLOOR_Y + WALL_H + 3.45, tz);
    roofGroup.add(finial);
  });

  // Traditional Gable Walls (Tebar Layar) sealing front and back roof triangles
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-6.5, 0);
  gableShape.lineTo(6.5, 0);
  gableShape.lineTo(0, 3.02);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 0.22, bevelEnabled: false });

  const frontGable = new THREE.Mesh(gableGeo, frontWallMat);
  frontGable.position.set(0, FLOOR_Y + WALL_H, 5.39);
  frontGable.castShadow = true;

  const backGable = new THREE.Mesh(gableGeo, woodWallMat);
  backGable.position.set(0, FLOOR_Y + WALL_H, -6.61);
  backGable.castShadow = true;

  // Gold carved gable trim triangles
  [5.63, -6.63].forEach((gz) => {
    const trimL = new THREE.Mesh(new THREE.BoxGeometry(7.25, 0.12, 0.12), brassMat);
    trimL.position.set(-3.25, FLOOR_Y + WALL_H + 1.5, gz);
    trimL.rotation.z = 0.435;
    const trimR = new THREE.Mesh(new THREE.BoxGeometry(7.25, 0.12, 0.12), brassMat);
    trimR.position.set(3.25, FLOOR_Y + WALL_H + 1.5, gz);
    trimR.rotation.z = -0.435;
    roofGroup.add(trimL, trimR);
  });

  roofGroup.add(roofSlopeL, roofSlopeR, ridgeBeam, serambiRoof, frontGable, backGable);
  houseGroup.add(roofGroup);

  // --- 5. INTERIOR PROPS & 5 INTERACTIVE SCROLL STATIONS ---
  // Tikar Mengkuang woven mats
  const matCenter = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.025, 4.2), mengkuangMat);
  matCenter.position.set(0, FLOOR_Y + 0.015, -2.5);
  matCenter.receiveShadow = true;
  houseGroup.add(matCenter);

  // Carved Interior Pillars (Tiang Seri)
  [
    [-3.2, 1.5],
    [3.2, 1.5],
  ].forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, WALL_H, 10), darkTimberMat);
    pillar.position.set(px, FLOOR_Y + WALL_H / 2, pz);
    pillar.castShadow = true;
    houseGroup.add(pillar);
    colliders.push({ minX: px - 0.28, maxX: px + 0.28, minZ: pz - 0.28, maxZ: pz + 0.28 });
  });

  // Gentle Swaying Window Curtains (Tirai)
  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0xf4e3bd,
    roughness: 0.85,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  });
  const curtainL = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.85, 6, 6), curtainMat);
  curtainL.position.set(6.22, FLOOR_Y + 1.85, -2.85);
  curtainL.rotation.y = Math.PI / 2;
  const curtainR = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.85, 6, 6), curtainMat);
  curtainR.position.set(6.22, FLOOR_Y + 1.85, -0.75);
  curtainR.rotation.y = Math.PI / 2;
  houseGroup.add(curtainL, curtainR);

  // STATION 1: Rak Kitab Lama (Bookshelf at x=-5.8, z=-2.6)
  const rakGroup = new THREE.Group();
  rakGroup.position.set(-5.75, FLOOR_Y, -2.6);
  const rakBody = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.35, 2.2), darkTimberMat);
  rakBody.position.y = 1.175;
  rakBody.castShadow = true;
  rakGroup.add(rakBody);
  const bookColors = [0x8b2635, 0x0d5c46, 0x1e40af, 0x92400e, 0x6b21a8];
  for (let shelf = 0; shelf < 3; shelf++) {
    for (let bk = 0; bk < 6; bk++) {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.34, 0.16),
        new THREE.MeshStandardMaterial({ color: bookColors[(shelf + bk) % bookColors.length], roughness: 0.7 })
      );
      book.position.set(0.2, 0.48 + shelf * 0.65, -0.75 + bk * 0.28);
      rakGroup.add(book);
    }
  }
  houseGroup.add(rakGroup);
  colliders.push({ minX: -6.3, maxX: -5.1, minZ: -3.85, maxZ: -1.35 });

  // STATION 2: Peti Pusaka (Treasure Chest with hinged lid at x=-5.1, z=-5.2)
  const chestGroup = new THREE.Group();
  chestGroup.position.set(-5.1, FLOOR_Y, -5.2);
  chestGroup.rotation.y = 0.45;
  const chestBase = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.62, 0.85), darkTimberMat);
  chestBase.position.y = 0.31;
  chestBase.castShadow = true;
  const chestBand = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.08, 0.88), brassMat);
  chestBand.position.y = 0.52;
  chestGroup.add(chestBase, chestBand);

  const chestLid = new THREE.Group();
  chestLid.position.set(0, 0.62, -0.4);
  const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.22, 0.85), darkTimberMat);
  lidMesh.position.set(0, 0.11, 0.4);
  const lidTrim = new THREE.Mesh(new THREE.BoxGeometry(1.39, 0.06, 0.12), brassMat);
  lidTrim.position.set(0, 0.22, 0.4);
  chestLid.add(lidMesh, lidTrim);
  chestGroup.add(chestLid);
  houseGroup.add(chestGroup);
  colliders.push({ minX: -5.9, maxX: -4.3, minZ: -5.9, maxZ: -4.5 });

  // Almari Kayu decorative cupboard against back-left wall
  const almari = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.4, 0.75), woodWallMat);
  almari.position.set(-2.5, FLOOR_Y + 1.2, -5.85);
  almari.castShadow = true;
  houseGroup.add(almari);
  colliders.push({ minX: -3.5, maxX: -1.5, minZ: -6.3, maxZ: -5.4 });

  // STATION 4: Meja Penulisan (Writing Desk at x=4.8, z=-4.9)
  const deskGroup = new THREE.Group();
  deskGroup.position.set(4.8, FLOOR_Y, -4.9);
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.1, 1.1), woodFloorMat);
  deskTop.position.y = 0.85;
  deskTop.castShadow = true;
  deskGroup.add(deskTop);
  [
    [-0.78, -0.42],
    [0.78, -0.42],
    [-0.78, 0.42],
    [0.78, 0.42],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.82, 0.1), darkTimberMat);
    leg.position.set(lx, 0.41, lz);
    deskGroup.add(leg);
  });
  // Bekas Dakwat (inkwell) & rolled papers
  const inkwell = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.14, 10), brassMat);
  inkwell.position.set(-0.45, 0.96, 0.15);
  deskGroup.add(inkwell);

  const deskPapersGroup = new THREE.Group();
  deskPapersGroup.position.set(0.15, 0.95, 0.05);
  for (let r = 0; r < 3; r++) {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.55, 10), parchmentMat);
    roll.rotation.z = Math.PI / 2;
    roll.rotation.y = (r - 1) * 0.25;
    roll.position.set(0, r * 0.04, (r - 1) * 0.09);
    deskPapersGroup.add(roll);
  }
  deskGroup.add(deskPapersGroup);
  houseGroup.add(deskGroup);
  colliders.push({ minX: 3.75, maxX: 5.85, minZ: -5.6, maxZ: -4.2 });

  // STATION 5: Pelita Warisan (Pedestal Brass Oil Lamp at x=-1.8, z=-3.6)
  const pelitaStand = new THREE.Group();
  pelitaStand.position.set(-1.8, FLOOR_Y, -3.6);
  const standPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.28, 0.04),
    new THREE.Vector2(0.12, 0.25),
    new THREE.Vector2(0.09, 0.95),
    new THREE.Vector2(0.24, 1.05),
    new THREE.Vector2(0.15, 1.15),
  ];
  const standBase = new THREE.Mesh(new THREE.LatheGeometry(standPts, 14), darkTimberMat);
  standBase.castShadow = true;
  pelitaStand.add(standBase);

  const brassBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.16, 12), brassMat);
  brassBowl.position.y = 1.22;
  pelitaStand.add(brassBowl);

  const pelitaFlame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 8), flameMat);
  pelitaFlame.position.y = 1.4;
  pelitaStand.add(pelitaFlame);

  const pelitaLight = new THREE.PointLight(0xffb84d, 2.2, 9, 1.8);
  pelitaLight.position.set(-1.8, FLOOR_Y + 1.55, -3.6);
  scene.add(pelitaLight);
  houseGroup.add(pelitaStand);
  colliders.push({ minX: -2.15, maxX: -1.45, minZ: -3.95, maxZ: -3.25 });

  // CENTRAL MEJA UTAMA & KITAB WARISAN (x=0, z=-4.0)
  const mainTable = new THREE.Group();
  mainTable.position.set(KITAB_STATION.worldPos.x, FLOOR_Y, KITAB_STATION.worldPos.z);
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 1.3), darkTimberMat);
  tableTop.position.y = 0.88;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  mainTable.add(tableTop);
  [
    [-0.85, -0.45],
    [0.85, -0.45],
    [-0.85, 0.45],
    [0.85, 0.45],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.12), darkTimberMat);
    leg.position.set(lx, 0.425, lz);
    mainTable.add(leg);
  });
  houseGroup.add(mainTable);
  colliders.push({ minX: -1.2, maxX: 1.2, minZ: -4.8, maxZ: -3.2 });

  const kitabGroup = new THREE.Group();
  kitabGroup.position.set(KITAB_STATION.worldPos.x, FLOOR_Y + 0.99, KITAB_STATION.worldPos.z);
  const kitabCoverMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.kitabCoverColor,
    emissive: 0xd4af37,
    emissiveIntensity: 0.28,
    roughness: 0.42,
    metalness: 0.35,
  });
  const kitabCover = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.09, 0.56), kitabCoverMat);
  kitabCover.castShadow = true;
  kitabGroup.add(kitabCover);
  const kitabLight = new THREE.PointLight(0xffd269, 1.5, 6.5, 1.8);
  kitabLight.position.set(KITAB_STATION.worldPos.x, FLOOR_Y + 1.5, KITAB_STATION.worldPos.z);
  scene.add(kitabLight);
  scene.add(kitabGroup);

  // Additional Interior Pelita Tembaga Wall Sconces
  const interiorFlames: THREE.Mesh[] = [];
  [
    [-6.15, 2.2, -0.5],
    [6.15, 2.2, 2.2],
  ].forEach(([lx, ly, lz]) => {
    const sconce = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.06, 0.12, 10), brassMat);
    sconce.position.set(lx, FLOOR_Y + ly, lz);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 6), flameMat);
    fl.position.set(lx, FLOOR_Y + ly + 0.14, lz);
    scene.add(sconce, fl);
    interiorFlames.push(fl);
  });

  // --- 6. FIVE HIDDEN SCROLL OBJECTS ---
  const scrollVisuals = {} as Record<ScrollId, ScrollVisual>;
  SCROLL_STATIONS.forEach((st) => {
    const g = new THREE.Group();
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.54), parchmentMat);
    const rodTop = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.48, 8), brassMat);
    rodTop.rotation.z = Math.PI / 2;
    rodTop.position.z = -0.27;
    const rodBot = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.48, 8), brassMat);
    rodBot.rotation.z = Math.PI / 2;
    rodBot.position.z = 0.27;
    g.add(sheet, rodTop, rodBot);

    const basePos = new THREE.Vector3(st.worldPos.x, FLOOR_Y + st.worldPos.y, st.worldPos.z);
    g.position.copy(basePos);
    g.rotation.x = 0.25;

    const glowLight = new THREE.PointLight(0xffd66b, 0.0, 3.8, 2);
    glowLight.position.copy(basePos);
    scene.add(g, glowLight);

    // Initially hidden inside furniture until revealed or during intro scatter!
    const revealedByDefault = st.id === 'tingkap';
    g.visible = revealedByDefault;

    scrollVisuals[st.id] = {
      id: st.id,
      mesh: g,
      light: glowLight,
      revealed: revealedByDefault,
      collected: false,
      flying: false,
      flyProgress: 0,
      startPos: basePos.clone(),
    };
  });

  // --- 7. GLOWING DUST MOTES & VICTORY STAR BURST PARTICLES ---
  const dustCount = 48;
  const dustGeo = new THREE.OctahedronGeometry(0.04, 0);
  const dustMat = new THREE.MeshBasicMaterial({ color: 0xffe49e, transparent: true, opacity: 0.75 });
  const dustMesh = new THREE.InstancedMesh(dustGeo, dustMat, dustCount);
  const dustSeeds: { x: number; y: number; z: number; speed: number; phase: number }[] = [];
  for (let i = 0; i < dustCount; i++) {
    const seed = {
      x: ((i * 37) % 110) / 10 - 5.5,
      y: FLOOR_Y + 0.5 + ((i * 19) % 24) / 10,
      z: ((i * 53) % 100) / 10 - 5.5,
      speed: 0.4 + (i % 5) * 0.15,
      phase: i * 0.7,
    };
    dustSeeds.push(seed);
    dummy.position.set(seed.x, seed.y, seed.z);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    dustMesh.setMatrixAt(i, dummy.matrix);
  }
  dustMesh.frustumCulled = false;
  scene.add(dustMesh);

  // Victory Star Particles
  const starCount = 42;
  const starGeo = new THREE.OctahedronGeometry(0.11, 0);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffdf6b });
  const starMesh = new THREE.InstancedMesh(starGeo, starMat, starCount);
  starMesh.visible = false;
  starMesh.frustumCulled = false;
  scene.add(starMesh);

  // --- GROUND HEIGHT & INDOOR CHECK ---
  function groundHeightAt(x: number, z: number): number {
    // Inside house
    if (x >= -6.5 && x <= 6.5 && z >= -6.5 && z <= 5.55) {
      return FLOOR_Y;
    }
    // Serambi verandah
    if (x >= -4.6 && x <= 4.6 && z > 5.55 && z <= 8.25) {
      return FLOOR_Y;
    }
    // Wooden Stairs ramp
    if (x >= -1.6 && x <= 1.6 && z > 8.25 && z <= 10.65) {
      const t = (10.65 - z) / (10.65 - 8.25);
      return THREE.MathUtils.clamp(t, 0, 1) * FLOOR_Y;
    }
    return 0;
  }

  function isInsideHouse(x: number, z: number, y: number): boolean {
    return y > 0.7 && x >= -6.6 && x <= 6.6 && z >= -6.6 && z <= 5.8;
  }

  let chestOpenTarget = 0;
  let chestOpenCurrent = 0;
  let deskMoved = false;

  function triggerChestOpen() {
    chestOpenTarget = 1;
    const sv = scrollVisuals.peti;
    sv.revealed = true;
    sv.mesh.visible = true;
  }

  function triggerScrollFly(id: ScrollId) {
    const sv = scrollVisuals[id];
    if (id === 'meja' && !deskMoved) {
      deskMoved = true;
      deskPapersGroup.position.x += 0.35;
      deskPapersGroup.rotation.y += 0.45;
    }
    sv.revealed = true;
    sv.mesh.visible = true;
    sv.flying = true;
    sv.flyProgress = 0;
    sv.startPos.copy(sv.mesh.position);
  }

  function setDoorOpenAmount(open01: number) {
    const ang = THREE.MathUtils.clamp(open01, 0, 1) * (Math.PI * 0.52);
    doorLeft.rotation.y = -ang;
    doorRight.rotation.y = ang;
  }

  function setIntroScatterProgress(t: number) {
    const clamped = THREE.MathUtils.clamp(t, 0, 1);
    const origin = new THREE.Vector3(KITAB_STATION.worldPos.x, FLOOR_Y + 1.35, KITAB_STATION.worldPos.z);
    SCROLL_STATIONS.forEach((st, idx) => {
      const sv = scrollVisuals[st.id];
      if (clamped <= 0) {
        sv.mesh.visible = st.id === 'tingkap';
        sv.mesh.position.copy(sv.startPos);
      } else if (clamped < 1) {
        sv.mesh.visible = true;
        const arc = Math.sin(clamped * Math.PI) * (1.2 + idx * 0.15);
        sv.mesh.position.lerpVectors(origin, sv.startPos, clamped);
        sv.mesh.position.y += arc;
        sv.mesh.rotation.y = clamped * Math.PI * 3;
      } else {
        sv.mesh.position.copy(sv.startPos);
        sv.mesh.rotation.set(0.25, 0, 0);
        sv.mesh.visible = st.id === 'tingkap';
      }
    });
  }

  const _tmpVec = new THREE.Vector3();

  function updateEnvironment(
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    foundScrolls: ScrollId[],
    victoryActive: boolean,
    lowGraphics: boolean,
    reduceMotion: boolean
  ) {
    const motionScale = reduceMotion ? 0.15 : 1;

    // 1. River wave shader time
    riverUniforms.uTime.value = elapsed * motionScale;

    // 2. Drifting clouds
    clouds.forEach((c, idx) => {
      c.position.x += dt * (0.45 + idx * 0.05) * motionScale;
      if (c.position.x > 60) c.position.x = -60;
    });

    // 3. Swaying rice stalks (skip heavy per-instance matrix updates in lowGraphics + reduced motion)
    if (!lowGraphics) {
      for (let i = 0; i < stalkCount; i++) {
        const sp = stalkPositions[i];
        dummy.position.set(sp.x, 0.04, sp.z);
        dummy.rotation.set(
          Math.sin(elapsed * 2.1 + sp.phase) * 0.09 * motionScale,
          0,
          Math.cos(elapsed * 1.7 + sp.phase) * 0.08 * motionScale
        );
        dummy.scale.setScalar(sp.s);
        dummy.updateMatrix();
        riceInstanced.setMatrixAt(i, dummy.matrix);
      }
      riceInstanced.instanceMatrix.needsUpdate = true;
    }

    // 4. Palm frond breeze & flying birds & butterflies
    palmClusters.forEach((crown, idx) => {
      crown.rotation.z = Math.sin(elapsed * 1.3 + idx) * 0.045 * motionScale;
    });

    birds.forEach((b) => {
      const ang = elapsed * b.speed * motionScale + b.offset;
      b.group.position.set(
        Math.cos(ang) * b.radius,
        b.y + Math.sin(elapsed * 1.5 + b.offset) * 0.4,
        Math.sin(ang) * b.radius - 6
      );
      b.group.rotation.y = -ang;
      const flap = Math.sin(elapsed * 9 + b.offset) * 0.45 * motionScale;
      b.wingL.rotation.z = flap;
      b.wingR.rotation.z = -flap;
    });

    butterflies.forEach((bf) => {
      const t = elapsed * 2.2 * motionScale + bf.phase;
      bf.group.position.set(
        bf.origin.x + Math.sin(t * 0.9) * 0.85,
        1.0 + Math.sin(t * 1.7) * 0.35,
        bf.origin.z + Math.cos(t * 1.1) * 0.85
      );
      bf.group.rotation.y = t;
      const flutter = Math.sin(elapsed * 14 + bf.phase) * 0.65 * motionScale;
      bf.group.children[0].rotation.z = flutter;
      bf.group.children[1].rotation.z = -flutter;
    });

    // 5. Pelita flickering & curtain sway
    const flicker = 1 + Math.sin(elapsed * 11) * 0.14 + Math.cos(elapsed * 17) * 0.08;
    pelitaFlame.scale.set(1, flicker, 1);
    pelitaLight.intensity = (victoryActive ? 4.8 : 2.2) * (0.92 + flicker * 0.08);
    yardFlames.forEach((f, i) => {
      f.scale.set(1, 0.9 + Math.sin(elapsed * 10 + i) * 0.15, 1);
    });
    interiorFlames.forEach((f, i) => {
      f.scale.set(1, 0.9 + Math.cos(elapsed * 12 + i) * 0.14, 1);
    });
    curtainL.rotation.z = Math.sin(elapsed * 1.4) * 0.05 * motionScale;
    curtainR.rotation.z = Math.sin(elapsed * 1.4 + 0.7) * 0.05 * motionScale;

    // 6. Chest lid animation
    chestOpenCurrent = THREE.MathUtils.lerp(chestOpenCurrent, chestOpenTarget, 1 - Math.exp(-8 * dt));
    chestLid.rotation.x = -chestOpenCurrent * (Math.PI * 0.58);

    // 7. Scroll glow & fly-to-Kitab animation
    const kitabTarget = new THREE.Vector3(
      KITAB_STATION.worldPos.x,
      FLOOR_Y + 1.2,
      KITAB_STATION.worldPos.z
    );

    SCROLL_STATIONS.forEach((st) => {
      const sv = scrollVisuals[st.id];
      const isFound = foundScrolls.includes(st.id);

      if (sv.flying) {
        sv.flyProgress = Math.min(1, sv.flyProgress + dt * 0.95);
        const t = sv.flyProgress;
        sv.mesh.position.lerpVectors(sv.startPos, kitabTarget, t);
        sv.mesh.position.y += Math.sin(t * Math.PI) * 1.3;
        sv.mesh.rotation.y += dt * 7;
        sv.mesh.scale.setScalar(1 - t * 0.65);
        sv.light.intensity = 2.6 * (1 - t);
        if (t >= 1) {
          sv.flying = false;
          sv.collected = true;
          sv.mesh.visible = false;
        }
      } else if (!isFound) {
        _tmpVec.set(st.worldPos.x, FLOOR_Y + 1.0, st.worldPos.z);
        const dist = playerPos.distanceTo(_tmpVec);
        const nearGlow = dist < 4.5 ? (1 - dist / 4.5) * 2.2 : 0.2;
        sv.light.intensity = nearGlow * (0.85 + Math.sin(elapsed * 4) * 0.15);
        if (sv.mesh.visible) {
          sv.mesh.position.y = sv.startPos.y + Math.sin(elapsed * 2.4) * 0.07 * motionScale;
        }
      } else {
        sv.light.intensity = 0;
        sv.mesh.visible = false;
      }
    });

    // 8. Kitab Warisan glow
    const all5Found = foundScrolls.length >= 5;
    kitabGroup.position.y =
      FLOOR_Y + 0.99 + (all5Found ? Math.sin(elapsed * 2.6) * 0.06 * motionScale : 0);
    kitabLight.intensity = victoryActive
      ? 4.6
      : all5Found
      ? 2.8 + Math.sin(elapsed * 4) * 0.5
      : 1.1;

    // 9. Floating Dust Motes inside Rumah Naskhah Pusaka
    if (!lowGraphics) {
      for (let i = 0; i < dustCount; i++) {
        const d = dustSeeds[i];
        dummy.position.set(
          d.x + Math.sin(elapsed * d.speed + d.phase) * 0.25 * motionScale,
          d.y + Math.cos(elapsed * d.speed * 0.8 + d.phase) * 0.18 * motionScale,
          d.z + Math.sin(elapsed * d.speed * 0.7 + d.phase) * 0.25 * motionScale
        );
        const sc = 0.7 + Math.sin(elapsed * 2 + d.phase) * 0.35;
        dummy.scale.setScalar(sc);
        dummy.updateMatrix();
        dustMesh.setMatrixAt(i, dummy.matrix);
      }
      dustMesh.instanceMatrix.needsUpdate = true;
    }

    // 10. Victory Golden Star Burst
    starMesh.visible = victoryActive;
    if (victoryActive) {
      for (let i = 0; i < starCount; i++) {
        const ang = (i / starCount) * Math.PI * 2 + elapsed * 0.7;
        const rad = 1.2 + ((i * 13) % 45) / 10;
        const sy = FLOOR_Y + 1.2 + ((elapsed * 1.4 + i * 0.35) % 3.2);
        dummy.position.set(Math.cos(ang) * rad, sy, -3.0 + Math.sin(ang) * rad);
        dummy.rotation.set(elapsed * 2, elapsed * 1.5, i);
        dummy.scale.setScalar(0.8 + Math.sin(elapsed * 5 + i) * 0.3);
        dummy.updateMatrix();
        starMesh.setMatrixAt(i, dummy.matrix);
      }
      starMesh.instanceMatrix.needsUpdate = true;
    }

    // 11. Subtle front wall transparency when camera/player is inside looking toward front
    const inside = isInsideHouse(playerPos.x, playerPos.z, playerPos.y);
    const targetOpacity = inside ? 0.35 : 1.0;
    wallFadeTargets.forEach((m) => {
      m.opacity = THREE.MathUtils.lerp(m.opacity, targetOpacity, 1 - Math.exp(-8 * dt));
    });
  }

  return {
    colliders,
    worldBounds,
    groundHeightAt,
    isInsideHouse,
    doorLeft,
    doorRight,
    chestLid,
    deskPapersGroup,
    pelitaFlame,
    pelitaLight,
    kitabGroup,
    kitabLight,
    scrollVisuals,
    wallFadeTargets,
    updateEnvironment,
    triggerChestOpen,
    triggerScrollFly,
    setDoorOpenAmount,
    setIntroScatterProgress,
  };
}
