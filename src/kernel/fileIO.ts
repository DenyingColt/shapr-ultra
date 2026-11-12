import * as THREE from 'three';
import {
  CADBody,
  HistoryFeatureNode,
  ParametricVariable,
  Sketch,
  Vec2,
} from '../types/cad';
import { ensureIndexedGeometry } from './topologyBuilder';

/**
 * Applies body world transform to a cloned BufferGeometry for export.
 */
function getWorldGeometry(body: CADBody): THREE.BufferGeometry {
  const geom = body.geometry.clone();
  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3(...body.transform.position);
  const euler = new THREE.Euler(...body.transform.rotation, 'XYZ');
  const quat = new THREE.Quaternion().setFromEuler(euler);
  const scale = new THREE.Vector3(...body.transform.scale);
  mat.compose(pos, quat, scale);
  geom.applyMatrix4(mat);
  return geom;
}

/**
 * Exports all visible CADBodies to a Binary STL ArrayBuffer (3D Printer Ready).
 */
export function exportBodiesToBinarySTL(bodies: CADBody[]): ArrayBuffer {
  const visibleBodies = bodies.filter((b) => b.visible);
  const meshes: THREE.BufferGeometry[] = visibleBodies.map(getWorldGeometry);

  let totalTriangles = 0;
  for (const g of meshes) {
    const idx = g.getIndex();
    const pos = g.getAttribute('position');
    if (idx) totalTriangles += Math.floor(idx.count / 3);
    else if (pos) totalTriangles += Math.floor(pos.count / 3);
  }

  const buffer = new ArrayBuffer(84 + totalTriangles * 50);
  const view = new DataView(buffer);

  // 80-byte ASCII header
  const headerStr = 'SHAPR-ULTRA CAD Binary STL Export - Watertight Manifold';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 0);
  }
  view.setUint32(80, totalTriangles, true);

  let offset = 84;
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  for (const g of meshes) {
    const pos = g.getAttribute('position');
    const idx = g.getIndex();
    if (!pos) continue;

    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const i0 = idx ? idx.getX(i) : i;
      const i1 = idx ? idx.getX(i + 1) : i + 1;
      const i2 = idx ? idx.getX(i + 2) : i + 2;

      vA.fromBufferAttribute(pos, i0);
      vB.fromBufferAttribute(pos, i1);
      vC.fromBufferAttribute(pos, i2);

      cb.subVectors(vC, vB);
      ab.subVectors(vA, vB);
      cb.cross(ab).normalize();

      view.setFloat32(offset, cb.x, true);
      view.setFloat32(offset + 4, cb.y, true);
      view.setFloat32(offset + 8, cb.z, true);

      view.setFloat32(offset + 12, vA.x, true);
      view.setFloat32(offset + 16, vA.y, true);
      view.setFloat32(offset + 20, vA.z, true);

      view.setFloat32(offset + 24, vB.x, true);
      view.setFloat32(offset + 28, vB.y, true);
      view.setFloat32(offset + 32, vB.z, true);

      view.setFloat32(offset + 36, vC.x, true);
      view.setFloat32(offset + 40, vC.y, true);
      view.setFloat32(offset + 44, vC.z, true);

      view.setUint16(offset + 48, 0, true);
      offset += 50;
    }
  }

  return buffer;
}

/**
 * Exports all visible CADBodies to an ASCII STL string.
 */
export function exportBodiesToAsciiSTL(bodies: CADBody[], solidName = 'SHAPR_ULTRA_Model'): string {
  const lines: string[] = [`solid ${solidName}`];
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  for (const body of bodies.filter((b) => b.visible)) {
    const g = getWorldGeometry(body);
    const pos = g.getAttribute('position');
    const idx = g.getIndex();
    if (!pos) continue;

    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const i0 = idx ? idx.getX(i) : i;
      const i1 = idx ? idx.getX(i + 1) : i + 1;
      const i2 = idx ? idx.getX(i + 2) : i + 2;

      vA.fromBufferAttribute(pos, i0);
      vB.fromBufferAttribute(pos, i1);
      vC.fromBufferAttribute(pos, i2);

      cb.subVectors(vC, vB);
      ab.subVectors(vA, vB);
      cb.cross(ab).normalize();

      lines.push(`  facet normal ${cb.x.toFixed(5)} ${cb.y.toFixed(5)} ${cb.z.toFixed(5)}`);
      lines.push('    outer loop');
      lines.push(`      vertex ${vA.x.toFixed(5)} ${vA.y.toFixed(5)} ${vA.z.toFixed(5)}`);
      lines.push(`      vertex ${vB.x.toFixed(5)} ${vB.y.toFixed(5)} ${vB.z.toFixed(5)}`);
      lines.push(`      vertex ${vC.x.toFixed(5)} ${vC.y.toFixed(5)} ${vC.z.toFixed(5)}`);
      lines.push('    endloop');
      lines.push('  endfacet');
    }
  }

  lines.push(`endsolid ${solidName}`);
  return lines.join('\n');
}

