import * as THREE from 'three';
import type { ObstacleSpec } from '../game/types';

export type HangTuahPose =
  | 'idle'
  | 'point'
  | 'ride'
  | 'celebrate'
  | 'hit';

export interface HangTuahRig {
  group: THREE.Group;
  setPose: (pose: HangTuahPose, elapsed: number, verticalVel?: number) => void;
}

export function buildHangTuahModel(songketTex: THREE.Texture): HangTuahRig {
  const group = new THREE.Group();

  const emeraldMat = new THREE.MeshStandardMaterial({
    color: 0x066a4b,
    roughness: 0.72,
    metalness: 0.05,
  });
  const songketMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: songketTex,
    roughness: 0.52,
    metalness: 0.28,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf4b63d,
    roughness: 0.28,
    metalness: 0.82,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xdba37b,
    roughness: 0.68,
    metalness: 0.02,
  });
  const darkHairMat = new THREE.MeshStandardMaterial({
    color: 0x261a14,
    roughness: 0.85,
  });
  const capalMat = new THREE.MeshStandardMaterial({
    color: 0x452614,
    roughness: 0.78,
  });

  // Legs & traditional capal shoes (pivoted at bottom center y=0)
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.14, 0.56, 0);
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.14, 0.56, 0);

  const legGeo = new THREE.CapsuleGeometry(0.09, 0.34, 6, 12);
  const shoeGeo = new THREE.BoxGeometry(0.16, 0.1, 0.28);

  const lLegMesh = new THREE.Mesh(legGeo, emeraldMat);
  lLegMesh.position.y = -0.22;
  const lShoe = new THREE.Mesh(shoeGeo, capalMat);
  lShoe.position.set(0, -0.5, 0.05);
  leftLeg.add(lLegMesh, lShoe);

  const rLegMesh = new THREE.Mesh(legGeo, emeraldMat);
  rLegMesh.position.y = -0.22;
  const rShoe = new THREE.Mesh(shoeGeo, capalMat);
  rShoe.position.set(0, -0.5, 0.05);
  rightLeg.add(rLegMesh, rShoe);

  group.add(leftLeg, rightLeg);

  // Upper body pivot for natural leaning
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.56, 0);
  group.add(torsoPivot);

  // Samping songket skirt wrap
  const sampingGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.38, 16);
  const samping = new THREE.Mesh(sampingGeo, songketMat);
  samping.position.y = 0.14;
  samping.castShadow = true;
  torsoPivot.add(samping);

  // Gold belt buckle (Pending)
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.05), goldMat);
  buckle.position.set(0, 0.29, 0.25);
  torsoPivot.add(buckle);

  // Baju Melayu torso
  const chestGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.52, 16);
  const chest = new THREE.Mesh(chestGeo, emeraldMat);
  chest.position.y = 0.56;
  chest.castShadow = true;
  torsoPivot.add(chest);

  // Cekak Musang collar & gold buttons
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.08, 14), emeraldMat);
  collar.position.y = 0.85;
  torsoPivot.add(collar);
  for (let b = 0; b < 3; b++) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), goldMat);
    btn.position.set(0, 0.77 - b * 0.09, 0.22);
    torsoPivot.add(btn);
  }

  // Head & Friendly Face
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.07, 0);
  torsoPivot.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 20, 20), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Friendly eyes + brows + smile
  const eyeGeo = new THREE.SphereGeometry(0.032, 10, 10);
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1e140f, roughness: 0.2 });
  [-0.08, 0.08].forEach((ex) => {
    const eyeWhite = new THREE.Mesh(eyeGeo, whiteMat);
    eyeWhite.position.set(ex, 0.03, 0.195);
    eyeWhite.scale.set(1, 1.15, 0.65);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.019, 8, 8), pupilMat);
    pupil.position.set(ex, 0.03, 0.215);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.018, 0.02), darkHairMat);
    brow.position.set(ex, 0.095, 0.205);
    headGroup.add(eyeWhite, pupil, brow);
  });

  // Gentle nose & warm smile arc
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), skinMat);
  nose.position.set(0, -0.01, 0.23);
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.012, 8, 14, Math.PI * 0.8),
    darkHairMat,
  );
  smile.position.set(0, -0.055, 0.2);
  smile.rotation.x = Math.PI * 0.9;
  smile.rotation.z = Math.PI * 0.1;
  headGroup.add(nose, smile);

  // Tanjak Warisan (Emerald + Gold traditional crest)
  const tanjakGroup = new THREE.Group();
  tanjakGroup.position.set(0, 0.14, 0);
  headGroup.add(tanjakGroup);

  const tanjakBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.235, 0.14, 18),
    songketMat,
  );
  tanjakBand.rotation.x = -0.1;
  tanjakGroup.add(tanjakBand);

  const crestShape = new THREE.Shape();
  crestShape.moveTo(-0.18, 0);
  crestShape.lineTo(0.18, 0);
  crestShape.quadraticCurveTo(0.24, 0.22, 0.06, 0.34);
  crestShape.lineTo(-0.08, 0.22);
  crestShape.closePath();

  const crestGeo = new THREE.ExtrudeGeometry(crestShape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  crestGeo.center();
  const crestMesh = new THREE.Mesh(crestGeo, emeraldMat);
  crestMesh.position.set(0.04, 0.17, 0.04);
  crestMesh.rotation.y = 0.28;
  tanjakGroup.add(crestMesh);

  const tanjakPin = new THREE.Mesh(new THREE.OctahedronGeometry(0.042, 0), goldMat);
  tanjakPin.position.set(0, 0.06, 0.24);
  tanjakGroup.add(tanjakPin);

  // Articulated Arms
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.3, 0.74, 0);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.3, 0.74, 0);

  const sleeveGeo = new THREE.CapsuleGeometry(0.078, 0.32, 6, 12);
  const handGeo = new THREE.SphereGeometry(0.072, 10, 10);

  const lSleeve = new THREE.Mesh(sleeveGeo, emeraldMat);
  lSleeve.position.y = -0.18;
  const lHand = new THREE.Mesh(handGeo, skinMat);
  lHand.position.y = -0.4;
  leftArm.add(lSleeve, lHand);

  const rSleeve = new THREE.Mesh(sleeveGeo, emeraldMat);
  rSleeve.position.y = -0.18;
  const rHand = new THREE.Mesh(handGeo, skinMat);
  rHand.position.y = -0.4;
  rightArm.add(rSleeve, rHand);

  torsoPivot.add(leftArm, rightArm);

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  const setPose = (pose: HangTuahPose, elapsed: number, verticalVel = 0) => {
    // Reset smoothly
    leftLeg.rotation.set(0, 0, 0);
    rightLeg.rotation.set(0, 0, 0);
    torsoPivot.rotation.set(0, 0, 0);
    headGroup.rotation.set(0, 0, 0);

    if (pose === 'idle') {
      torsoPivot.position.y = 0.56 + Math.sin(elapsed * 2.1) * 0.015;
      leftArm.rotation.set(0.1, 0, 0.14 + Math.sin(elapsed * 1.8) * 0.04);
      rightArm.rotation.set(-0.12, 0, -0.14 - Math.sin(elapsed * 1.8) * 0.04);
      headGroup.rotation.y = Math.sin(elapsed * 0.9) * 0.12;
    } else if (pose === 'point') {
      torsoPivot.rotation.y = 0.18;
      leftArm.rotation.set(0.15, 0, 0.16);
      rightArm.rotation.set(-1.15, 0.25, -0.25 + Math.sin(elapsed * 3) * 0.06);
      headGroup.rotation.y = -0.12;
    } else if (pose === 'ride') {
      // Standing securely on the Wau deck steering forward (+X in world, character faces +X via parent)
      const lean = THREE.MathUtils.clamp(verticalVel * 0.04, -0.25, 0.25);
      torsoPivot.rotation.x = 0.14 - lean;
      leftLeg.rotation.x = -0.18;
      rightLeg.rotation.x = 0.22;
      // Both arms holding the Wau silk control cords ahead
      leftArm.rotation.set(-1.05, 0.15, 0.18);
      rightArm.rotation.set(-1.05, -0.15, -0.18);
      headGroup.rotation.x = -0.08 + lean * 0.5;
    } else if (pose === 'celebrate') {
      torsoPivot.position.y = 0.56 + Math.abs(Math.sin(elapsed * 5.2)) * 0.09;
      leftArm.rotation.set(-2.5, 0, 0.35 + Math.sin(elapsed * 7) * 0.18);
      rightArm.rotation.set(-2.5, 0, -0.35 - Math.sin(elapsed * 7) * 0.18);
      headGroup.rotation.z = Math.sin(elapsed * 4) * 0.1;
    } else if (pose === 'hit') {
      torsoPivot.rotation.x = -0.22;
      leftArm.rotation.set(-0.6, 0, 0.75);
      rightArm.rotation.set(-0.6, 0, -0.75);
      headGroup.rotation.z = Math.sin(elapsed * 22) * 0.14;
    }
  };

  return { group, setPose };
}

