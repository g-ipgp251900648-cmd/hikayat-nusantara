import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { KITAB_STATION, SCROLL_STATIONS, ScrollId } from '../game/data';
import { createHangTuah, HangTuahAnimState } from '../game/hangTuah';
import { resolveCircleAABBCollision } from '../game/rules';
import { createNusantaraTextures } from '../game/textures';
import { buildDesaHikayatWorld } from '../game/world';

export type ScenePhase =
  | 'title'
  | 'intro'
  | 'intro_briefing'
  | 'playing'
  | 'modal'
  | 'paused'
  | 'victory';

export interface NearbyInteractable {
  kind: 'scroll' | 'kitab';
  id: ScrollId | 'kitab';
  label: string;
}

export interface AutoWalkRequest {
  id: string;
  targetX: number;
  targetZ: number;
  autoInspect?: boolean;
  nonce: number;
}

interface WorldCanvasProps {
  phase: ScenePhase;
  foundScrolls: ScrollId[];
  lowGraphics: boolean;
  reduceMotion: boolean;
  introSkipNonce: number;
  restartNonce: number;
  joystickVecRef: React.MutableRefObject<{ x: number; y: number }>;
  autoWalkRequest: AutoWalkRequest | null;
  interactNonce: number;
  onNearbyChange: (nearby: NearbyInteractable | null) => void;
  onInspectTarget: (target: NearbyInteractable) => void;
  onIntroFinished: () => void;
  onIndoorStateChange: (inside: boolean) => void;
  onWebglError: () => void;
}

