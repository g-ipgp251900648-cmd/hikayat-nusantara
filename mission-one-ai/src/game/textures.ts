import * as THREE from 'three';

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function finalizeDataTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export interface NusantaraTextureSet {
  woodFloorColor: THREE.CanvasTexture;
  woodFloorBump: THREE.CanvasTexture;
  woodWallColor: THREE.CanvasTexture;
  rumbiaRoofColor: THREE.CanvasTexture;
  mengkuangMatColor: THREE.CanvasTexture;
  songketColor: THREE.CanvasTexture;
  stonePathColor: THREE.CanvasTexture;
  grassGroundColor: THREE.CanvasTexture;
  parchmentScrollColor: THREE.CanvasTexture;
  kitabCoverColor: THREE.CanvasTexture;
  contactShadowTex: THREE.CanvasTexture;
  dispose: () => void;
}

export function createNusantaraTextures(anisotropy: number): NusantaraTextureSet {
  // 1. Timber Plank Floor (Color + Bump)
  const [wfCanvas, wfCtx] = createCanvas(512, 512);
  const [wbCanvas, wbCtx] = createCanvas(512, 512);
  wfCtx.fillStyle = '#6f4222';
  wfCtx.fillRect(0, 0, 512, 512);
  wbCtx.fillStyle = '#888888';
  wbCtx.fillRect(0, 0, 512, 512);

  const plankCount = 8;
  const plankH = 512 / plankCount;
  for (let i = 0; i < plankCount; i++) {
    const y = i * plankH;
    const toneShift = ((i * 37) % 24) - 12;
    wfCtx.fillStyle = `rgb(${114 + toneShift}, ${68 + Math.floor(toneShift * 0.6)}, ${36 + Math.floor(toneShift * 0.3)})`;
    wfCtx.fillRect(0, y + 2, 512, plankH - 3);
    // Plank seam
    wfCtx.fillStyle = '#311a0b';
    wfCtx.fillRect(0, y, 512, 3);
    wbCtx.fillStyle = '#222222';
    wbCtx.fillRect(0, y, 512, 3);

    // Subtle wood grain lines
    for (let g = 0; g < 18; g++) {
      const gy = y + 5 + ((g * 19) % (plankH - 8));
      wfCtx.strokeStyle = g % 2 === 0 ? 'rgba(55,28,11,0.22)' : 'rgba(155,102,58,0.16)';
      wfCtx.lineWidth = 1.5;
      wfCtx.beginPath();
      wfCtx.moveTo(0, gy);
      wfCtx.bezierCurveTo(170, gy + ((g % 3) - 1) * 4, 340, gy - ((g % 3) - 1) * 4, 512, gy);
      wfCtx.stroke();

      wbCtx.strokeStyle = 'rgba(180,180,180,0.28)';
      wbCtx.lineWidth = 1;
      wbCtx.beginPath();
      wbCtx.moveTo(0, gy);
      wbCtx.lineTo(512, gy);
      wbCtx.stroke();
    }
    // Vertical plank joints
    const jointX = ((i * 193 + 90) % 420) + 45;
    wfCtx.fillStyle = '#311a0b';
    wfCtx.fillRect(jointX, y, 3, plankH);
  }

  // 2. Carved Wood Wall Panels
  const [wwCanvas, wwCtx] = createCanvas(512, 512);
  wwCtx.fillStyle = '#5a3419';
  wwCtx.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) {
    wwCtx.fillStyle = x % 128 === 0 ? '#653b1d' : '#563117';
    wwCtx.fillRect(x + 2, 0, 60, 512);
    wwCtx.fillStyle = '#2d1709';
    wwCtx.fillRect(x, 0, 3, 512);
  }
  // Carved floral border band near top
  wwCtx.strokeStyle = '#c89b3c';
  wwCtx.lineWidth = 4;
  wwCtx.strokeRect(12, 16, 488, 56);
  for (let cx = 40; cx < 490; cx += 48) {
    wwCtx.beginPath();
    wwCtx.arc(cx, 44, 12, 0, Math.PI * 2);
    wwCtx.stroke();
  }

  // 3. Rumbia Thatched Roof
  const [rrCanvas, rrCtx] = createCanvas(512, 512);
  rrCtx.fillStyle = '#6f5534';
  rrCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 16) {
    rrCtx.fillStyle = y % 32 === 0 ? '#5c4427' : '#7b5f3a';
    rrCtx.fillRect(0, y, 512, 14);
    for (let x = 0; x < 512; x += 6) {
      rrCtx.strokeStyle = (x + y) % 12 === 0 ? '#443119' : '#8e7149';
      rrCtx.lineWidth = 2;
      rrCtx.beginPath();
      rrCtx.moveTo(x, y);
      rrCtx.lineTo(x + ((x % 3) - 1) * 2, y + 16);
      rrCtx.stroke();
    }
  }

  // 4. Tikar Mengkuang Woven Mat
  const [tmCanvas, tmCtx] = createCanvas(512, 512);
  tmCtx.fillStyle = '#d9bf83';
  tmCtx.fillRect(0, 0, 512, 512);
  const step = 32;
  for (let y = 0; y < 512; y += step) {
    for (let x = 0; x < 512; x += step) {
      const odd = ((x / step) + (y / step)) % 2 === 0;
      tmCtx.fillStyle = odd ? '#c9a65e' : '#e6cf99';
      tmCtx.fillRect(x + 1, y + 1, step - 2, step - 2);
      if ((x / step) % 4 === 0 && (y / step) % 4 === 0) {
        tmCtx.fillStyle = '#0d5c46';
        tmCtx.beginPath();
        tmCtx.moveTo(x + step / 2, y + 3);
        tmCtx.lineTo(x + step - 3, y + step / 2);
        tmCtx.lineTo(x + step / 2, y + step - 3);
        tmCtx.lineTo(x + 3, y + step / 2);
        tmCtx.closePath();
        tmCtx.fill();
      }
    }
  }
  tmCtx.strokeStyle = '#7c2d12';
  tmCtx.lineWidth = 14;
  tmCtx.strokeRect(10, 10, 492, 492);

  // 5. Emerald & Gold Songket Fabric
  const [skCanvas, skCtx] = createCanvas(256, 256);
  skCtx.fillStyle = '#084c39';
  skCtx.fillRect(0, 0, 256, 256);
  skCtx.strokeStyle = '#d4af37';
  skCtx.lineWidth = 2;
  for (let y = 16; y < 256; y += 32) {
    for (let x = 16; x < 256; x += 32) {
      skCtx.beginPath();
      skCtx.moveTo(x, y - 10);
      skCtx.lineTo(x + 10, y);
      skCtx.lineTo(x, y + 10);
      skCtx.lineTo(x - 10, y);
      skCtx.closePath();
      skCtx.stroke();
      skCtx.fillStyle = '#f3d06b';
      skCtx.fillRect(x - 2, y - 2, 4, 4);
    }
  }

  // 6. Stone Walkway
  const [stCanvas, stCtx] = createCanvas(256, 256);
  stCtx.fillStyle = '#7b7466';
  stCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 28; i++) {
    const sx = (i * 73) % 220 + 16;
    const sy = (i * 119) % 220 + 16;
    stCtx.fillStyle = i % 2 === 0 ? '#978e7d' : '#857d6e';
    stCtx.beginPath();
    stCtx.ellipse(sx, sy, 22, 15, (i % 5) * 0.4, 0, Math.PI * 2);
    stCtx.fill();
  }

  // 7. Kampung Grass Ground (soft organic meadow texture)
  const [grCanvas, grCtx] = createCanvas(512, 512);
  grCtx.fillStyle = '#4c863b';
  grCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1600; i++) {
    const gx = (i * 89 + (i % 7) * 13) % 512;
    const gy = (i * 137 + (i % 5) * 19) % 512;
    grCtx.fillStyle = i % 3 === 0 ? 'rgba(104,166,76,0.38)' : i % 3 === 1 ? 'rgba(60,112,46,0.38)' : 'rgba(130,185,92,0.28)';
    grCtx.beginPath();
    grCtx.arc(gx, gy, 3 + (i % 4), 0, Math.PI * 2);
    grCtx.fill();
  }

  // 8. Parchment Scroll Calligraphy
  const [psCanvas, psCtx] = createCanvas(256, 256);
  psCtx.fillStyle = '#f7e9c6';
  psCtx.fillRect(0, 0, 256, 256);
  psCtx.strokeStyle = '#c89b3c';
  psCtx.lineWidth = 8;
  psCtx.strokeRect(12, 12, 232, 232);
  psCtx.fillStyle = '#4a2e1b';
  for (let line = 0; line < 7; line++) {
    const ly = 48 + line * 24;
    psCtx.fillRect(36, ly, 164 - (line % 3) * 26, 6);
  }

  // 9. Kitab Warisan Cover
  const [kbCanvas, kbCtx] = createCanvas(256, 256);
  kbCtx.fillStyle = '#0a4735';
  kbCtx.fillRect(0, 0, 256, 256);
  kbCtx.strokeStyle = '#e4bf4d';
  kbCtx.lineWidth = 10;
  kbCtx.strokeRect(16, 16, 224, 224);
  kbCtx.lineWidth = 4;
  kbCtx.beginPath();
  kbCtx.arc(128, 128, 48, 0, Math.PI * 2);
  kbCtx.stroke();
  kbCtx.beginPath();
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4;
    kbCtx.moveTo(128 + Math.cos(ang) * 20, 128 + Math.sin(ang) * 20);
    kbCtx.lineTo(128 + Math.cos(ang) * 44, 128 + Math.sin(ang) * 44);
  }
  kbCtx.stroke();

  // 10. Soft Radial Contact Shadow
  const [csCanvas, csCtx] = createCanvas(128, 128);
  const grad = csCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0, 'rgba(15, 10, 5, 0.52)');
  grad.addColorStop(0.55, 'rgba(15, 10, 5, 0.22)');
  grad.addColorStop(1, 'rgba(15, 10, 5, 0.0)');
  csCtx.fillStyle = grad;
  csCtx.fillRect(0, 0, 128, 128);

  const woodFloorColor = finalizeColorTexture(wfCanvas, anisotropy, 4, 4);
  const woodFloorBump = finalizeDataTexture(wbCanvas, anisotropy, 4, 4);
  const woodWallColor = finalizeColorTexture(wwCanvas, anisotropy, 2, 1);
  const rumbiaRoofColor = finalizeColorTexture(rrCanvas, anisotropy, 4, 3);
  const mengkuangMatColor = finalizeColorTexture(tmCanvas, anisotropy, 1, 1);
  const songketColor = finalizeColorTexture(skCanvas, anisotropy, 2, 1);
  const stonePathColor = finalizeColorTexture(stCanvas, anisotropy, 2, 4);
  const grassGroundColor = finalizeColorTexture(grCanvas, anisotropy, 36, 36);
  const parchmentScrollColor = finalizeColorTexture(psCanvas, anisotropy, 1, 1);
  const kitabCoverColor = finalizeColorTexture(kbCanvas, anisotropy, 1, 1);
  const contactShadowTex = finalizeColorTexture(csCanvas, 1, 1, 1);

  return {
    woodFloorColor,
    woodFloorBump,
    woodWallColor,
    rumbiaRoofColor,
    mengkuangMatColor,
    songketColor,
    stonePathColor,
    grassGroundColor,
    parchmentScrollColor,
    kitabCoverColor,
    contactShadowTex,
    dispose: () => {
      woodFloorColor.dispose();
      woodFloorBump.dispose();
      woodWallColor.dispose();
      rumbiaRoofColor.dispose();
      mengkuangMatColor.dispose();
      songketColor.dispose();
      stonePathColor.dispose();
      grassGroundColor.dispose();
      parchmentScrollColor.dispose();
      kitabCoverColor.dispose();
      contactShadowTex.dispose();
    },
  };
}
