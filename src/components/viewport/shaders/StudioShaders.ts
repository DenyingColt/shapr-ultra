import * as THREE from 'three';

let cachedStudioMatcap: THREE.CanvasTexture | null = null;
let cachedSectionHatch: THREE.CanvasTexture | null = null;

/**
 * Generates a high-contrast Studio Ceramic/Metallic Matcap texture procedurally
 * in memory so mobile/tablet GPUs render crisp specular highlights at 120 FPS
 * with zero external network dependencies.
 */
export function getStudioMatcapTexture(): THREE.CanvasTexture {
  if (cachedStudioMatcap) return cachedStudioMatcap;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base spherical studio lighting gradient
  const r = size * 0.5;
  const grad = ctx.createRadialGradient(
    r * 0.72,
    r * 0.65,
    r * 0.08,
    r,
    r,
    r
  );
  grad.addColorStop(0.0, '#ffffff');
  grad.addColorStop(0.18, '#e2e8f0');
  grad.addColorStop(0.52, '#64748b');
  grad.addColorStop(0.84, '#1e293b');
  grad.addColorStop(1.0, '#090d16');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle rim reflection arc at bottom-right
  const rimGrad = ctx.createRadialGradient(
    r * 1.35,
    r * 1.4,
    r * 0.05,
    r * 1.2,
    r * 1.2,
    r * 0.6
  );
  rimGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
  rimGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
  ctx.fillStyle = rimGrad;
  ctx.fillRect(0, 0, size, size);

  cachedStudioMatcap = new THREE.CanvasTexture(canvas);
  cachedStudioMatcap.needsUpdate = true;
  return cachedStudioMatcap;
}

/**
 * Generates a 45-degree engineering cross-hatch texture for active Section View planes.
 */
export function getSectionHatchTexture(): THREE.CanvasTexture {
  if (cachedSectionHatch) return cachedSectionHatch;

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(size, 0);
  ctx.moveTo(-size * 0.5, size);
  ctx.lineTo(size, -size * 0.5);
  ctx.moveTo(0, size * 1.5);
  ctx.lineTo(size * 1.5, 0);
  ctx.stroke();

  cachedSectionHatch = new THREE.CanvasTexture(canvas);
  cachedSectionHatch.wrapS = THREE.RepeatWrapping;
  cachedSectionHatch.wrapT = THREE.RepeatWrapping;
  cachedSectionHatch.repeat.set(14, 14);
  cachedSectionHatch.needsUpdate = true;
  return cachedSectionHatch;
}