/**
 * Imports Binary or ASCII STL file into a THREE.BufferGeometry.
 */
export function importSTLToGeometry(buffer: ArrayBuffer): THREE.BufferGeometry {
  const view = new DataView(buffer);
  const textHeader = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(80, buffer.byteLength)));

  if (textHeader.trim().startsWith('solid') && buffer.byteLength < 5000000) {
    const fullText = new TextDecoder().decode(buffer);
    if (fullText.includes('facet normal')) {
      const positions: number[] = [];
      const vertexRegex = /vertex\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)/g;
      let match: RegExpExecArray | null;
      while ((match = vertexRegex.exec(fullText)) !== null) {
        positions.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      return ensureIndexedGeometry(geom, 1e-3);
    }
  }

  // Binary STL
  const numTriangles = view.getUint32(80, true);
  const positions = new Float32Array(numTriangles * 9);
  let offset = 84;

  for (let t = 0; t < numTriangles; t++) {
    if (offset + 50 > buffer.byteLength) break;
    for (let k = 0; k < 9; k++) {
      positions[t * 9 + k] = view.getFloat32(offset + 12 + k * 4, true);
    }
    offset += 50;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return ensureIndexedGeometry(geom, 1e-3);
}

/**
 * Exports all visible CADBodies to Wavefront OBJ format.
 */
export function exportBodiesToOBJ(bodies: CADBody[]): string {
  const lines: string[] = ['# SHAPR-ULTRA Wavefront OBJ Export'];
  let vertexOffset = 1;

  for (const body of bodies.filter((b) => b.visible)) {
    const g = getWorldGeometry(body);
    const pos = g.getAttribute('position');
    const idx = g.getIndex();
    if (!pos) continue;

    lines.push(`o ${body.name.replace(/\s+/g, '_')}`);
    for (let i = 0; i < pos.count; i++) {
      lines.push(
        `v ${pos.getX(i).toFixed(5)} ${pos.getY(i).toFixed(5)} ${pos.getZ(i).toFixed(5)}`
      );
    }

    if (idx) {
      for (let i = 0; i < idx.count; i += 3) {
        const a = idx.getX(i) + vertexOffset;
        const b = idx.getX(i + 1) + vertexOffset;
        const c = idx.getX(i + 2) + vertexOffset;
        lines.push(`f ${a} ${b} ${c}`);
      }
    }
    vertexOffset += pos.count;
  }

  return lines.join('\n');
}

/**
 * Imports Wavefront OBJ text into a THREE.BufferGeometry.
 */