export interface WauBulanRig {
  group: THREE.Group;
  riderMount: THREE.Group;
  updateAnimation: (elapsed: number, vy: number, isLifting: boolean) => void;
}

export function buildWauBulanModel(
  batikTex: THREE.Texture,
  songketTex: THREE.Texture,
): WauBulanRig {
  const group = new THREE.Group();

  const fabricMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: batikTex,
    roughness: 0.48,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf4b63d,
    roughness: 0.25,
    metalness: 0.85,
  });

  const bambooMat = new THREE.MeshStandardMaterial({
    color: 0x8b5a2b,
    roughness: 0.75,
    metalness: 0.05,
  });

  const ribbonRedMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });

  const ribbonEmeraldMat = new THREE.MeshStandardMaterial({
    color: 0x059669,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });

  // 1. Upper arched wing (Traditional Wau Bulan silhouette)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.78);
  wingShape.bezierCurveTo(0.85, 0.84, 1.55, 0.45, 1.72, 0.05);
  wingShape.bezierCurveTo(1.38, -0.22, 0.68, -0.26, 0, -0.14);
  wingShape.bezierCurveTo(-0.68, -0.26, -1.38, -0.22, -1.72, 0.05);
  wingShape.bezierCurveTo(-1.55, 0.45, -0.85, 0.84, 0, 0.78);

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  wingGeo.center();
  // Normalize UVs cleanly for batik texture
  const uv = wingGeo.attributes.uv;
  const pos = wingGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (pos.getX(i) + 1.8) / 3.6, (pos.getY(i) + 1.0) / 2.0);
  }
  uv.needsUpdate = true;

  const wingMesh = new THREE.Mesh(wingGeo, fabricMat);
  wingMesh.position.set(0, 0.26, 0);
  group.add(wingMesh);

  // 2. Lower crescent moon sail (Bulan)
  const moonShape = new THREE.Shape();
  moonShape.moveTo(0, -0.15);
  moonShape.bezierCurveTo(0.95, -0.2, 1.48, -0.78, 1.32, -1.25);
  moonShape.bezierCurveTo(0.82, -0.92, 0.38, -0.86, 0, -0.95);
  moonShape.bezierCurveTo(-0.38, -0.86, -0.82, -0.92, -1.32, -1.25);
  moonShape.bezierCurveTo(-1.48, -0.78, -0.95, -0.2, 0, -0.15);

  const moonGeo = new THREE.ExtrudeGeometry(moonShape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  moonGeo.center();
  const moonUv = moonGeo.attributes.uv;
  const moonPos = moonGeo.attributes.position;
  for (let i = 0; i < moonUv.count; i++) {
    moonUv.setXY(i, (moonPos.getX(i) + 1.5) / 3.0, (moonPos.getY(i) + 0.7) / 1.4);
  }
  moonUv.needsUpdate = true;

  const moonMesh = new THREE.Mesh(moonGeo, fabricMat);
  moonMesh.position.set(0, -0.68, 0);
  group.add(moonMesh);

  // Rotate Wau horizontally into flight glider orientation (+X forward, Y up, Z wingspan)
  const wauBodyPivot = new THREE.Group();
  wauBodyPivot.rotation.order = 'YXZ';
  wauBodyPivot.rotation.x = -Math.PI / 2 + 0.24; // Tilted slightly forward like a majestic flying kite
  wauBodyPivot.rotation.z = -Math.PI / 2;
  // Move wingMesh and moonMesh inside wauBodyPivot
  group.remove(wingMesh, moonMesh);
  wauBodyPivot.add(wingMesh, moonMesh);

  // 3. Carved bamboo spine & golden finial (Jambul Wau)
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.35, 10), bambooMat);
  spine.position.set(0, -0.1, 0.04);
  wauBodyPivot.add(spine);

  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 8), goldTrimMat);
  finial.position.set(0, 1.24, 0.04);
  wauBodyPivot.add(finial);

  const starOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), goldTrimMat);
  starOrb.position.set(0, 1.46, 0.04);
  wauBodyPivot.add(starOrb);

  // Wingtip golden tassels
  [-1.72, 1.72].forEach((tx) => {
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), goldTrimMat);
    tip.position.set(tx, 0.28, 0.04);
    wauBodyPivot.add(tip);
  });

  group.add(wauBodyPivot);

  // 4. Integrated carved riding pelantar for Hang Tuah (stable platform above spine)
  const riderMount = new THREE.Group();
  riderMount.position.set(0.05, 0.26, 0);
  group.add(riderMount);

  const saddleBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.08, 0.56),
    new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.65 }),
  );
  saddleBoard.position.y = -0.04;
  const saddleCloth = new THREE.Mesh(
    new THREE.BoxGeometry(0.74, 0.03, 0.48),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: songketTex, roughness: 0.55 }),
  );
  saddleCloth.position.y = 0.01;
  riderMount.add(saddleBoard, saddleCloth);

  // Golden steering post & silk reins
  const helmPost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.48, 8), goldTrimMat);
  helmPost.position.set(0.32, 0.2, 0);
  const helmBar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 8), goldTrimMat);
  helmBar.rotation.x = Math.PI / 2;
  helmBar.position.set(0.32, 0.43, 0);
  riderMount.add(helmPost, helmBar);

  // 5. Three articulated flowing tail ribbons behind the Wau (-X)
  const tailSegments: THREE.Group[] = [];
  const tailOffsets = [
    { z: 0, mat: goldTrimMat, len: 0.45 },
    { z: -0.45, mat: ribbonRedMat, len: 0.38 },
    { z: 0.45, mat: ribbonEmeraldMat, len: 0.38 },
  ];

  tailOffsets.forEach((cfg) => {
    const chainRoot = new THREE.Group();
    chainRoot.position.set(-1.15, -0.05, cfg.z);
    let parent: THREE.Group = chainRoot;
    for (let s = 0; s < 4; s++) {
      const segPivot = new THREE.Group();
      const segMesh = new THREE.Mesh(
        new THREE.BoxGeometry(cfg.len, 0.03, 0.11 - s * 0.015),
        cfg.mat,
      );
      segMesh.position.x = -cfg.len * 0.5;
      segPivot.add(segMesh);
      if (s > 0) segPivot.position.x = -cfg.len;
      parent.add(segPivot);
      tailSegments.push(segPivot);
      parent = segPivot;
    }
    group.add(chainRoot);
  });

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
    }
  });

  const updateAnimation = (elapsed: number, vy: number, isLifting: boolean) => {
    const liftFlutter = isLifting ? 1.55 : 0.85;
    const diveBias = THREE.MathUtils.clamp(-vy * 0.03, -0.22, 0.22);

    tailSegments.forEach((seg, idx) => {
      const wave = Math.sin(elapsed * 7.5 * liftFlutter - idx * 0.75) * 0.14;
      seg.rotation.z = wave + diveBias * 0.35;
      seg.rotation.y = Math.cos(elapsed * 5.2 - idx * 0.5) * 0.08;
    });

    // Subtle wing flex during lift
    const wingFlex = 1 + (isLifting ? Math.sin(elapsed * 12) * 0.025 : 0);
    wauBodyPivot.scale.set(wingFlex, 1, 1);
  };

  return { group, riderMount, updateAnimation };
}