export const WorldCanvas: React.FC<WorldCanvasProps> = ({
  phase,
  foundScrolls,
  lowGraphics,
  reduceMotion,
  introSkipNonce,
  restartNonce,
  joystickVecRef,
  autoWalkRequest,
  interactNonce,
  onNearbyChange,
  onInspectTarget,
  onIntroFinished,
  onIndoorStateChange,
  onWebglError,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Refs synced to latest React state/callbacks so WebGL never tears down on UI updates
  const phaseRef = useRef(phase);
  const foundRef = useRef(foundScrolls);
  const lowGraphicsRef = useRef(lowGraphics);
  const reduceMotionRef = useRef(reduceMotion);
  const onNearbyRef = useRef(onNearbyChange);
  const onInspectRef = useRef(onInspectTarget);
  const onIntroDoneRef = useRef(onIntroFinished);
  const onIndoorRef = useRef(onIndoorStateChange);
  const onWebglErrorRef = useRef(onWebglError);

  phaseRef.current = phase;
  foundRef.current = foundScrolls;
  lowGraphicsRef.current = lowGraphics;
  reduceMotionRef.current = reduceMotion;
  onNearbyRef.current = onNearbyChange;
  onInspectRef.current = onInspectTarget;
  onIntroDoneRef.current = onIntroFinished;
  onIndoorRef.current = onIndoorStateChange;
  onWebglErrorRef.current = onWebglError;

  const introSkipNonceRef = useRef(introSkipNonce);
  const restartNonceRef = useRef(restartNonce);
  const interactNonceRef = useRef(interactNonce);
  const autoWalkRef = useRef<AutoWalkRequest | null>(autoWalkRequest);
  autoWalkRef.current = autoWalkRequest;

  const worldTriggerRef = useRef<{
    triggerInspectFx: (id: ScrollId | 'kitab') => void;
    resetPlayer: (inside: boolean) => void;
    skipIntro: () => void;
  } | null>(null);

  useEffect(() => {
    if (introSkipNonce !== introSkipNonceRef.current) {
      introSkipNonceRef.current = introSkipNonce;
      worldTriggerRef.current?.skipIntro();
    }
  }, [introSkipNonce]);

  useEffect(() => {
    if (restartNonce !== restartNonceRef.current) {
      restartNonceRef.current = restartNonce;
      worldTriggerRef.current?.resetPlayer(false);
    }
  }, [restartNonce]);

  useEffect(() => {
    if (interactNonce !== interactNonceRef.current) {
      interactNonceRef.current = interactNonce;
      // Handled inside loop via ref check
    }
  }, [interactNonce]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL cleanly without touching user agent
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      onWebglErrorRef.current();
      return;
    }

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      onWebglErrorRef.current();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || 1280, container.clientHeight || 720);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      52,
      (container.clientWidth || 1280) / (container.clientHeight || 720),
      0.15,
      220
    );

    // Studio & outdoor PBR reflection environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Warm/cool contrast lighting rig (<= 1 shadow caster)
    const hemiLight = new THREE.HemisphereLight(0xbbe6ff, 0x5c4028, 0.85);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffe7b3, 1.85);
    sunLight.position.set(16, 22, 14);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 65;
    const d = 18;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    // Subtle interior fill light so timber carvings stay crisp
    const interiorFill = new THREE.PointLight(0xffdca8, 1.1, 18, 1.4);
    interiorFill.position.set(0, 4.1, -1.5);
    scene.add(interiorFill);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const textures = createNusantaraTextures(maxAniso);
    const world = buildDesaHikayatWorld(scene, textures, isSoftwareGl);
    const hangTuah = createHangTuah(textures);
    scene.add(hangTuah.root);

    // Initial player spawn: inside Rumah Naskhah Pusaka if ?autostart=1, else outside by village path
    const startInside = phaseRef.current === 'playing';
    const playerPos = new THREE.Vector3(
      0,
      startInside ? world.groundHeightAt(0, 2.6) : 0,
      startInside ? 2.6 : 13.5
    );
    let playerYaw = Math.PI; // Facing -Z (toward Kitab Warisan / Rumah Naskhah Pusaka)
    if (startInside) {
      world.setDoorOpenAmount(1);
      world.setIntroScatterProgress(1);
    }
    hangTuah.root.position.copy(playerPos);
    hangTuah.root.rotation.y = playerYaw;

    // Camera state
    const camPos = startInside
      ? new THREE.Vector3(0, 4.2, 6.2)
      : new THREE.Vector3(-1.5, 5.4, 21.8);
    const camLook = startInside
      ? new THREE.Vector3(0, 2.2, 0.2)
      : new THREE.Vector3(-5.0, 2.2, 5.0);
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Input tracking on window
    const keysDown = new Set<string>();
    let justPressedInteract = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        if (phaseRef.current === 'playing') e.preventDefault();
      }
      keysDown.add(e.code);
      if (e.code === 'KeyE' && !e.repeat && phaseRef.current === 'playing') {
        justPressedInteract = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
    };
    const clearKeys = () => {
      keysDown.clear();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', clearKeys);

    // ResizeObserver
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth || 1280;
      const h = container.clientHeight || 720;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    // Simulation state
    let introTimer = 0;
    let introDoneSent = false;
    let lastPhase: ScenePhase = phaseRef.current;
    let focusTimer = 0;
    const focusTargetPos = new THREE.Vector3();
    let interactAnimTimer = 0;
    let activeInteractAnim: HangTuahAnimState = 'interact';
    let lastNearbyKey = '';
    let lastInside = false;
    let handledAutoWalkNonce = 0;
    let activeAutoWaypoints: { x: number; z: number }[] = [];
    let autoInspectPending = false;
    let lastHandledButtonInteractNonce = interactNonceRef.current;
    let lastFoundCount = foundRef.current.length;

    const _desiredCamPos = new THREE.Vector3();
    const _desiredLook = new THREE.Vector3();
    const _moveDir = new THREE.Vector3();

    function enqueueAutoWalk(req: AutoWalkRequest) {
      const waypoints: { x: number; z: number }[] = [];
      const playerOut = playerPos.z > 5.6;
      const targetIn = req.targetZ < 5.6;
      const playerIn = playerPos.z <= 5.6;
      const targetOut = req.targetZ > 5.6;

      if (playerOut && targetIn) {
        // Guide up the stairs & through front doorway
        if (playerPos.z > 10.6) waypoints.push({ x: 0, z: 10.8 });
        waypoints.push({ x: 0, z: 6.2 });
        waypoints.push({ x: 0, z: 3.4 });
      } else if (playerIn && targetOut) {
        waypoints.push({ x: 0, z: 3.4 });
        waypoints.push({ x: 0, z: 6.2 });
      } else if (playerIn && targetIn) {
        // Route cleanly in front of central Meja Utama if crossing left <-> right behind it
        const crossesCenterX =
          (playerPos.x < -1.2 && req.targetX > 1.2) ||
          (playerPos.x > 1.2 && req.targetX < -1.2);
        if (crossesCenterX && (playerPos.z < -2.4 || req.targetZ < -2.4)) {
          waypoints.push({ x: 0, z: -2.1 });
        }
      }
      waypoints.push({ x: req.targetX, z: req.targetZ });
      activeAutoWaypoints = waypoints;
      autoInspectPending = Boolean(req.autoInspect);
    }

    function triggerInspectEffect(target: NearbyInteractable) {
      if (target.kind === 'scroll' && target.id !== 'kitab') {
        const scrollId = target.id;
        if (scrollId === 'peti') {
          world.triggerChestOpen();
          activeInteractAnim = 'openChest';
        } else {
          activeInteractAnim = 'pickup';
        }
        world.triggerScrollFly(scrollId);
        const st = SCROLL_STATIONS.find((s) => s.id === scrollId);
        if (st) {
          focusTargetPos.set(st.worldPos.x, 2.3, st.worldPos.z);
          focusTimer = 1.45;
        }
        interactAnimTimer = 1.1;
      } else {
        activeInteractAnim = 'read';
        focusTargetPos.set(KITAB_STATION.worldPos.x, 2.2, KITAB_STATION.worldPos.z);
        focusTimer = 0.85;
        interactAnimTimer = 0.8;
      }
    }

    worldTriggerRef.current = {
      triggerInspectFx: (id) => {
        if (id === 'kitab') {
          triggerInspectEffect({ kind: 'kitab', id: 'kitab', label: 'Baca Kitab Warisan' });
        } else {
          const st = SCROLL_STATIONS.find((s) => s.id === id);
          triggerInspectEffect({ kind: 'scroll', id, label: st?.inspectPrompt || '' });
        }
      },
      resetPlayer: (inside) => {
        introTimer = 0;
        introDoneSent = false;
        activeAutoWaypoints = [];
        autoInspectPending = false;
        focusTimer = 0;
        interactAnimTimer = 0;
        world.setDoorOpenAmount(inside ? 1 : 0);
        world.setIntroScatterProgress(inside ? 1 : 0);
        if (inside) {
          playerPos.set(0, world.groundHeightAt(0, 2.2), 2.2);
          playerYaw = Math.PI;
        } else {
          playerPos.set(0, 0, 13.5);
          playerYaw = Math.PI;
        }
        hangTuah.root.position.copy(playerPos);
        hangTuah.root.rotation.y = playerYaw;
      },
      skipIntro: () => {
        introTimer = 10.2;
        world.setDoorOpenAmount(1);
        world.setIntroScatterProgress(1);
        playerPos.set(0, world.groundHeightAt(0, 2.2), 2.2);
        playerYaw = Math.PI;
        hangTuah.root.position.copy(playerPos);
        hangTuah.root.rotation.y = playerYaw;
      },
    };

    // Main render / sim loop
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 32);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 32);
      }
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const curPhase = phaseRef.current;
      const curFound = foundRef.current;

      // Detect phase transitions
      if (curPhase !== lastPhase) {
        if (curPhase === 'intro') {
          introTimer = 0;
          introDoneSent = false;
          world.setDoorOpenAmount(0);
          world.setIntroScatterProgress(0);
          playerPos.set(0, 0, 12.2);
          playerYaw = Math.PI;
        } else if (curPhase === 'playing' && (lastPhase === 'title' || lastPhase === 'intro_briefing')) {
          // Ensure doors are open & Hang Tuah is inside ready to search if skipping straight via ?autostart=1
          world.setDoorOpenAmount(1);
          world.setIntroScatterProgress(1);
          if (lastPhase === 'title') {
            playerPos.set(0, world.groundHeightAt(0, 2.2), 2.2);
            playerYaw = Math.PI;
            camPos.set(0, 4.2, 6.4);
            camLook.set(0, 2.2, 0.5);
          }
        }
        lastPhase = curPhase;
      }

      // Sync newly collected scrolls if triggered from 2D/UI
      if (curFound.length > lastFoundCount) {
        lastFoundCount = curFound.length;
      } else if (curFound.length < lastFoundCount) {
        lastFoundCount = curFound.length;
      }

      const simDt = Math.min(rawDt, 0.35);

      if (curPhase !== 'paused') {
        elapsed += simDt;
      }

      let animState: HangTuahAnimState = 'idle';
      let moveSpeed = 0;

      if (curPhase === 'title') {
        // Live World Camera Tour framed so house & Hang Tuah sit on the right half away from title card
        world.setDoorOpenAmount(0.15);
        const orbitAngle = Math.sin(elapsed * 0.22) * 0.22 * (reduceMotionRef.current ? 0.2 : 1);
        _desiredCamPos.set(
          -1.5 + Math.sin(orbitAngle) * 2.2,
          5.4 + Math.sin(elapsed * 0.35) * 0.4,
          21.8 + Math.cos(orbitAngle) * 1.4
        );
        _desiredLook.set(-5.0, 2.2, 5.0);
        camPos.lerp(_desiredCamPos, 1 - Math.exp(-3 * simDt));
        camLook.lerp(_desiredLook, 1 - Math.exp(-3 * simDt));
        playerPos.set(0, 0, 13.0);
        playerYaw = Math.PI;
      } else if (curPhase === 'intro') {
        introTimer += simDt;
        // Beat 1 (0..3.5s): Scenic village fly-in from river toward Rumah Naskhah Pusaka
        if (introTimer < 3.5) {
          const t = introTimer / 3.5;
          _desiredCamPos.set(Math.sin(t * 0.6) * 5.5, 5.2 - t * 1.4, 21.5 - t * 8.5);
          _desiredLook.set(0, 2.3, 4.0);
          playerPos.set(0, 0, 12.2);
          playerYaw = Math.PI;
          world.setDoorOpenAmount(0);
        }
        // Beat 2 (3.5..6.8s): Hang Tuah walks up wooden stairs, double doors swing open
        else if (introTimer < 6.8) {
          const t = (introTimer - 3.5) / 3.3;
          const pz = THREE.MathUtils.lerp(12.2, 3.6, t);
          playerPos.set(0, world.groundHeightAt(0, pz), pz);
          playerYaw = Math.PI;
          animState = 'walk';
          moveSpeed = 2.8;
          world.setDoorOpenAmount(THREE.MathUtils.clamp((t - 0.25) * 1.8, 0, 1));
          _desiredCamPos.set(2.4, playerPos.y + 2.5, pz + 4.4);
          _desiredLook.set(0, playerPos.y + 1.5, pz - 1.5);
        }
        // Beat 3 (6.8..10.0s): Camera enters interior, Kitab glows, 5 scrolls scatter!
        else if (introTimer < 10.0) {
          const t = (introTimer - 6.8) / 3.2;
          world.setDoorOpenAmount(1);
          const pz = THREE.MathUtils.lerp(3.6, 2.2, Math.min(1, t * 2));
          playerPos.set(0, world.groundHeightAt(0, pz), pz);
          world.setIntroScatterProgress(t);
          _desiredCamPos.set(-2.5 + t * 2.5, 3.8, 2.8);
          _desiredLook.set(0, 2.1, -3.8);
        }
        // Beat 4 (10.0s+): Ready for Hang Tuah dialogue & briefing
        else {
          world.setDoorOpenAmount(1);
          world.setIntroScatterProgress(1);
          playerPos.set(0, world.groundHeightAt(0, 2.2), 2.2);
          playerYaw = 0; // Turn toward camera/student to speak!
          _desiredCamPos.set(0.4, 3.0, 5.2);
          _desiredLook.set(0, 2.2, 1.0);
          if (!introDoneSent) {
            introDoneSent = true;
            onIntroDoneRef.current();
          }
        }
        camPos.lerp(_desiredCamPos, 1 - Math.exp(-4.2 * dt));
        camLook.lerp(_desiredLook, 1 - Math.exp(-4.2 * dt));
      } else if (curPhase === 'intro_briefing') {
        playerYaw = 0;
        _desiredCamPos.set(0.5, 2.95, 5.0);
        _desiredLook.set(0, 2.15, 1.5);
        camPos.lerp(_desiredCamPos, 1 - Math.exp(-5 * dt));
        camLook.lerp(_desiredLook, 1 - Math.exp(-5 * dt));
      } else if (curPhase === 'victory') {
        animState = 'celebrate';
        const orbit = elapsed * 0.45 * (reduceMotionRef.current ? 0.15 : 1);
        _desiredCamPos.set(Math.sin(orbit) * 3.8, 3.4, -2.5 + Math.cos(orbit) * 4.2);
        _desiredLook.set(0, 2.1, -3.4);
        camPos.lerp(_desiredCamPos, 1 - Math.exp(-4 * dt));
        camLook.lerp(_desiredLook, 1 - Math.exp(-4 * dt));
      } else if (curPhase === 'playing') {
        world.setDoorOpenAmount(1);

        // Handle new auto-walk request
        const req = autoWalkRef.current;
        if (req && req.nonce !== handledAutoWalkNonce) {
          handledAutoWalkNonce = req.nonce;
          interactAnimTimer = 0;
          focusTimer = 0;
          enqueueAutoWalk(req);
        }

        // Manual input vector
        let ix = 0;
        let iz = 0;
        if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) ix -= 1;
        if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) ix += 1;
        if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) iz -= 1;
        if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) iz += 1;

        const jx = joystickVecRef.current.x;
        const jy = joystickVecRef.current.y;
        if (Math.hypot(jx, jy) > 0.12) {
          ix += jx;
          iz += jy;
        }

        const hasManualInput = Math.hypot(ix, iz) > 0.08;
        if (hasManualInput) {
          // Cancel auto-walk & any lingering inspect anim if player steers manually
          activeAutoWaypoints = [];
          autoInspectPending = false;
          interactAnimTimer = 0;
          focusTimer = 0;
        }

        if (interactAnimTimer > 0 && !hasManualInput && activeAutoWaypoints.length === 0) {
          interactAnimTimer -= simDt;
          animState = activeInteractAnim;
        } else if (hasManualInput) {
          _moveDir.set(ix, 0, iz).normalize();
          const walkSpeed = 4.8;
          moveSpeed = walkSpeed;
          animState = 'walk';

          const subSteps = Math.max(1, Math.ceil(simDt / 0.04));
          const stepDt = simDt / subSteps;
          for (let s = 0; s < subSteps; s++) {
            const nextX = playerPos.x + _moveDir.x * walkSpeed * stepDt;
            const nextZ = playerPos.z + _moveDir.z * walkSpeed * stepDt;
            const resolved = resolveCircleAABBCollision(
              nextX,
              nextZ,
              0.42,
              world.colliders,
              world.worldBounds
            );
            playerPos.x = resolved.x;
            playerPos.z = resolved.z;
          }
          playerPos.y = world.groundHeightAt(playerPos.x, playerPos.z);

          const targetYaw = Math.atan2(_moveDir.x, _moveDir.z);
          let diff = targetYaw - playerYaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          playerYaw += diff * (1 - Math.exp(-12 * simDt));
        } else if (activeAutoWaypoints.length > 0) {
          const wp = activeAutoWaypoints[0];
          const dx = wp.x - playerPos.x;
          const dz = wp.z - playerPos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.52) {
            activeAutoWaypoints.shift();
            if (activeAutoWaypoints.length === 0 && autoInspectPending) {
              autoInspectPending = false;
              justPressedInteract = true;
            }
          } else {
            _moveDir.set(dx / dist, 0, dz / dist);
            const walkSpeed = 5.4;
            moveSpeed = walkSpeed;
            animState = 'jog';
            const totalStep = Math.min(dist, walkSpeed * simDt);
            const subSteps = Math.max(1, Math.ceil(totalStep / 0.2));
            const subDist = totalStep / subSteps;
            for (let s = 0; s < subSteps; s++) {
              const nextX = playerPos.x + _moveDir.x * subDist;
              const nextZ = playerPos.z + _moveDir.z * subDist;
              const resolved = resolveCircleAABBCollision(
                nextX,
                nextZ,
                0.42,
                world.colliders,
                world.worldBounds
              );
              playerPos.x = resolved.x;
              playerPos.z = resolved.z;
            }
            playerPos.y = world.groundHeightAt(playerPos.x, playerPos.z);

            const targetYaw = Math.atan2(_moveDir.x, _moveDir.z);
            let diff = targetYaw - playerYaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            playerYaw += diff * (1 - Math.exp(-12 * simDt));

            if (Math.hypot(wp.x - playerPos.x, wp.z - playerPos.z) < 0.52) {
              activeAutoWaypoints.shift();
              if (activeAutoWaypoints.length === 0 && autoInspectPending) {
                autoInspectPending = false;
                justPressedInteract = true;
              }
            }
          }
        }

        // Check indoor/outdoor audio transition
        const insideNow = world.isInsideHouse(playerPos.x, playerPos.z, playerPos.y);
        if (insideNow !== lastInside) {
          lastInside = insideNow;
          onIndoorRef.current(insideNow);
        }

        // Check nearest interactive station within reach
        let nearest: NearbyInteractable | null = null;
        let bestDist = 2.15;

        for (const st of SCROLL_STATIONS) {
          if (curFound.includes(st.id)) continue;
          const d = Math.hypot(playerPos.x - st.worldPos.x, playerPos.z - st.worldPos.z);
          if (d < bestDist && playerPos.y > 0.7) {
            bestDist = d;
            nearest = { kind: 'scroll', id: st.id, label: st.inspectPrompt };
          }
        }

        const kitabDist = Math.hypot(
          playerPos.x - KITAB_STATION.worldPos.x,
          playerPos.z - KITAB_STATION.worldPos.z
        );
        if (!nearest && kitabDist < 2.25 && playerPos.y > 0.7) {
          nearest = {
            kind: 'kitab',
            id: 'kitab',
            label:
              curFound.length >= 5
                ? 'Baca Kitab Warisan'
                : `Kitab Warisan (${curFound.length}/5 Helaian)`,
          };
        }

        const nextKey = nearest ? `${nearest.kind}:${nearest.id}:${nearest.label}` : '';
        if (nextKey !== lastNearbyKey) {
          lastNearbyKey = nextKey;
          onNearbyRef.current(nearest);
        }

        // Trigger interaction via E key OR HUD interact button
        if (interactNonceRef.current !== lastHandledButtonInteractNonce) {
          lastHandledButtonInteractNonce = interactNonceRef.current;
          justPressedInteract = true;
        }
        if (justPressedInteract) {
          justPressedInteract = false;
          if (nearest) {
            triggerInspectEffect(nearest);
            onInspectRef.current(nearest);
          }
        }

        // Camera follow with indoor adaptation & inspection focus
        if (focusTimer > 0) {
          focusTimer -= simDt;
          _desiredCamPos.set(
            THREE.MathUtils.clamp(focusTargetPos.x * 0.6, -4.5, 4.5),
            3.35,
            THREE.MathUtils.clamp(focusTargetPos.z + 3.2, -2.5, 4.6)
          );
          _desiredLook.copy(focusTargetPos);
        } else if (insideNow) {
          // Comfortable interior overhead-angle third-person follow (never clips ceiling or back wall)
          _desiredCamPos.set(
            THREE.MathUtils.clamp(playerPos.x * 0.78, -4.8, 4.8),
            playerPos.y + 3.15,
            THREE.MathUtils.clamp(playerPos.z + 4.3, -1.6, 5.1)
          );
          _desiredLook.set(playerPos.x, playerPos.y + 1.15, playerPos.z - 1.1);
        } else {
          // Scenic outdoor third-person follow
          _desiredCamPos.set(
            THREE.MathUtils.clamp(playerPos.x * 0.85, -18, 18),
            playerPos.y + 3.8,
            THREE.MathUtils.clamp(playerPos.z + 5.8, 4.5, 23.5)
          );
          _desiredLook.set(playerPos.x, playerPos.y + 1.35, playerPos.z - 1.4);
        }

        const camDamp = 1 - Math.exp(-6.5 * simDt);
        camPos.lerp(_desiredCamPos, camDamp);
        camLook.lerp(_desiredLook, camDamp);
      }

      hangTuah.root.position.copy(playerPos);
      hangTuah.root.rotation.y = playerYaw;
      if (curPhase !== 'paused') {
        hangTuah.update(simDt, elapsed, animState, moveSpeed);
        world.updateEnvironment(
          simDt,
          elapsed,
          playerPos,
          curFound,
          curPhase === 'victory',
          lowGraphicsRef.current,
          reduceMotionRef.current
        );
      }

      camera.position.copy(camPos);
      camera.lookAt(camLook);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', clearKeys);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      textures.dispose();
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [joystickVecRef]);

  return (
    <div
      ref={mountRef}
      data-testid="threejs-viewport"
      className="w-full h-full relative overflow-hidden select-none"
    />
  );
};
