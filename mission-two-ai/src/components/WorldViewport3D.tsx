import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CHECKPOINTS,
  DIFFICULTY_CONFIGS,
  FINAL_GATE_WORLD_X,
  FLIGHT_ZONES,
  WAU_START_Y,
} from '../game/data';
import {
  checkWauObstacleCollision,
  createInitialWauState,
  generateObstaclesForRun,
  generateTutorialObstacles,
  getZoneIndexForX,
  stepWauPhysics,
  type WauPhysicsState,
} from '../game/physics';
import type {
  DifficultyMode,
  GamePhase,
  GraphicsQuality,
  ObstacleSpec,
} from '../game/types';
import {
  buildBalaiOlahHikayatGroup,
  buildCoconutPalm,
  buildGerbangBahasa,
  buildHangTuahModel,
  buildMalayHouseModel,
  buildObstacleMesh,
  buildPelantarWau,
  buildWauBulanModel,
} from '../three/models';
import {
  createMengkuangMatTexture,
  createSoftShadowTexture,
  createSongketTexture,
  createTimberPlankTexture,
  createWauBatikTexture,
} from '../three/textures';

export interface FlightHudSnapshot {
  worldX: number;
  zoneIndex: number;
  progressPct: number;
  hearts: number;
  score: number;
  invulnerable: boolean;
}

interface WorldViewport3DProps {
  phase: GamePhase;
  mode: DifficultyMode;
  quality: GraphicsQuality;
  reducedMotion: boolean;
  runNonce: number;
  hearts: number;
  completedCheckpoints: number[];
  isLiftingRef: React.MutableRefObject<boolean>;
  onHudTick: (snapshot: FlightHudSnapshot) => void;
  onObstaclePassed: (points: number) => void;
  onCollisionHit: () => void;
  onCheckpointReached: (checkpointIndex: number) => void;
  onTutorialComplete: () => void;
  onFinalGateReached: () => void;
  onWebGLUnsupported: () => void;
}

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _colorA = new THREE.Color();
const _colorB = new THREE.Color();
const _dummyObj = new THREE.Object3D();