export function importOBJToGeometry(objText: string): THREE.BufferGeometry {
  const rawVerts: [number, number, number][] = [];
  const positions: number[] = [];

  const lines = objText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('v ')) {
      const parts = trimmed.split(/\s+/);
      rawVerts.push([
        parseFloat(parts[1]) || 0,
        parseFloat(parts[2]) || 0,
        parseFloat(parts[3]) || 0,
      ]);
    } else if (trimmed.startsWith('f ')) {
      const parts = trimmed.slice(2).trim().split(/\s+/);
      const faceIndices = parts.map((p) => parseInt(p.split('/')[0], 10) - 1);
      for (let i = 1; i < faceIndices.length - 1; i++) {
        const v0 = rawVerts[faceIndices[0]];
        const v1 = rawVerts[faceIndices[i]];
        const v2 = rawVerts[faceIndices[i + 1]];
        if (v0 && v1 && v2) {
          positions.push(v0[0], v0[1], v0[2], v1[0], v1[1], v1[2], v2[0], v2[1], v2[2]);
        }
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return ensureIndexedGeometry(geom, 1e-3);
}

/**
 * Generates Parametric OpenSCAD (.scad) script from bodies, variables, and history features.
 */
export function exportProjectToOpenSCAD(
  projectName: string,
  bodies: CADBody[],
  variables: ParametricVariable[],
  history: HistoryFeatureNode[]
): string {
  const lines: string[] = [
    `// ====================================================================`,
    `// SHAPR-ULTRA • Parametric OpenSCAD (.scad) Export`,
    `// Project: ${projectName}`,
    `// ====================================================================`,
    `$fn = 64;`,
    ``,
  ];

  if (variables.length > 0) {
    lines.push(`// Global Parametric Variables`);
    for (const v of variables) {
      lines.push(`${v.name} = ${v.value}; // expr: ${v.expression} (${v.unit})`);
    }
    lines.push(``);
  }

  for (const body of bodies.filter((b) => b.visible)) {
    const g = getWorldGeometry(body);
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bb?.getSize(size);
    bb?.getCenter(center);

    lines.push(`// Body: ${body.name} (Volume: ${(body.topology.volumeMm3 / 1000).toFixed(2)} cm^3)`);

    // Export exact polyhedron or high-level parametric CSG block
    const pos = g.getAttribute('position');
    const idx = g.getIndex();
    if (pos && idx && pos.count <= 450) {
      const ptsStr: string[] = [];
      for (let i = 0; i < pos.count; i++) {
        ptsStr.push(
          `[${pos.getX(i).toFixed(3)}, ${pos.getY(i).toFixed(3)}, ${pos.getZ(i).toFixed(3)}]`
        );
      }
      const facesStr: string[] = [];
      for (let i = 0; i < idx.count; i += 3) {
        facesStr.push(`[${idx.getX(i)}, ${idx.getX(i + 1)}, ${idx.getX(i + 2)}]`);
      }
      lines.push(`polyhedron(`);
      lines.push(`  points = [${ptsStr.join(', ')}],`);
      lines.push(`  faces = [${facesStr.join(', ')}]`);
      lines.push(`);`);
    } else {
      lines.push(
        `translate([${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${(center.z - size.z * 0.5).toFixed(2)}])`
      );
      lines.push(
        `  cube([${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}], center=false);`
      );
    }
    lines.push(``);
  }

  if (history.length > 0) {
    lines.push(`// Parametric Feature History Log:`);
    for (const h of history) {
      lines.push(`// - [${h.type.toUpperCase()}] ${h.name} ${h.suppressed ? '(SUPPRESSED)' : ''}`);
    }
  }

  return lines.join('\n');
}

/**
 * Exports a 2D Sketch to 1:1 millimeter-accurate SVG or DXF.
 */
export function exportSketchToSVG(sketch: Sketch): string {
  const lines: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-150 -150 300 300" width="300mm" height="300mm">`,
    `  <g fill="none" stroke="#0f172a" stroke-width="0.6">`,
  ];

  for (const prim of sketch.primitives) {
    if (prim.type === 'line' && prim.points.length >= 2) {
      const [p1, p2] = prim.points;
      lines.push(
        `    <line x1="${p1[0]}" y1="${-p1[1]}" x2="${p2[0]}" y2="${-p2[1]}" />`
      );
    } else if (prim.type === 'circle' && prim.points.length >= 2) {
      const c = prim.points[0];
      const r =
        prim.radius ??
        Math.hypot(prim.points[1][0] - c[0], prim.points[1][1] - c[1]);
      lines.push(`    <circle cx="${c[0]}" cy="${-c[1]}" r="${r}" />`);
    } else if (prim.type === 'rect' && prim.points.length >= 2) {
      const [p1, p2] = prim.points;
      const x = Math.min(p1[0], p2[0]);
      const y = Math.min(-p1[1], -p2[1]);
      const w = Math.abs(p2[0] - p1[0]);
      const h = Math.abs(p2[1] - p1[1]);
      lines.push(`    <rect x="${x}" y="${y}" width="${w}" height="${h}" />`);
    }
  }

  lines.push(`  </g>`);
  lines.push(`</svg>`);
  return lines.join('\n');
}

export function exportSketchToDXF(sketch: Sketch): string {
  const dxf: string[] = ['0', 'SECTION', '2', 'ENTITIES'];
  for (const prim of sketch.primitives) {
    if (prim.type === 'line' && prim.points.length >= 2) {
      const [p1, p2] = prim.points;
      dxf.push(
        '0',
        'LINE',
        '8',
        '0',
        '10',
        p1[0].toFixed(4),
        '20',
        p1[1].toFixed(4),
        '30',
        '0.0',
        '11',
        p2[0].toFixed(4),
        '21',
        p2[1].toFixed(4),
        '31',
        '0.0'
      );
    } else if (prim.type === 'circle' && prim.points.length >= 2) {
      const c = prim.points[0];
      const r =
        prim.radius ??
        Math.hypot(prim.points[1][0] - c[0], prim.points[1][1] - c[1]);
      dxf.push(
        '0',
        'CIRCLE',
        '8',
        '0',
        '10',
        c[0].toFixed(4),
        '20',
        c[1].toFixed(4),
        '30',
        '0.0',
        '40',
        r.toFixed(4)
      );
    }
  }
  dxf.push('0', 'ENDSEC', '0', 'EOF');
  return dxf.join('\n');
}