export function buildMalayHouseModel(timberTex: THREE.Texture): THREE.Group {
  const house = new THREE.Group();

  const timberMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: timberTex,
    roughness: 0.78,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x7c341d,
    roughness: 0.85,
  });
  const trimGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd99b26,
    roughness: 0.35,
    metalness: 0.6,
  });
  const warmWindowMat = new THREE.MeshStandardMaterial({
    color: 0xffd27d,
    emissive: 0xffa73b,
    emissiveIntensity: 0.65,
    roughness: 0.4,
  });

  // Stilts (Tiang seri) grounded at y=0
  const stiltGeo = new THREE.CylinderGeometry(0.11, 0.12, 1.3, 8);
  const corners = [
    [-1.6, -1.2],
    [1.6, -1.2],
    [-1.6, 1.2],
    [1.6, 1.2],
    [0, -1.2],
    [0, 1.2],
  ];
  corners.forEach(([cx, cz]) => {
    const stilt = new THREE.Mesh(stiltGeo, timberMat);
    stilt.position.set(cx, 0.65, cz);
    house.add(stilt);
  });

  // Main elevated house body
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.7, 2.7), timberMat);
  body.position.y = 2.1;
  house.add(body);

  // Serambi front porch & steps
  const porch = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 1.1), timberMat);
  porch.position.set(0, 1.3, 1.85);
  house.add(porch);
  for (let s = 0; s < 4; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 0.28), timberMat);
    step.position.set(0, 0.25 + s * 0.28, 2.55 - s * 0.2);
    house.add(step);
  }

  // Steep traditional Bumbung Panjang pitched roof
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-2.25, 0);
  roofShape.lineTo(0, 1.65);
  roofShape.lineTo(2.25, 0);
  roofShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: 3.3,
    bevelEnabled: false,
  });
  roofGeo.center();
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 3.72;
  house.add(roof);

  // Gold carved Tebar Layar ridge ornament
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 3.4), trimGoldMat);
  ridge.position.y = 4.55;
  house.add(ridge);

  // Warm glowing windows
  [-1.0, 1.0].forEach((wx) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.72, 0.08), warmWindowMat);
    win.position.set(wx, 2.15, 1.36);
    house.add(win);
  });

  house.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return house;
}