export const WorldViewport3D: React.FC<WorldViewport3DProps> = ({
  phase,
  mode,
  quality,
  reducedMotion,
  runNonce,
  hearts,
  completedCheckpoints,
  isLiftingRef,
  onHudTick,
  onObstaclePassed,
  onCollisionHit,
  onCheckpointReached,
  onTutorialComplete,
  onFinalGateReached,
  onWebGLUnsupported,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keep latest props in refs so WebGLRenderer mounts exactly once
  const propsRef = useRef({
    phase,
    mode,
    quality,
    reducedMotion,
    hearts,
    completedCheckpoints,
    onHudTick,
    onObstaclePassed,
    onCollisionHit,
    onCheckpointReached,
    onTutorialComplete,
    onFinalGateReached,
    onWebGLUnsupported,
  });
  propsRef.current = {
    phase,
    mode,
    quality,
    reducedMotion,
    hearts,
    completedCheckpoints,
    onHudTick,
    onObstaclePassed,
    onCollisionHit,
    onCheckpointReached,
    onTutorialComplete,
    onFinalGateReached,
    onWebGLUnsupported,
  };

  // Simulation mutable state ref
  const simRef = useRef<{
    wau: WauPhysicsState;
    obstacles: ObstacleSpec[];
    obstacleMeshes: THREE.Group[];
    triggeredCheckpoints: Set<number>;
    finalGateTriggered: boolean;
    tutorialDone: boolean;
    score: number;
    hitFlashTimer: number;
    cameraShake: number;
    lastHudSentAt: number;
  }>({
    wau: createInitialWauState(),
    obstacles: [],
    obstacleMeshes: [],
    triggeredCheckpoints: new Set<number>(),
    finalGateTriggered: false,
    tutorialDone: false,
    score: 0,
    hitFlashTimer: 0,
    cameraShake: 0,
    lastHudSentAt: 0,
  });

  const rebuildObstaclesRef = useRef<(() => void) | null>(null);

  // Rebuild obstacles whenever runNonce or mode/phase transitions into tutorial/countdown/playing
  useEffect(() => {
    if (
      phase === 'tutorial' ||
      phase === 'countdown'
    ) {
      rebuildObstaclesRef.current?.();
    }
  }, [runNonce, mode, phase]);

  useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    // 1. Software WebGL detection
    let isSoftwareGl = false;
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      if (!gl) {
        propsRef.current.onWebGLUnsupported();
        return;
      }
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) || '');
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      propsRef.current.onWebGLUnsupported();
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: isSoftwareGl,
      });
    } catch {
      propsRef.current.onWebGLUnsupported();
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(mount.clientWidth || 1280, mount.clientHeight || 720);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      propsRef.current.onWebGLUnsupported();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(FLIGHT_ZONES[0].fogColor);
    scene.fog = new THREE.FogExp2(FLIGHT_ZONES[0].fogColor, 0.0068);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      46,
      (mount.clientWidth || 1280) / (mount.clientHeight || 720),
      0.2,
      320,
    );

    // 2. Warm/Cool 3-point outdoor lighting rig
    const hemiLight = new THREE.HemisphereLight(0x8ecae6, 0x6c4a26, 0.85);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffd28a, 1.85);
    sunLight.position.set(18, 28, 22);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 90;
    const d = 24;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const rimLight = new THREE.DirectionalLight(0xfff1c9, 0.55);
    rimLight.position.set(-15, 14, -20);
    scene.add(rimLight);

    // 3. Procedural Textures
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const batikTex = createWauBatikTexture(maxAniso);
    const songketTex = createSongketTexture(maxAniso);
    const timberTex = createTimberPlankTexture(maxAniso);
    const mengkuangTex = createMengkuangMatTexture(maxAniso);
    const shadowTex = createSoftShadowTexture();

    // 4. World Terrain & Scenery along X = -25..400
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Meadow / Paddy Ground Strip
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x5c9640,
      roughness: 0.92,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(460, 140), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(185, 0, -24);
    ground.receiveShadow = true;
    worldGroup.add(ground);

    // Flowing River strip running gently behind the garden & villages
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x1e88b8,
      roughness: 0.16,
      metalness: 0.25,
    });
    const river = new THREE.Mesh(new THREE.PlaneGeometry(460, 14), riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(185, 0.03, -15);
    worldGroup.add(river);

    // Sky Dome Gradient (soft sky blue to golden-hour horizon)
    const skyUniforms = {
      topColor: { value: new THREE.Color(FLIGHT_ZONES[0].skyTop) },
      bottomColor: { value: new THREE.Color(FLIGHT_ZONES[0].skyBottom) },
    };
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(250, 24, 14),
      new THREE.ShaderMaterial({
        uniforms: skyUniforms,
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: `
          varying vec3 vWorldPos;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          varying vec3 vWorldPos;
          void main() {
            float h = clamp(normalize(vWorldPos).y * 1.8 + 0.12, 0.0, 1.0);
            gl_FragColor = vec4(mix(bottomColor, topColor, pow(h, 0.75)), 1.0);
          }
        `,
      }),
    );
    scene.add(skyDome);

    // Traditional wooden bridge with railings across river & slow sampan boat
    const bridge = new THREE.Group();
    const bridgeDeck = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.35, 15.5),
      new THREE.MeshStandardMaterial({ color: 0xffffff, map: timberTex, roughness: 0.78 }),
    );
    bridge.add(bridgeDeck);
    [-1.9, 1.9].forEach((bx) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 15.5),
        new THREE.MeshStandardMaterial({ color: 0x5c3419, roughness: 0.78 }),
      );
      rail.position.set(bx, 0.85, 0);
      bridge.add(rail);
      for (let pz = -6.5; pz <= 6.5; pz += 3.25) {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.95, 0.18),
          new THREE.MeshStandardMaterial({ color: 0x4b2a14, roughness: 0.8 }),
        );
        post.position.set(bx, 0.48, pz);
        bridge.add(post);
      }
    });
    bridge.position.set(-4.5, 0.48, -15);
    worldGroup.add(bridge);

    const sampan = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.25, 3.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x6b3e1b, roughness: 0.75 }),
    );
    hull.rotation.z = Math.PI / 2;
    hull.scale.set(0.65, 1, 1.3);
    sampan.add(hull);
    sampan.position.set(12, 0.22, -15);
    worldGroup.add(sampan);

    // Taman Wau Warisan Pelantar at x = -2, z = 0
    const pelantar = buildPelantarWau(timberTex, songketTex);
    pelantar.position.set(-2, 0, 0);
    worldGroup.add(pelantar);

    // Taman Wau Warisan Opening Hang Tuah (standing beside Wau on the pelantar)
    const gardenTuah = buildHangTuahModel(songketTex);
    gardenTuah.group.position.set(-3.1, 0.8, 0.9);
    gardenTuah.group.rotation.y = 0.65;
    worldGroup.add(gardenTuah.group);

    // Malay traditional stilt houses scattered along the 5 zones
    const houseSpots = [
      [-12, -26],
      [26, -28],
      [78, -26],
      [98, -29],
      [118, -25],
      [164, -30],
      [246, -28],
      [308, -29],
    ];
    houseSpots.forEach(([hx, hz], idx) => {
      const h = buildMalayHouseModel(timberTex);
      h.position.set(hx, 0, hz);
      h.rotation.y = (idx % 2 === 0 ? 0.14 : -0.18);
      worldGroup.add(h);
    });

    // Coconut palms & tropical trees along background & foreground borders
    for (let px = -18; px <= 385; px += 14) {
      const palm = buildCoconutPalm();
      const zOff = px % 28 === 0 ? -9 : -24 - (px % 11);
      palm.position.set(px, 0, zOff);
      palm.scale.setScalar(0.85 + ((px * 7) % 30) / 100);
      worldGroup.add(palm);
    }

    // Layered Distant Hills / Tropical Mountains (Parallax backdrop)
    const hillMatFar = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.95 });
    const hillMatNear = new THREE.MeshStandardMaterial({ color: 0x3b8055, roughness: 0.92 });
    for (let mx = -40; mx <= 420; mx += 32) {
      const mFar = new THREE.Mesh(
        new THREE.ConeGeometry(22 + (mx % 9), 18 + (mx % 7), 6),
        hillMatFar,
      );
      mFar.position.set(mx, 8, -68);
      mFar.scale.set(1.8, 1, 0.7);
      worldGroup.add(mFar);

      const mNear = new THREE.Mesh(
        new THREE.ConeGeometry(16 + (mx % 6), 11 + (mx % 5), 6),
        hillMatNear,
      );
      mNear.position.set(mx + 14, 5, -46);
      mNear.scale.set(1.5, 1, 0.75);
      worldGroup.add(mNear);
    }

    // Instanced Rice Paddy Tufts & Bunga Raya Garden Blossoms
    const stalkCount = 280;
    const stalkGeo = new THREE.ConeGeometry(0.24, 0.52, 5);
    const stalkMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
    const stalkInst = new THREE.InstancedMesh(stalkGeo, stalkMat, stalkCount);
    const tint = new THREE.Color();
    for (let i = 0; i < stalkCount; i++) {
      const rx = -15 + (i % 70) * 2.1 + (i % 3) * 0.35;
      const rz = -4.5 - Math.floor(i / 70) * 1.95;
      _dummyObj.position.set(rx, 0.25, rz);
      _dummyObj.scale.set(1.1, 0.75 + (i % 4) * 0.12, 1.1);
      _dummyObj.rotation.set(0, (i * 0.9) % Math.PI, 0);
      _dummyObj.updateMatrix();
      stalkInst.setMatrixAt(i, _dummyObj.matrix);
      tint.setHSL(0.26 + (i % 5) * 0.014, 0.48, 0.34 + (i % 3) * 0.04);
      stalkInst.setColorAt(i, tint);
    }
    stalkInst.instanceMatrix.needsUpdate = true;
    if (stalkInst.instanceColor) stalkInst.instanceColor.needsUpdate = true;
    stalkInst.computeBoundingSphere();
    worldGroup.add(stalkInst);

    // Hibiscus (Bunga Raya) bushes around Taman Wau Warisan
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x246b3b, roughness: 0.78 });
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.55 });
    [
      [-7.2, 2.5],
      [2.8, 2.8],
      [3.6, -3.2],
      [-7.8, -3.8],
    ].forEach(([fx, fz]) => {
      const bush = new THREE.Group();
      const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 1), bushMat);
      base.position.y = 0.45;
      bush.add(base);
      for (let k = 0; k < 4; k++) {
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), flowerMat);
        fl.position.set(Math.cos(k * 1.5) * 0.52, 0.65 + (k % 2) * 0.18, Math.sin(k * 1.5) * 0.52);
        bush.add(fl);
      }
      bush.position.set(fx, 0, fz);
      worldGroup.add(bush);
    });

    // Floating Drifting Clouds along flight path
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xfffaf0,
      roughness: 0.9,
      metalness: 0,
    });
    const clouds: THREE.Group[] = [];
    for (let cx = -15; cx <= 390; cx += 24) {
      const cGroup = new THREE.Group();
      const puffs = 3;
      for (let p = 0; p < puffs; p++) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4 - p * 0.2, 1), cloudMat);
        puff.position.set((p - 1) * 1.25, p === 1 ? 0.35 : 0, 0);
        puff.scale.set(1.2, 0.65, 0.9);
        cGroup.add(puff);
      }
      cGroup.position.set(cx, 12.2 + (cx % 4), -24 - (cx % 14));
      clouds.push(cGroup);
      worldGroup.add(cGroup);
    }

    // 5. Five Gerbang Bahasa Checkpoints + Grand Gerbang Balai Olah Hikayat
    const checkpointGates: THREE.Group[] = [];
    CHECKPOINTS.forEach((cp) => {
      const gate = buildGerbangBahasa(timberTex, false);
      gate.position.set(cp.worldX, 0, 0);
      checkpointGates.push(gate);
      worldGroup.add(gate);
    });

    const grandGate = buildGerbangBahasa(timberTex, true);
    grandGate.position.set(FINAL_GATE_WORLD_X, 0, 0);
    worldGroup.add(grandGate);

    // 6. Player Wau Bulan Sakti + Riding Hang Tuah + Contact Shadow + Golden Trail
    const wauRig = buildWauBulanModel(batikTex, songketTex);
    const flightTuah = buildHangTuahModel(songketTex);
    flightTuah.group.scale.setScalar(0.72);
    flightTuah.group.rotation.y = Math.PI / 2; // Face +X forward
    flightTuah.group.position.set(-0.08, 0.02, 0);
    wauRig.riderMount.add(flightTuah.group);
    scene.add(wauRig.group);

    // Soft contact shadow disc directly below Wau on ground y = 0.02
    const wauShadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.65, 24),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
    );
    wauShadow.rotation.x = -Math.PI / 2;
    wauShadow.position.set(0, 0.04, 0);
    scene.add(wauShadow);

    // Pooled Golden Particle Trail (InstancedMesh, zero per-frame GC)
    const particleCount = 42;
    const particleGeo = new THREE.OctahedronGeometry(0.11, 0);
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.4,
    });
    const particleInst = new THREE.InstancedMesh(particleGeo, particleMat, particleCount);
    particleInst.frustumCulled = false;
    scene.add(particleInst);
    const particlePositions = Array.from({ length: particleCount }, () => ({
      x: 0,
      y: WAU_START_Y,
      z: 0,
      life: Math.random(),
    }));
    let particleCursor = 0;

    // 7. Balai Olah Hikayat 3D Hall Stage (positioned separately at z = 90 so no overlap with flight)
    const balaiStage = buildBalaiOlahHikayatGroup(timberTex, songketTex, mengkuangTex);
    balaiStage.group.position.set(0, 0, 95);
    scene.add(balaiStage.group);

    const balaiTuah = buildHangTuahModel(songketTex);
    balaiTuah.group.position.set(-1.95, 0.05, 95 - 0.35);
    balaiTuah.group.rotation.y = 0.45;
    scene.add(balaiTuah.group);

    // Warm interior point light inside Balai Olah Hikayat
    const balaiLight = new THREE.PointLight(0xffd27d, 2.2, 24, 1.4);
    balaiLight.position.set(0, 3.6, 95.8);
    scene.add(balaiLight);

    // Obstacle Container
    const obstaclesGroup = new THREE.Group();
    scene.add(obstaclesGroup);

    const rebuildObstacles = () => {
      // Clean previous obstacle meshes
      while (obstaclesGroup.children.length > 0) {
        obstaclesGroup.remove(obstaclesGroup.children[0]);
      }
      const p = propsRef.current;
      const cfg = DIFFICULTY_CONFIGS[p.mode];
      const nextObstacles =
        p.phase === 'tutorial'
          ? generateTutorialObstacles()
          : generateObstaclesForRun(cfg, 202605);

      simRef.current.wau = createInitialWauState();
      simRef.current.obstacles = nextObstacles;
      simRef.current.obstacleMeshes = nextObstacles.map((obs) => {
        const mesh = buildObstacleMesh(obs, timberTex);
        obstaclesGroup.add(mesh);
        return mesh;
      });
      simRef.current.triggeredCheckpoints = new Set(p.completedCheckpoints);
      simRef.current.finalGateTriggered = false;
      simRef.current.tutorialDone = false;
      simRef.current.score = 0;
      simRef.current.hitFlashTimer = 0;
      simRef.current.cameraShake = 0;
    };

    rebuildObstaclesRef.current = rebuildObstacles;
    rebuildObstacles();

    // Pre-warm shaders on GPU devices & draw immediate first frame
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    camera.position.set(-5.2, 4.2, 11.4);
    camera.lookAt(-2.8, 2.2, 0);
    renderer.render(scene, camera);

    // Resize Observer
    const handleResize = () => {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(mount);

    // 8. Main Animation & Physics Loop (delta-time + software-WebGL afterDraw)
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;
    let prevSceneStage: 'garden' | 'flight' | 'balai' = 'garden';
    const smoothCamPos = new THREE.Vector3(-5.2, 4.1, 11.2);
    const smoothLookAt = new THREE.Vector3(-2.9, 2.1, 0);

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = (now: number) => {
      if (disposed) return;
      const rawDt = Math.max(0.001, (now - lastTime) / 1000);
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const p = propsRef.current;
      const sim = simRef.current;
      const motionMult = p.reducedMotion ? 0.25 : 1;

      if (p.phase !== 'paused') {
        elapsed += dt;
      }

      // Quality-scaled decoration visibility
      const isLow = p.quality === 'low';
      stalkInst.visible = !isLow;
      particleInst.visible = !isLow;

      const isBalaiPhase =
        p.phase === 'balai_arrival' ||
        p.phase === 'workshop' ||
        p.phase === 'self_check' ||
        p.phase === 'preview' ||
        p.phase === 'victory';

      const isGardenOpening = p.phase === 'title' || p.phase === 'briefing';
      const currentStage: 'garden' | 'flight' | 'balai' = isBalaiPhase
        ? 'balai'
        : isGardenOpening
          ? 'garden'
          : 'flight';
      const stageChanged = currentStage !== prevSceneStage;
      prevSceneStage = currentStage;

      if (isBalaiPhase) {
        // Balai Olah Hikayat 3D Vista & Victory animations
        const isVictory = p.phase === 'victory';
        balaiTuah.setPose(isVictory ? 'celebrate' : 'idle', elapsed);
        wauRig.group.visible = false;
        wauShadow.visible = false;
        gardenTuah.group.visible = false;
        balaiLight.intensity = isVictory ? 3.1 : 2.2;

        // Position sunlight for warm interior illumination
        sunLight.position.set(4, 12, 106);
        sunLight.target.position.set(0, 1, 94);

        // Orbiting 5 golden phrase scrolls around Kitab Hikayat Baharu
        balaiStage.scrollOrbs.forEach((orb, idx) => {
          const angle = elapsed * (isVictory ? 2.2 : 0.85) + (idx * Math.PI * 2) / 5;
          const radius = isVictory ? 1.15 : 1.55;
          orb.position.set(
            Math.cos(angle) * radius,
            1.65 + Math.sin(elapsed * 2 + idx) * 0.14,
            -0.35 + Math.sin(angle) * radius * 0.65,
          );
          orb.rotation.y = -angle;
        });

        balaiStage.pelitaFlames.forEach((f, idx) => {
          const s = (isVictory ? 1.45 : 1.0) + Math.sin(elapsed * 8 + idx) * 0.12;
          f.scale.setScalar(s);
        });
        balaiStage.curtains.forEach((c, idx) => {
          c.rotation.z = Math.sin(elapsed * 1.4 + idx) * 0.04 * motionMult;
        });

        // Warm golden indoor atmosphere & sky outside back lattice window
        _colorA.set('#f3d8a3');
        (scene.background as THREE.Color).copy(_colorA);
        (scene.fog as THREE.FogExp2).color.copy(_colorA);
        skyUniforms.topColor.value.set('#38bdf8');
        skyUniforms.bottomColor.value.set('#fde68a');
        skyDome.position.set(0, 0, 95);

        _vec3A.set(0.25, 2.75, 99.1);
        _vec3B.set(-0.35, 1.35, 94.1);
        if (stageChanged) {
          smoothCamPos.copy(_vec3A);
          smoothLookAt.copy(_vec3B);
        } else {
          const damp = 1 - Math.exp(-5.0 * dt);
          smoothCamPos.lerp(_vec3A, damp);
          smoothLookAt.lerp(_vec3B, damp);
        }
        camera.position.copy(smoothCamPos);
        camera.lookAt(smoothLookAt);
      } else if (isGardenOpening) {
        // Taman Wau Warisan Cinematic Stage: Wau hovers gently above the pelantar beside Hang Tuah
        wauRig.group.visible = true;
        wauShadow.visible = true;
        wauRig.group.position.set(0.4, 2.35 + Math.sin(elapsed * 1.8) * 0.15, 0);
        wauRig.group.rotation.set(0, 0, Math.sin(elapsed * 1.2) * 0.05);
        flightTuah.group.visible = false;
        gardenTuah.group.visible = true;
        gardenTuah.setPose(p.phase === 'briefing' ? 'point' : 'idle', elapsed);
        wauRig.updateAnimation(elapsed, 0, false);

        sunLight.position.set(18, 28, 22);
        sunLight.target.position.set(0, 0, 0);

        wauShadow.position.set(0.4, 0.82, 0);
        wauShadow.material.opacity = 0.35;

        _colorA.set(FLIGHT_ZONES[0].fogColor);
        (scene.background as THREE.Color).copy(_colorA);
        (scene.fog as THREE.FogExp2).color.copy(_colorA);
        skyUniforms.topColor.value.set(FLIGHT_ZONES[0].skyTop);
        skyUniforms.bottomColor.value.set(FLIGHT_ZONES[0].skyBottom);
        skyDome.position.set(-2, 0, 0);

        // Position camera so Hang Tuah & Wau Bulan sit clearly on the right half beside the title card
        const orbitOffset = p.phase === 'title' ? Math.sin(elapsed * 0.35) * 0.85 : 0;
        _vec3A.set(-5.2 + orbitOffset, 4.1, 11.2);
        _vec3B.set(-2.9, 2.1, 0);
        if (stageChanged) {
          smoothCamPos.copy(_vec3A);
          smoothLookAt.copy(_vec3B);
        } else {
          const damp = 1 - Math.exp(-4.0 * dt);
          smoothCamPos.lerp(_vec3A, damp);
          smoothLookAt.lerp(_vec3B, damp);
        }
        camera.position.copy(smoothCamPos);
        camera.lookAt(smoothLookAt);
      } else {
        // Active Flight / Tutorial / Countdown / Checkpoint / Paused / Gameover
        flightTuah.group.visible = true;
        wauShadow.visible = true;
        gardenTuah.group.visible = false;

        const cfg = DIFFICULTY_CONFIGS[p.mode];
        const canMove = p.phase === 'playing' || p.phase === 'tutorial';

        if (canMove) {
          // Check proximity to upcoming uncompleted checkpoint to slow down safely
          let speedMult = 1;
          if (p.phase === 'playing') {
            for (const cp of CHECKPOINTS) {
              if (!sim.triggeredCheckpoints.has(cp.index)) {
                const dist = cp.worldX - sim.wau.x;
                if (dist > 0 && dist < 8) {
                  speedMult = Math.max(0.42, dist / 8);
                }
                if (dist <= 0.6) {
                  sim.triggeredCheckpoints.add(cp.index);
                  p.onCheckpointReached(cp.index);
                }
                break;
              }
            }

            // Final Grand Gate detection (only after all 5 checkpoints!)
            if (
              !sim.finalGateTriggered &&
              sim.triggeredCheckpoints.size >= CHECKPOINTS.length &&
              sim.wau.x >= FINAL_GATE_WORLD_X - 0.5
            ) {
              sim.finalGateTriggered = true;
              p.onFinalGateReached();
            }
          } else if (p.phase === 'tutorial') {
            if (!sim.tutorialDone && sim.wau.x >= 78) {
              sim.tutorialDone = true;
              p.onTutorialComplete();
            }
          }

          sim.wau = stepWauPhysics(
            sim.wau,
            isLiftingRef.current,
            cfg,
            dt,
            speedMult,
          );

          // Check obstacles
          for (let i = 0; i < sim.obstacles.length; i++) {
            const obs = sim.obstacles[i];
            if (!obs.passed && sim.wau.x > obs.worldX + obs.width * 0.6) {
              obs.passed = true;
              if (p.phase === 'playing') {
                sim.score += 10;
                p.onObstaclePassed(10);
              }
            }
            if (
              p.phase === 'playing' &&
              sim.wau.invulnerableTimer <= 0 &&
              checkWauObstacleCollision(sim.wau.x, sim.wau.y, obs)
            ) {
              sim.wau.invulnerableTimer = 1.45;
              sim.hitFlashTimer = 0.45;
              sim.cameraShake = 0.35;
              p.onCollisionHit();
            }
          }
        }

        // Update Wau & Hang Tuah visuals
        wauRig.group.position.set(sim.wau.x, sim.wau.y, 0);
        wauRig.group.rotation.set(0, 0, sim.wau.pitch);

        if (sim.hitFlashTimer > 0) {
          sim.hitFlashTimer = Math.max(0, sim.hitFlashTimer - dt);
          flightTuah.setPose('hit', elapsed, sim.wau.vy);
        } else if (p.phase === 'flight_success') {
          flightTuah.setPose('celebrate', elapsed, 0);
        } else {
          flightTuah.setPose('ride', elapsed, sim.wau.vy);
        }

        // Invulnerability blink feedback
        wauRig.group.visible =
          sim.wau.invulnerableTimer <= 0 || Math.floor(elapsed * 14) % 2 === 0;

        wauRig.updateAnimation(elapsed, sim.wau.vy, isLiftingRef.current);

        // Ground shadow follows Wau X
        wauShadow.position.set(sim.wau.x, 0.04, 0);
        const hRatio = THREE.MathUtils.clamp(1 - sim.wau.y / 14, 0.25, 0.9);
        wauShadow.scale.setScalar(0.8 + (1 - hRatio) * 0.7);
        wauShadow.material.opacity = hRatio * 0.4;

        // Move directional sun along with player so shadows stay crisp
        sunLight.position.set(sim.wau.x + 14, 28, 22);
        sunLight.target.position.set(sim.wau.x + 6, 0, 0);

        // Smooth atmosphere color progression across the 5 zones
        const zoneIdx = getZoneIndexForX(sim.wau.x);
        const zone = FLIGHT_ZONES[zoneIdx];
        _colorB.set(zone.fogColor);
        (scene.background as THREE.Color).lerp(_colorB, Math.min(1, dt * 1.8));
        (scene.fog as THREE.FogExp2).color.lerp(_colorB, Math.min(1, dt * 1.8));
        _colorA.set(zone.skyTop);
        skyUniforms.topColor.value.lerp(_colorA, Math.min(1, dt * 1.5));
        _colorA.set(zone.skyBottom);
        skyUniforms.bottomColor.value.lerp(_colorA, Math.min(1, dt * 1.5));
        skyDome.position.set(sim.wau.x, 0, 0);

        // Update trailing golden particles
        if (!isLow && (canMove || p.phase === 'countdown')) {
          const slot = particlePositions[particleCursor % particleCount];
          slot.x = sim.wau.x - 0.9;
          slot.y = sim.wau.y + (Math.random() - 0.5) * 0.4;
          slot.z = (Math.random() - 0.5) * 0.6;
          slot.life = 1.0;
          particleCursor += 1;
        }
        for (let i = 0; i < particleCount; i++) {
          const pt = particlePositions[i];
          pt.life = Math.max(0, pt.life - dt * 1.15);
          pt.x -= dt * 1.4;
          _dummyObj.position.set(pt.x, pt.y, pt.z);
          _dummyObj.scale.setScalar(pt.life * (isLiftingRef.current ? 1.2 : 0.8));
          _dummyObj.rotation.set(elapsed + i, elapsed * 0.8, 0);
          _dummyObj.updateMatrix();
          particleInst.setMatrixAt(i, _dummyObj.matrix);
        }
        particleInst.instanceMatrix.needsUpdate = true;

        // Animate floating scrolls in Checkpoint Gates
        checkpointGates.forEach((gate, idx) => {
          const scroll = gate.getObjectByName('floatingScroll');
          if (scroll) {
            scroll.visible = !sim.triggeredCheckpoints.has(idx);
            scroll.position.y = 6.2 + Math.sin(elapsed * 2.2 + idx) * 0.35;
            scroll.rotation.y = elapsed * 1.1;
          }
        });

        // Gentle wind rotation on guiding rings & sampan drift
        sampan.position.x = 12 + Math.sin(elapsed * 0.15) * 8;
        clouds.forEach((c, idx) => {
          c.position.x += Math.sin(elapsed * 0.1 + idx) * 0.004 * motionMult;
        });

        // 2.5D Side-Follow Camera looking slightly ahead (+X) so obstacles are clearly visible
        sim.cameraShake = Math.max(0, sim.cameraShake - dt * 1.8);
        const shakeX =
          sim.cameraShake > 0 ? (Math.random() - 0.5) * sim.cameraShake * 0.45 : 0;
        const shakeY =
          sim.cameraShake > 0 ? (Math.random() - 0.5) * sim.cameraShake * 0.45 : 0;

        _vec3A.set(sim.wau.x + 5.8 + shakeX, 6.4 + shakeY, 17.8);
        _vec3B.set(sim.wau.x + 6.4, 6.0, 0);
        if (stageChanged) {
          smoothCamPos.copy(_vec3A);
          smoothLookAt.copy(_vec3B);
        } else {
          const camDamp = 1 - Math.exp(-7 * dt);
          smoothCamPos.lerp(_vec3A, camDamp);
          smoothLookAt.lerp(_vec3B, camDamp);
        }
        camera.position.copy(smoothCamPos);
        camera.lookAt(smoothLookAt);

        // Throttled HUD snapshot emission (<= 10Hz)
        if (now - sim.lastHudSentAt > 110) {
          sim.lastHudSentAt = now;
          p.onHudTick({
            worldX: sim.wau.x,
            zoneIndex: zoneIdx,
            progressPct: Math.min(
              100,
              Math.round((sim.wau.x / FINAL_GATE_WORLD_X) * 100),
            ),
            hearts: p.hearts,
            score: sim.score,
            invulnerable: sim.wau.invulnerableTimer > 0,
          });
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(() => tick(performance.now()));
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      envTex.dispose();
      batikTex.dispose();
      songketTex.dispose();
      timberTex.dispose();
      mengkuangTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [isLiftingRef]);

  return (
    <div
      ref={containerRef}
      data-testid="world-3d-canvas"
      className="absolute inset-0 w-full h-full select-none touch-none"
      onPointerDown={() => {
        if (propsRef.current.phase === 'playing' || propsRef.current.phase === 'tutorial') {
          isLiftingRef.current = true;
        }
      }}
      onPointerUp={() => {
        isLiftingRef.current = false;
      }}
      onPointerCancel={() => {
        isLiftingRef.current = false;
      }}
      onPointerLeave={() => {
        isLiftingRef.current = false;
      }}
    />
  );
};