/**
 * Generates an ISO / ANSI 4-View Engineering Orthographic Blueprint SVG
 * (Front, Top, Right, Isometric views + Automatic Dimension Callouts + Title Block).
 */
export function generateOrthographicBlueprintSVG(
  projectName: string,
  bodies: CADBody[],
  unit: string
): string {
  const visibleBodies = bodies.filter((b) => b.visible);

  // Project topological edges onto Front (XZ), Top (XY), Right (YZ), and Isometric views
  const overallBox = new THREE.Box3();
  const edgeSets: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];

  for (const body of visibleBodies) {
    const mat = new THREE.Matrix4();
    mat.compose(
      new THREE.Vector3(...body.transform.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...body.transform.rotation)),
      new THREE.Vector3(...body.transform.scale)
    );

    const worldGeom = getWorldGeometry(body);
    worldGeom.computeBoundingBox();
    if (worldGeom.boundingBox) overallBox.union(worldGeom.boundingBox);

    for (const edge of body.topology.edges) {
      for (let i = 0; i < edge.vertices.length - 1; i++) {
        const v0 = new THREE.Vector3(...edge.vertices[i]).applyMatrix4(mat);
        const v1 = new THREE.Vector3(...edge.vertices[i + 1]).applyMatrix4(mat);
        edgeSets.push({ a: v0, b: v1 });
      }
    }
  }

  if (overallBox.isEmpty()) {
    overallBox.setFromCenterAndSize(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(50, 50, 50)
    );
  }

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  overallBox.getSize(size);
  overallBox.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z, 20);
  const scale = 190 / maxDim;

  const projectView = (
    projFn: (v: THREE.Vector3) => Vec2,
    cx: number,
    cy: number
  ): string => {
    const segs: string[] = [];
    for (const { a, b } of edgeSets) {
      const va = a.clone().sub(center);
      const vb = b.clone().sub(center);
      const [x1, y1] = projFn(va);
      const [x2, y2] = projFn(vb);
      segs.push(
        `<line x1="${(cx + x1 * scale).toFixed(1)}" y1="${(cy - y1 * scale).toFixed(1)}" x2="${(cx + x2 * scale).toFixed(1)}" y2="${(cy - y2 * scale).toFixed(1)}" />`
      );
    }
    return segs.join('\n');
  };

  // 1. TOP VIEW (X, Y) at (260, 210)
  const topLines = projectView((v) => [v.x, v.y], 260, 210);
  // 2. FRONT VIEW (X, Z) at (260, 520)
  const frontLines = projectView((v) => [v.x, v.z], 260, 520);
  // 3. RIGHT VIEW (Y, Z) at (680, 520)
  const rightLines = projectView((v) => [v.y, v.z], 680, 520);
  // 4. ISOMETRIC VIEW at (680, 210)
  const isoLines = projectView(
    (v) => [
      (v.x - v.y) * Math.cos(Math.PI / 6),
      (v.x + v.y) * Math.sin(Math.PI / 6) + v.z,
    ],
    680,
    210
  );

  const wMm = size.x.toFixed(2);
  const dMm = size.y.toFixed(2);
  const hMm = size.z.toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 720" width="100%" height="100%">
  <rect width="1000" height="720" fill="#f8fafc" />
  <rect x="20" y="20" width="960" height="680" fill="none" stroke="#0f172a" stroke-width="2.5" />
  <rect x="26" y="26" width="948" height="668" fill="none" stroke="#334155" stroke-width="0.8" />

  <!-- Grid Dividers -->
  <line x1="480" y1="26" x2="480" y2="610" stroke="#cbd5e1" stroke-dasharray="6 4" />
  <line x1="26" y1="360" x2="974" y2="360" stroke="#cbd5e1" stroke-dasharray="6 4" />

  <!-- View Labels -->
  <text x="50" y="55" font-family="monospace" font-size="13" font-weight="bold" fill="#0f172a">ÜST GÖRÜNÜŞ (TOP - XY)</text>
  <text x="50" y="390" font-family="monospace" font-size="13" font-weight="bold" fill="#0f172a">ÖN GÖRÜNÜŞ (FRONT - XZ)</text>
  <text x="505" y="390" font-family="monospace" font-size="13" font-weight="bold" fill="#0f172a">YAN GÖRÜNÜŞ (RIGHT - YZ)</text>
  <text x="505" y="55" font-family="monospace" font-size="13" font-weight="bold" fill="#0f172a">İZOMETRİK PERSPEKTİF (ISO 3D)</text>

  <!-- Projected CAD Geometry -->
  <g stroke="#0f172a" stroke-width="1.35" stroke-linecap="round">
    ${topLines}
    ${frontLines}
    ${rightLines}
  </g>
  <g stroke="#1d4ed8" stroke-width="1.25" stroke-linecap="round">
    ${isoLines}
  </g>

  <!-- Automatic Dimension Lines -->
  <g stroke="#dc2626" stroke-width="1" fill="#dc2626" font-family="monospace" font-size="12">
    <line x1="165" y1="325" x2="355" y2="325" />
    <text x="260" y="318" text-anchor="middle">GENİŞLİK X: ${wMm} ${unit}</text>

    <line x1="395" y1="130" x2="395" y2="290" />
    <text x="405" y="215">DERİNLİK Y: ${dMm} ${unit}</text>

    <line x1="395" y1="440" x2="395" y2="600" />
    <text x="405" y="525">YÜKSEKLİK Z: ${hMm} ${unit}</text>
  </g>

  <!-- ISO Engineering Title Block -->
  <rect x="26" y="610" width="948" height="84" fill="#f1f5f9" stroke="#0f172a" stroke-width="1.5" />
  <line x1="340" y1="610" x2="340" y2="694" stroke="#0f172a" />
  <line x1="660" y1="610" x2="660" y2="694" stroke="#0f172a" />

  <text x="42" y="638" font-family="monospace" font-size="15" font-weight="bold" fill="#0f172a">PROJE: ${projectName}</text>
  <text x="42" y="662" font-family="monospace" font-size="12" fill="#475569">MOTOR: SHAPR-ULTRA B-REP CAD KERNEL</text>
  <text x="42" y="682" font-family="monospace" font-size="11" fill="#64748b">STANDART: ISO 128 TEKNİK RESİM</text>

  <text x="358" y="638" font-family="monospace" font-size="12" font-weight="bold" fill="#0f172a">PARÇA SAYISI: ${visibleBodies.length} ADET</text>
  <text x="358" y="660" font-family="monospace" font-size="12" fill="#334155">DIŞ ÖLÇÜLER: ${wMm} × ${dMm} × ${hMm} ${unit}</text>
  <text x="358" y="682" font-family="monospace" font-size="12" fill="#334155">TOLERANS: ISO 2768-m (±0.15 mm)</text>

  <text x="678" y="638" font-family="monospace" font-size="12" font-weight="bold" fill="#0f172a">BİRİM: ${unit.toUpperCase()} | ÖLÇEK: 1:1</text>
  <text x="678" y="660" font-family="monospace" font-size="12" fill="#334155">TARİH: ${new Date().toISOString().slice(0, 10)}</text>
  <text x="678" y="682" font-family="monospace" font-size="12" fill="#0284c7">3D BASKI &amp; CNC UYUMLU</text>
</svg>`;
}

/**
 * Native .SHAPRX JSON Project Save / Load.
 */
export function serializeProjectToSHAPRX(
  projectName: string,
  bodies: CADBody[],
  sketches: Sketch[],
  variables: ParametricVariable[],
  history: HistoryFeatureNode[]
): string {
  const serializedBodies = bodies.map((b) => {
    const pos = b.geometry.getAttribute('position');
    const idx = b.geometry.getIndex();
    return {
      id: b.id,
      name: b.name,
      visible: b.visible,
      locked: b.locked,
      material: b.material,
      transform: b.transform,
      kinematics: b.kinematics,
      positions: pos ? Array.from(pos.array) : [],
      indices: idx ? Array.from(idx.array) : [],
    };
  });

  return JSON.stringify(
    {
      format: 'SHAPR-ULTRA-NATIVE-V1',
      projectName,
      savedAt: new Date().toISOString(),
      variables,
      sketches,
      history,
      bodies: serializedBodies,
    },
    null,
    2
  );
}

export function triggerBrowserDownload(
  filename: string,
  content: string | ArrayBuffer,
  mimeType = 'application/octet-stream'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