export function buildCoconutPalm(): THREE.Group {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x734b2b, roughness: 0.88 });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x2f8545,
    roughness: 0.62,
    side: THREE.DoubleSide,
  });

  // Curved segmented trunk
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.14 - i * 0.012, 0.17 - i * 0.012, 0.85, 8), trunkMat);
    seg.position.set(Math.sin(i * 0.18) * 0.28, 0.4 + i * 0.78, 0);
    seg.rotation.z = -i * 0.04;
    palm.add(seg);
  }

  // Fronds crown
  const crown = new THREE.Group();
  crown.position.set(0.24, 4.9, 0);
  for (let f = 0; f < 7; f++) {
    const frondPivot = new THREE.Group();
    frondPivot.rotation.y = (f * Math.PI * 2) / 7;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.32, 2.2, 5), leafMat);
    frond.rotation.z = -Math.PI * 0.36;
    frond.position.set(0.95, -0.15, 0);
    frond.scale.set(0.35, 1, 1.2);
    frondPivot.add(frond);
    crown.add(frondPivot);
  }
  palm.add(crown);
  return palm;
}

export function buildPelantarWau(
  timberTex: THREE.Texture,
  songketTex: THREE.Texture,
): THREE.Group {
  const pelantar = new THREE.Group();
  const timberMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: timberTex, roughness: 0.75 });
  const songketMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: songketTex, roughness: 0.52 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf4b63d, roughness: 0.3, metalness: 0.8 });
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xffe082,
    emissive: 0xffa000,
    emissiveIntensity: 1.5,
  });

  // Stepped wooden platform
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.6, 0.45, 8), timberMat);
  base.position.y = 0.225;
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.9, 0.35, 8), timberMat);
  deck.position.y = 0.6;
  const songketRunner = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 4.8), songketMat);
  songketRunner.position.y = 0.79;
  pelantar.add(base, deck, songketRunner);

  // 4 carved corner pillars with pelita brass lamps & songket banners
  const corners = [
    [-2.0, -2.0],
    [2.0, -2.0],
    [-2.0, 2.0],
    [2.0, 2.0],
  ];
  corners.forEach(([x, z], idx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.5, 10), timberMat);
    post.position.set(x, 1.75, z);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), goldMat);
    finial.position.set(x, 3.05, z);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), flameMat);
    lamp.position.set(x * 0.9, 2.35, z * 0.9);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.1, 0.04), songketMat);
    banner.position.set(x, 2.15, z + (idx % 2 === 0 ? 0.16 : -0.16));
    pelantar.add(post, finial, lamp, banner);
  });

  return pelantar;
}

