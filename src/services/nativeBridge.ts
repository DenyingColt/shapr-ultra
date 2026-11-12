/**
 * Native Haptics & Android Share Sheet / File System Bridge
 * Provides hardware micro-pulses (8ms-15ms) via Web Vibration API & Capacitor Haptics
 * and native mobile file sharing via Web Share API Level 2 with automatic download fallback.
 */

export type HapticPulseType = 'snap' | 'angle' | 'boolean' | 'commit' | 'radial' | 'warning';

const PULSE_PATTERNS: Record<HapticPulseType, number | number[]> = {
  snap: 8,
  angle: 12,
  boolean: [10, 25, 14],
  commit: 15,
  radial: 10,
  warning: [18, 30, 18],
};

let lastHapticTimestamp = 0;

export function triggerHapticPulse(type: HapticPulseType = 'snap'): void {
  const now = performance.now();
  // Throttle rapid snap pulses to avoid motor saturation during fast stylus drags
  if (type === 'snap' && now - lastHapticTimestamp < 40) {
    return;
  }
  lastHapticTimestamp = now;

  try {
    // 1. Check Capacitor Native Haptics plugin if running inside Android APK/AAB wrapper
    const capHaptics = (
      window as unknown as {
        Capacitor?: {
          Plugins?: {
            Haptics?: {
              impact?: (opts: { style: string }) => Promise<void>;
              vibrate?: (opts: { duration: number }) => Promise<void>;
            };
          };
        };
      }
    ).Capacitor?.Plugins?.Haptics;

    if (capHaptics?.vibrate) {
      const pattern = PULSE_PATTERNS[type];
      const duration = Array.isArray(pattern) ? pattern[0] : pattern;
      void capHaptics.vibrate({ duration });
      return;
    }

    // 2. Standard Web Vibration API (supported on Android Chrome / WebView)
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(PULSE_PATTERNS[type]);
    }
  } catch {
    // Ignore on desktop browsers that restrict vibration without user gesture
  }
}

/**
 * Shares a CAD file (.STL, .OBJ, .SCAD, .SVG, .SHAPRX) using the native Android Share Sheet
 * if supported and requested, otherwise triggers a direct device download.
 */
export async function shareOrDownloadCADFile(
  filename: string,
  content: string | ArrayBuffer,
  mimeType = 'application/octet-stream',
  preferNativeShare = false
): Promise<void> {
  triggerHapticPulse('commit');
  const blob = new Blob([content], { type: mimeType });

  if (
    preferNativeShare &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  ) {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: filename,
          text: `SHAPR-PRO 3D CAD Dışa Aktarımı: ${filename}`,
          files: [file],
        });
        return;
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
    }
  }

  // Fallback to standard browser / WebView file download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Captures a compact WebP thumbnail data URL from the active WebGL 3D canvas
 * for the Project Studio Dashboard cards.
 */
export function captureViewportThumbnail(): string {
  try {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return generateFallbackSVGThumbnail('3D CAD Model');

    // Downscale to 360x220 for crisp, lightweight IndexedDB storage
    const offscreen = document.createElement('canvas');
    offscreen.width = 360;
    offscreen.height = 220;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return generateFallbackSVGThumbnail('3D CAD Model');

    ctx.fillStyle = '#0B0D11';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
    return offscreen.toDataURL('image/webp', 0.82);
  } catch {
    return generateFallbackSVGThumbnail('3D CAD Model');
  }
}

export function generateFallbackSVGThumbnail(label: string, accent = '#38bdf8'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220" width="360" height="220">
    <rect width="360" height="220" fill="#0B0D11"/>
    <g stroke="#1e293b" stroke-width="1">
      <line x1="0" y1="55" x2="360" y2="55"/><line x1="0" y1="110" x2="360" y2="110"/><line x1="0" y1="165" x2="360" y2="165"/>
      <line x1="90" y1="0" x2="90" y2="220"/><line x1="180" y1="0" x2="180" y2="220"/><line x1="270" y1="0" x2="270" y2="220"/>
    </g>
    <polygon points="180,38 258,82 258,158 180,196 102,158 102,82" fill="${accent}22" stroke="${accent}" stroke-width="2.5"/>
    <polyline points="102,82 180,122 258,82" fill="none" stroke="${accent}" stroke-width="2"/>
    <line x1="180" y1="122" x2="180" y2="196" stroke="#facc15" stroke-width="2"/>
    <text x="180" y="212" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="11">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
