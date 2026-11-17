import * as THREE from 'three';
import { NusantaraTextureSet } from './textures';

export type HangTuahAnimState =
  | 'idle'
  | 'walk'
  | 'jog'
  | 'interact'
  | 'pickup'
  | 'openChest'
  | 'read'
  | 'celebrate';

export interface HangTuahRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  leftForearm: THREE.Group;
  rightArm: THREE.Group;
  rightForearm: THREE.Group;
  leftLeg: THREE.Group;
  leftShin: THREE.Group;
  rightLeg: THREE.Group;
  rightShin: THREE.Group;
  update: (
    dt: number,
    elapsed: number,
    anim: HangTuahAnimState,
    moveSpeed: number
  ) => void;
}

export function createHangTuah(textures: NusantaraTextureSet): HangTuahRig {
  const root = new THREE.Group();
  root.name = 'HangTuah';

  // Ground contact shadow disc (never moves vertically during hop)
  const shadowGeo = new THREE.CircleGeometry(0.48, 24);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadowTex,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.018;
  root.add(contactShadow);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // Materials (varied roughness & metalness for crisp visual read)
  const emeraldClothMat = new THREE.MeshStandardMaterial({
    color: 0x0d6b4e,
    roughness: 0.72,
    metalness: 0.05,
  });
  const songketMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.songketColor,
    roughness: 0.55,
    metalness: 0.25,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xe6be4c,
    roughness: 0.28,
    metalness: 0.85,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd99b6c,
    roughness: 0.62,
    metalness: 0.02,
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x3b2212,
    roughness: 0.78,
    metalness: 0.05,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x1e1612,
    roughness: 0.85,
    metalness: 0.0,
  });
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1b120c });
  const lipMat = new THREE.MeshStandardMaterial({ color: 0x9b4d3c, roughness: 0.6 });

  // --- LEGS (origin at hip y = 0.72) ---
  function buildLeg(isLeft: boolean): { hip: THREE.Group; shin: THREE.Group } {
    const hip = new THREE.Group();
    hip.position.set(isLeft ? -0.14 : 0.14, 0.72, 0);

    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.078, 0.34, 12),
      emeraldClothMat
    );
    thigh.position.y = -0.17;
    thigh.castShadow = true;
    hip.add(thigh);

    const shin = new THREE.Group();
    shin.position.y = -0.34;
    hip.add(shin);

    const calf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.076, 0.064, 0.31, 12),
      emeraldClothMat
    );
    calf.position.y = -0.155;
    calf.castShadow = true;
    shin.add(calf);

    // Traditional Capal / Kasut
    const shoeGroup = new THREE.Group();
    shoeGroup.position.set(0, -0.34, 0.04);
    const shoeBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.075, 0.23),
      darkWoodMat
    );
    shoeBody.castShadow = true;
    shoeGroup.add(shoeBody);

    const shoeTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.065, 0.1, 8),
      goldTrimMat
    );
    shoeTip.rotation.x = Math.PI / 2;
    shoeTip.position.set(0, 0.01, 0.14);
    shoeGroup.add(shoeTip);
    shin.add(shoeGroup);

    return { hip, shin };
  }

  const leftLegRig = buildLeg(true);
  const rightLegRig = buildLeg(false);
  bodyGroup.add(leftLegRig.hip);
  bodyGroup.add(rightLegRig.hip);

  // --- PELVIS & TORSO ---
  const pelvis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.21, 0.16, 14),
    emeraldClothMat
  );
  pelvis.position.y = 0.76;
  pelvis.castShadow = true;
  bodyGroup.add(pelvis);

  // Samping Songket wrap around waist & upper thighs
  const samping = new THREE.Mesh(
    new THREE.CylinderGeometry(0.245, 0.275, 0.38, 16),
    songketMat
  );
  samping.position.y = 0.72;
  samping.castShadow = true;
  bodyGroup.add(samping);

  // Golden waist belt (Bengkung) + ornamental Keris hilt
  const bengkung = new THREE.Mesh(
    new THREE.CylinderGeometry(0.252, 0.252, 0.075, 16),
    goldTrimMat
  );
  bengkung.position.y = 0.88;
  bodyGroup.add(bengkung);

  const kerisGroup = new THREE.Group();
  kerisGroup.position.set(0.22, 0.87, 0.12);
  kerisGroup.rotation.set(0.2, 0.3, -0.55);
  const kerisSheath = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.28, 0.03),
    darkWoodMat
  );
  const kerisHilt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.02, 0.09, 8),
    goldTrimMat
  );
  kerisHilt.position.y = 0.17;
  kerisGroup.add(kerisSheath, kerisHilt);
  bodyGroup.add(kerisGroup);

  const torso = new THREE.Group();
  torso.position.y = 0.9;
  bodyGroup.add(torso);

  // Baju Melayu Tunic
  const chest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.21, 0.48, 14),
    emeraldClothMat
  );
  chest.position.y = 0.24;
  chest.castShadow = true;
  torso.add(chest);

  // Cekak Musang Collar & Gold Buttons
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.125, 0.08, 12),
    emeraldClothMat
  );
  collar.position.y = 0.5;
  torso.add(collar);

  for (let b = 0; b < 3; b++) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), goldTrimMat);
    btn.position.set(0, 0.44 - b * 0.07, 0.22);
    torso.add(btn);
  }

  // --- ARMS ---
  function buildArm(isLeft: boolean): { shoulder: THREE.Group; forearm: THREE.Group } {
    const shoulder = new THREE.Group();
    shoulder.position.set(isLeft ? -0.27 : 0.27, 0.44, 0);

    const shoulderCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 10, 10),
      emeraldClothMat
    );
    shoulder.add(shoulderCap);

    const upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.062, 0.26, 10),
      emeraldClothMat
    );
    upperArm.position.y = -0.14;
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const forearm = new THREE.Group();
    forearm.position.y = -0.27;
    shoulder.add(forearm);

    const lowerSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.055, 0.22, 10),
      emeraldClothMat
    );
    lowerSleeve.position.y = -0.11;
    lowerSleeve.castShadow = true;
    forearm.add(lowerSleeve);

    const cuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.059, 0.059, 0.03, 10),
      goldTrimMat
    );
    cuff.position.y = -0.21;
    forearm.add(cuff);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 10), skinMat);
    hand.position.y = -0.26;
    forearm.add(hand);

    return { shoulder, forearm };
  }

  const leftArmRig = buildArm(true);
  const rightArmRig = buildArm(false);
  torso.add(leftArmRig.shoulder);
  torso.add(rightArmRig.shoulder);

  // --- HEAD & TANJAK ---
  const head = new THREE.Group();
  head.position.y = 0.56;
  torso.add(head);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.195, 18, 16), skinMat);
  cranium.position.y = 0.16;
  cranium.castShadow = true;
  head.add(cranium);

  // Hair cap at back
  const hairBack = new THREE.Mesh(
    new THREE.SphereGeometry(0.198, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat
  );
  hairBack.position.set(0, 0.17, -0.02);
  hairBack.rotation.x = -0.35;
  head.add(hairBack);

  // Expressive Eyes + Catchlights + Brows + Warm Smile
  [-1, 1].forEach((side) => {
    const eyeBg = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), eyeWhiteMat);
    eyeBg.scale.set(1, 1.15, 0.6);
    eyeBg.position.set(side * 0.068, 0.18, 0.172);
    head.add(eyeBg);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.019, 8, 8), pupilMat);
    pupil.position.set(side * 0.068, 0.18, 0.188);
    head.add(pupil);

    const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), eyeWhiteMat);
    catchlight.position.set(side * 0.075, 0.19, 0.198);
    head.add(catchlight);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.014, 0.018), hairMat);
    brow.position.set(side * 0.068, 0.23, 0.18);
    brow.rotation.z = side * -0.08;
    head.add(brow);
  });

  // Nose & friendly smile
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), skinMat);
  nose.position.set(0, 0.145, 0.198);
  head.add(nose);

  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.042, 0.01, 6, 12, Math.PI),
    lipMat
  );
  smile.position.set(0, 0.105, 0.178);
  smile.rotation.x = Math.PI;
  head.add(smile);

  // Tanjak Tradisional (Green Songket + Gold Folded Peak)
  const tanjakGroup = new THREE.Group();
  tanjakGroup.position.set(0, 0.27, 0);
  head.add(tanjakGroup);

  const tanjakBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.205, 0.21, 0.11, 16),
    songketMat
  );
  tanjakBand.castShadow = true;
  tanjakGroup.add(tanjakBand);

  const tanjakGoldRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.208, 0.014, 8, 24),
    goldTrimMat
  );
  tanjakGoldRim.rotation.x = Math.PI / 2;
  tanjakGoldRim.position.y = -0.04;
  tanjakGroup.add(tanjakGoldRim);

  // Sculpted Tanjak wing / Dendam Tak Sudah crest
  const wingGeo = new THREE.ConeGeometry(0.14, 0.24, 4);
  const wingMesh = new THREE.Mesh(wingGeo, songketMat);
  wingMesh.position.set(0.03, 0.12, 0.02);
  wingMesh.rotation.set(0.18, 0.4, -0.25);
  wingMesh.scale.set(1.25, 1.0, 0.45);
  wingMesh.castShadow = true;
  tanjakGroup.add(wingMesh);

  const crestPin = new THREE.Mesh(new THREE.OctahedronGeometry(0.032, 0), goldTrimMat);
  crestPin.position.set(0, 0.05, 0.21);
  tanjakGroup.add(crestPin);

  let walkPhase = 0;

  function update(
    dt: number,
    elapsed: number,
    anim: HangTuahAnimState,
    moveSpeed: number
  ) {
    const damp = 1 - Math.exp(-12 * dt);

    let targetBodyY = 0;
    let targetTorsoX = 0;
    let targetHeadX = 0;
    let targetHeadY = 0;

    let lLegX = 0;
    let rLegX = 0;
    let lShinX = 0;
    let rShinX = 0;

    let lArmX = 0;
    let lArmZ = 0.14;
    let lForeX = -0.15;

    let rArmX = 0;
    let rArmZ = -0.14;
    let rForeX = -0.15;

    if (anim === 'walk' || anim === 'jog') {
      // Distance-synced gait so feet never skate
      const strideRate = anim === 'jog' ? 3.2 : 2.5;
      walkPhase += dt * Math.max(2.0, moveSpeed * strideRate);
      const s = Math.sin(walkPhase);
      const c = Math.cos(walkPhase);
      const amp = anim === 'jog' ? 0.72 : 0.55;

      lLegX = s * amp;
      rLegX = -s * amp;
      lShinX = Math.max(0, -c * 0.55);
      rShinX = Math.max(0, c * 0.55);

      lArmX = -s * amp * 0.8;
      rArmX = s * amp * 0.8;
      lForeX = -0.35;
      rForeX = -0.35;

      targetBodyY = Math.abs(c) * 0.055;
      targetTorsoX = anim === 'jog' ? 0.14 : 0.07;
    } else if (anim === 'interact') {
      // Point / examine object ahead
      rArmX = -1.15;
      rArmZ = -0.05;
      rForeX = -0.2;
      lArmX = 0.15;
      targetTorsoX = 0.12;
      targetHeadX = 0.1;
    } else if (anim === 'pickup') {
      // Kneel slightly & reach out
      targetBodyY = -0.18;
      targetTorsoX = 0.38;
      lLegX = -0.5;
      lShinX = 0.9;
      rLegX = -0.3;
      rShinX = 0.7;
      rArmX = -1.35;
      lArmX = -1.1;
      rForeX = -0.35;
      lForeX = -0.35;
    } else if (anim === 'openChest') {
      targetBodyY = -0.08;
      targetTorsoX = 0.25;
      lArmX = -1.3 + Math.sin(elapsed * 5) * 0.15;
      rArmX = -1.3 + Math.sin(elapsed * 5) * 0.15;
      lArmZ = 0.25;
      rArmZ = -0.25;
      lForeX = -0.45;
      rForeX = -0.45;
    } else if (anim === 'read') {
      lArmX = -0.85;
      rArmX = -0.85;
      lArmZ = -0.22;
      rArmZ = 0.22;
      lForeX = -0.75;
      rForeX = -0.75;
      targetHeadX = 0.22 + Math.sin(elapsed * 1.6) * 0.04;
    } else if (anim === 'celebrate') {
      const hop = Math.abs(Math.sin(elapsed * 6.5));
      targetBodyY = hop * 0.28;
      lArmX = -2.45 + Math.sin(elapsed * 8) * 0.25;
      rArmX = -2.45 - Math.sin(elapsed * 8) * 0.25;
      lArmZ = 0.45;
      rArmZ = -0.45;
      lForeX = -0.3;
      rForeX = -0.3;
      lLegX = -hop * 0.25;
      rLegX = -hop * 0.25;
      targetHeadX = -0.12;
    } else {
      // Idle breathing & friendly glance
      targetBodyY = Math.sin(elapsed * 2.2) * 0.015;
      lArmX = Math.sin(elapsed * 1.8) * 0.04;
      rArmX = -Math.sin(elapsed * 1.8) * 0.04;
      targetHeadY = Math.sin(elapsed * 0.9) * 0.14;
    }

    bodyGroup.position.y = THREE.MathUtils.lerp(bodyGroup.position.y, targetBodyY, damp);
    torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, targetTorsoX, damp);
    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetHeadX, damp);
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetHeadY, damp);

    leftLegRig.hip.rotation.x = THREE.MathUtils.lerp(leftLegRig.hip.rotation.x, lLegX, damp);
    rightLegRig.hip.rotation.x = THREE.MathUtils.lerp(rightLegRig.hip.rotation.x, rLegX, damp);
    leftLegRig.shin.rotation.x = THREE.MathUtils.lerp(leftLegRig.shin.rotation.x, lShinX, damp);
    rightLegRig.shin.rotation.x = THREE.MathUtils.lerp(rightLegRig.shin.rotation.x, rShinX, damp);

    leftArmRig.shoulder.rotation.x = THREE.MathUtils.lerp(leftArmRig.shoulder.rotation.x, lArmX, damp);
    leftArmRig.shoulder.rotation.z = THREE.MathUtils.lerp(leftArmRig.shoulder.rotation.z, lArmZ, damp);
    leftArmRig.forearm.rotation.x = THREE.MathUtils.lerp(leftArmRig.forearm.rotation.x, lForeX, damp);

    rightArmRig.shoulder.rotation.x = THREE.MathUtils.lerp(rightArmRig.shoulder.rotation.x, rArmX, damp);
    rightArmRig.shoulder.rotation.z = THREE.MathUtils.lerp(rightArmRig.shoulder.rotation.z, rArmZ, damp);
    rightArmRig.forearm.rotation.x = THREE.MathUtils.lerp(rightArmRig.forearm.rotation.x, rForeX, damp);

    // Contact shadow softens slightly when Hang Tuah jumps
    const shadowScale = Math.max(0.65, 1 - bodyGroup.position.y * 0.9);
    contactShadow.scale.set(shadowScale, shadowScale, 1);
  }

  return {
    root,
    bodyGroup,
    torso,
    head,
    leftArm: leftArmRig.shoulder,
    leftForearm: leftArmRig.forearm,
    rightArm: rightArmRig.shoulder,
    rightForearm: rightArmRig.forearm,
    leftLeg: leftLegRig.hip,
    leftShin: leftLegRig.shin,
    rightLeg: rightLegRig.hip,
    rightShin: rightLegRig.shin,
    update,
  };
}