export function buildGerbangBahasa(
  timberTex: THREE.Texture,
  isGrand = false,
): THREE.Group {
  const gate = new THREE.Group();
  const scale = isGrand ? 1.45 : 1.0;

  const timberMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: timberTex,
    roughness: 0.72,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: isGrand ? 0xffcb47 : 0xf2b138,
    emissive: isGrand ? 0x6b4500 : 0x3b2600,
    emissiveIntensity: 0.55,
    roughness: 0.25,
    metalness: 0.85,
  });
  const scrollMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.95,
    roughness: 0.35,
  });

  const pillarH = 12.2;
  [-2.6, 2.6].forEach((pz) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, pillarH, 12), timberMat);
    pillar.position.set(0, pillarH * 0.5, pz);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.08, 10, 18), goldMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, pillarH * 0.72, pz);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 8), goldMat);
    cap.position.set(0, pillarH + 0.45, pz);
    gate.add(pillar, ring, cap);
  });

  // Carved arch crown spanning Z
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.22, 12, 28, Math.PI),
    goldMat,
  );
  arch.rotation.y = Math.PI / 2;
  arch.position.set(0, pillarH - 0.6, 0);
  gate.add(arch);

  // Floating magical naskhah scroll at center
  const scrollGroup = new THREE.Group();
  scrollGroup.name = 'floatingScroll';
  scrollGroup.position.set(0, 6.4, 0);
  const parchment = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.15, 14), scrollMat);
  parchment.rotation.x = Math.PI / 2;
  const rodTop = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.35, 10), goldMat);
  rodTop.rotation.x = Math.PI / 2;
  rodTop.position.y = 0.24;
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.045, 8, 24),
    new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    }),
  );
  halo.rotation.y = Math.PI / 2;
  scrollGroup.add(parchment, rodTop, halo);
  gate.add(scrollGroup);

  gate.scale.setScalar(scale);
  return gate;
}

