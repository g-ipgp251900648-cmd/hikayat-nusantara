import * as THREE from 'three';

export function createWauBatikTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base emerald & cream woven silk gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#047857');
  grad.addColorStop(0.5, '#065f46');
  grad.addColorStop(1, '#0284c7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Diagonal cream & sky-blue wing band accents
  ctx.fillStyle = '#faf4e4';
  ctx.beginPath();
  ctx.moveTo(0, 180);
  ctx.quadraticCurveTo(256, 120, 512, 180);
  ctx.lineTo(512, 235);
  ctx.quadraticCurveTo(256, 175, 0, 235);
  ctx.closePath();
  ctx.fill();

  // Soft coral-red floral band
  ctx.fillStyle = '#e11d48';
  ctx.beginPath();
  ctx.moveTo(0, 235);
  ctx.quadraticCurveTo(256, 185, 512, 235);
  ctx.lineTo(512, 265);
  ctx.quadraticCurveTo(256, 215, 0, 265);
  ctx.closePath();
  ctx.fill();

  // Golden Awan Larat swirling vine motifs
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 6;
  for (let i = 0; i < 8; i++) {
    const x = 32 + i * 64;
    ctx.beginPath();
    ctx.arc(x, 125, 22, 0, Math.PI * 1.45);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, 345, 24, Math.PI * 0.4, Math.PI * 1.9);
    ctx.stroke();
  }

  // Bunga Raya / Hibiscus stylized rosettes
  const drawRosette = (cx: number, cy: number, r: number, color: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    for (let p = 0; p < 5; p++) {
      ctx.rotate((Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.55, r * 0.34, r * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawRosette(128, 205, 28, '#e11d48');
  drawRosette(384, 205, 28, '#e11d48');
  drawRosette(256, 295, 34, '#f59e0b');

  // Crescent & star center motif
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(256, 408, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#065f46';
  ctx.beginPath();
  ctx.arc(268, 400, 30, 0, Math.PI * 2);
  ctx.fill();

  // Fine gold border trim
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 496);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createSongketTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle silk weave lines
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let y = 0; y < 256; y += 4) {
    ctx.fillRect(0, y, 256, 1);
  }

  // Gold songket diamond motif (pucuk rebung & bunga tabur)
  ctx.strokeStyle = '#f59e0b';
  ctx.fillStyle = '#fbbf24';
  ctx.lineWidth = 2;

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const cx = col * 64 + 32;
      const cy = row * 64 + 32;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 16);
      ctx.lineTo(cx + 16, cy);
      ctx.lineTo(cx, cy + 16);
      ctx.lineTo(cx - 16, cy);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Bottom border pucuk rebung triangles
  ctx.fillStyle = '#d97706';
  for (let x = 0; x < 256; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 256);
    ctx.lineTo(x + 16, 224);
    ctx.lineTo(x + 32, 256);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createTimberPlankTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#6f4222';
  ctx.fillRect(0, 0, 256, 256);

  for (let p = 0; p < 8; p++) {
    const y = p * 32;
    ctx.fillStyle = p % 2 === 0 ? '#784826' : '#653b1e';
    ctx.fillRect(0, y, 256, 30);
    ctx.fillStyle = '#472813';
    ctx.fillRect(0, y + 30, 256, 2);

    ctx.strokeStyle = 'rgba(42, 22, 8, 0.25)';
    ctx.lineWidth = 1.2;
    for (let g = 0; g < 5; g++) {
      ctx.beginPath();
      ctx.moveTo(0, y + 5 + g * 5);
      ctx.bezierCurveTo(85, y + 3 + g * 5, 170, y + 8 + g * 5, 256, y + 5 + g * 5);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createMengkuangMatTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#dfc896';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 16) {
    for (let x = 0; x < 256; x += 16) {
      const alt = ((x + y) / 16) % 2 === 0;
      ctx.fillStyle = alt ? '#c9ad72' : '#ebd8ab';
      ctx.fillRect(x + 1, y + 1, 14, 14);
      if (alt && (x / 16) % 4 === 0 && (y / 16) % 4 === 0) {
        ctx.fillStyle = '#065f46';
        ctx.fillRect(x + 4, y + 4, 8, 8);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createSoftShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(20, 14, 8, 0.55)');
  grad.addColorStop(0.6, 'rgba(20, 14, 8, 0.22)');
  grad.addColorStop(1, 'rgba(20, 14, 8, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