export function buildObstacleMesh(
  spec: ObstacleSpec,
  timberTex: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.worldX, 0, 0);

  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    emissive: 0x1e293b,
    emissiveIntensity: 0.22,
    roughness: 0.9,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x1e6b3a,
    roughness: 0.68,
  });
  const branchMat = new THREE.MeshStandardMaterial({
    color: 0x5c381c,
    map: timberTex,
    roughness: 0.84,
  });
  const windMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0369a1,
    emissiveIntensity: 0.45,
    roughness: 0.35,
    transparent: true,
    opacity: 0.88,
  });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 0.9,
    roughness: 0.35,
  });

  const makeHazardCluster = (centerY: number, height: number) => {
    const cluster = new THREE.Group();
    cluster.position.y = centerY;

    if (spec.kind === 'cloud') {
      const puffs = Math.max(2, Math.round(height / 1.4));
      for (let i = 0; i < puffs; i++) {
        const yOff = (i - (puffs - 1) / 2) * (height / puffs);
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 1), cloudMat);
        puff.position.set((i % 2 === 0 ? -0.18 : 0.18), yOff, 0);
        puff.scale.set(0.85, 0.72, 1.05);
        cluster.add(puff);
      }
    } else if (spec.kind === 'leaves' || spec.kind === 'branch') {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.3, Math.max(1.2, height), 8),
        branchMat,
      );
      cluster.add(trunk);
      const count = Math.max(3, Math.round(height / 1.1));
      for (let i = 0; i < count; i++) {
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68, 1), leafMat);
        bush.position.set(
          (i % 2 === 0 ? 0.25 : -0.25),
          (i - (count - 1) / 2) * (height / count),
          (i % 3 - 1) * 0.25,
        );
        cluster.add(bush);
      }
    } else if (spec.kind === 'wind_swirl') {
      const rings = Math.max(2, Math.round(height / 1.2));
      for (let i = 0; i < rings; i++) {
        const torus = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.15, 8, 18), windMat);
        torus.rotation.x = Math.PI / 2 + 0.25;
        torus.position.y = (i - (rings - 1) / 2) * (height / rings);
        cluster.add(torus);
      }
    } else if (spec.kind === 'lantern') {
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.42, Math.min(2.2, height * 0.85), 8),
        lanternMat,
      );
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.45, 8), branchMat);
      cap.position.y = Math.min(2.2, height * 0.85) * 0.5 + 0.2;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, height, 6), branchMat);
      cluster.add(rod, core, cap);
    } else {
      // timber_arch
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1.1, height, 1.35), branchMat);
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(1.22, 0.26, 1.48),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.5 }),
      );
      trim.position.y = height * 0.45 * (centerY > 6 ? -1 : 1);
      cluster.add(beam, trim);
    }

    group.add(cluster);
  };

  const gapTop = spec.gapCenterY + spec.gapHalfHeight;
  const gapBottom = spec.gapCenterY - spec.gapHalfHeight;

  if (spec.layout === 'gate_gap' || spec.layout === 'top_hang') {
    const topH = Math.max(1.4, 13.5 - gapTop);
    makeHazardCluster(gapTop + topH * 0.5, topH);
  }
  if (spec.layout === 'gate_gap' || spec.layout === 'bottom_rise') {
    const botH = Math.max(1.4, gapBottom);
    makeHazardCluster(botH * 0.5, botH);
  }

  // Subtle golden guiding ring in the safe corridor center (helps kids read passable openings)
  const guideRing = new THREE.Mesh(
    new THREE.TorusGeometry(Math.max(0.7, spec.gapHalfHeight * 0.42), 0.04, 8, 20),
    new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.48,
    }),
  );
  guideRing.name = 'guideRing';
  guideRing.rotation.y = Math.PI / 2;
  guideRing.position.set(0, spec.gapCenterY, 0);
  group.add(guideRing);

  return group;
}

export function buildBalaiOlahHikayatGroup(
  timberTex: THREE.Texture,
  songketTex: THREE.Texture,
  mengkuangTex: THREE.Texture,
): {
  group: THREE.Group;
  scrollOrbs: THREE.Mesh[];
  pelitaFlames: THREE.Mesh[];
  curtains: THREE.Mesh[];
  kitabCover: THREE.Mesh;
} {
  const balai = new THREE.Group();

  const timberMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: timberTex, roughness: 0.74 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: mengkuangTex, roughness: 0.85 });
  const songketMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: songketTex, roughness: 0.52 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf4b63d, roughness: 0.25, metalness: 0.86 });
  const bookPageMat = new THREE.MeshStandardMaterial({ color: 0xfaf2dd, roughness: 0.72 });
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xffe082,
    emissive: 0xff9800,
    emissiveIntensity: 1.6,
  });

  // 1. Elevated timber hall floor + mengkuang mat
  const floorDeck = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 11), timberMat);
  floorDeck.position.y = -0.25;
  floorDeck.receiveShadow = true;
  const mat = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.04, 6.8), floorMat);
  mat.position.y = 0.025; // +0.025 prevents z-fighting
  mat.receiveShadow = true;
  balai.add(floorDeck, mat);

  // 2. Carved wooden pillars framing open scenic views
  const pillarPositions = [
    [-6.2, -4.8],
    [0, -4.8],
    [6.2, -4.8],
    [-6.2, 4.8],
    [6.2, 4.8],
  ];
  pillarPositions.forEach(([px, pz]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 6.2, 12), timberMat);
    p.position.set(px, 3.1, pz);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.05, 8, 16), goldMat);
    band.rotation.x = Math.PI / 2;
    band.position.set(px, 5.2, pz);
    balai.add(p, band);
  });

  // Back carved wall with open window lattice looking out over river & paddy fields
  const backWallLeft = new THREE.Mesh(new THREE.BoxGeometry(3.4, 5.6, 0.3), timberMat);
  backWallLeft.position.set(-4.6, 2.8, -4.9);
  const backWallRight = new THREE.Mesh(new THREE.BoxGeometry(3.4, 5.6, 0.3), timberMat);
  backWallRight.position.set(4.6, 2.8, -4.9);
  const backWallLow = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.35, 0.3), timberMat);
  backWallLow.position.set(0, 0.68, -4.9);
  balai.add(backWallLeft, backWallRight, backWallLow);

  // Bookcases with antique naskhah scrolls
  [-4.4, 4.4].forEach((bx) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.1, 3.4, 0.7), timberMat);
    shelf.position.set(bx, 1.7, -4.35);
    balai.add(shelf);
    for (let r = 0; r < 3; r++) {
      for (let b = 0; b < 4; b++) {
        const tome = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.52, 0.45),
          b % 2 === 0 ? songketMat : goldMat,
        );
        tome.position.set(bx - 0.65 + b * 0.43, 0.8 + r * 0.95, -4.3);
        balai.add(tome);
      }
    }
  });

  // Swaying songket curtains flanking the window
  const curtains: THREE.Mesh[] = [];
  [-2.6, 2.6].forEach((cx) => {
    const curtain = new THREE.Mesh(new THREE.BoxGeometry(0.95, 4.2, 0.12), songketMat);
    curtain.position.set(cx, 3.4, -4.65);
    curtains.push(curtain);
    balai.add(curtain);
  });

  // Pitched traditional roof beams overhead
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(10.2, 3.4, 4),
    new THREE.MeshStandardMaterial({ color: 0x6b2f1b, roughness: 0.85 }),
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 7.6;
  balai.add(roof);

  // 3. Central writing desk + Kitab Hikayat Baharu
  const desk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.95, 1.9), timberMat);
  desk.position.set(0, 0.5, -0.4);
  desk.castShadow = true;
  desk.receiveShadow = true;
  balai.add(desk);

  const kitabCover = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.14, 1.15), goldMat);
  kitabCover.position.set(0, 1.05, -0.35);
  const leftPage = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 1.02), bookPageMat);
  leftPage.position.set(-0.38, 1.14, -0.35);
  leftPage.rotation.z = 0.05;
  const rightPage = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 1.02), bookPageMat);
  rightPage.position.set(0.38, 1.14, -0.35);
  rightPage.rotation.z = -0.05;
  balai.add(kitabCover, leftPage, rightPage);

  // 4. Brass pelita lamps
  const pelitaFlames: THREE.Mesh[] = [];
  [
    [-1.4, 1.05, -0.9],
    [1.4, 1.05, -0.9],
    [-3.6, 0.55, 2.2],
    [3.6, 0.55, 2.2],
  ].forEach(([lx, ly, lz]) => {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.45, 10), goldMat);
    stand.position.set(lx, ly, lz);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), flameMat);
    flame.position.set(lx, ly + 0.28, lz);
    pelitaFlames.push(flame);
    balai.add(stand, flame);
  });

  // 5. Five orbiting golden phrase scroll orbs around the Kitab
  const scrollOrbs: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const orb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.45, 10),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.25,
        roughness: 0.25,
      }),
    );
    orb.rotation.z = Math.PI / 2;
    scrollOrbs.push(orb);
    balai.add(orb);
  }

  return { group: balai, scrollOrbs, pelitaFlames, curtains, kitabCover };
}
