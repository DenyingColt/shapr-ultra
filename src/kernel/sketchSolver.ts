import earcut from 'earcut';
import { v4 as uuidv4 } from 'uuid';
import {
  ClosedProfileLoop,
  ParametricVariable,
  Sketch,
  SketchConstraint,
  SketchPrimitive,
  Vec2,
} from '../types/cad';
import { evaluateParametricExpression } from './mathParser';

// ============================================================================
// 1. SMART PEN FREEHAND STROKE ANALYZER
// ============================================================================

export function analyzeSmartPenStroke(points: Vec2[]): SketchPrimitive | null {
  if (points.length < 2) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const directDist = Math.hypot(last[0] - first[0], last[1] - first[1]);

  let pathLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    pathLen += Math.hypot(
      points[i + 1][0] - points[i][0],
      points[i + 1][1] - points[i][1]
    );
  }
  if (pathLen < 1.5) return null;

  const isClosed = directDist < Math.max(8, pathLen * 0.18);

  if (!isClosed) {
    // Check if straight line
    let maxDev = 0;
    const dx = last[0] - first[0];
    const dy = last[1] - first[1];
    const len = Math.hypot(dx, dy) || 1;
    for (const pt of points) {
      const dev =
        Math.abs(dy * pt[0] - dx * pt[1] + last[0] * first[1] - last[1] * first[0]) / len;
      if (dev > maxDev) maxDev = dev;
    }

    if (maxDev < pathLen * 0.07) {
      // Snap horizontal / vertical if within 6 degrees
      let x2 = last[0];
      let y2 = last[1];
      const angle = Math.atan2(Math.abs(y2 - first[1]), Math.abs(x2 - first[0]));
      if (angle < (6 * Math.PI) / 180) y2 = first[1];
      if (angle > (84 * Math.PI) / 180) x2 = first[0];

      return {
        id: uuidv4(),
        type: 'line',
        points: [
          [roundSnap(first[0]), roundSnap(first[1])],
          [roundSnap(x2), roundSnap(y2)],
        ],
        isConstruction: false,
        status: 'under',
      };
    }

    // Otherwise 3-point tangent arc
    const mid = points[Math.floor(points.length / 2)];
    return {
      id: uuidv4(),
      type: 'arc',
      points: [
        [roundSnap(first[0]), roundSnap(first[1])],
        [roundSnap(mid[0]), roundSnap(mid[1])],
        [roundSnap(last[0]), roundSnap(last[1])],
      ],
      isConstruction: false,
      status: 'under',
    };
  }

  // Closed stroke: check if Circle vs Rectangle
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  let cx = 0,
    cy = 0;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    cx += x;
    cy += y;
  }
  cx /= points.length;
  cy /= points.length;

  const dists = points.map(([x, y]) => Math.hypot(x - cx, y - cy));
  const meanR = dists.reduce((a, b) => a + b, 0) / dists.length;
  const stdDevR = Math.sqrt(
    dists.reduce((acc, d) => acc + (d - meanR) ** 2, 0) / dists.length
  );

  if (stdDevR / (meanR || 1) < 0.14) {
    const r = roundSnap(meanR);
    const rcx = roundSnap(cx);
    const rcy = roundSnap(cy);
    return {
      id: uuidv4(),
      type: 'circle',
      points: [
        [rcx, rcy],
        [rcx + r, rcy],
      ],
      radius: r,
      isConstruction: false,
      status: 'under',
    };
  }

  // Convert to axis-aligned Rectangle
  return {
    id: uuidv4(),
    type: 'rect',
    points: [
      [roundSnap(minX), roundSnap(minY)],
      [roundSnap(maxX), roundSnap(maxY)],
    ],
    isConstruction: false,
    status: 'under',
  };
}

function roundSnap(v: number, step = 1): number {
  return Math.round(v / step) * step;
}

// ============================================================================
// 2. CURVE-CURVE INTERSECTION & MATHEMATICAL TRIM ENGINE
// ============================================================================

export function lineLineIntersection(
  a1: Vec2,
  a2: Vec2,
  b1: Vec2,
  b2: Vec2
): { pt: Vec2; tA: number; tB: number } | null {
  const dax = a2[0] - a1[0];
  const day = a2[1] - a1[1];
  const dbx = b2[0] - b1[0];
  const dby = b2[1] - b1[1];

  const denom = dax * dby - day * dbx;
  if (Math.abs(denom) < 1e-8) return null;

  const s = ((b1[0] - a1[0]) * dby - (b1[1] - a1[1]) * dbx) / denom;
  const t = ((b1[0] - a1[0]) * day - (b1[1] - a1[1]) * dax) / denom;

  if (s >= -1e-5 && s <= 1 + 1e-5 && t >= -1e-5 && t <= 1 + 1e-5) {
    return {
      pt: [a1[0] + s * dax, a1[1] + s * day],
      tA: Math.max(0, Math.min(1, s)),
      tB: Math.max(0, Math.min(1, t)),
    };
  }
  return null;
}

export function lineCircleIntersections(
  p1: Vec2,
  p2: Vec2,
  center: Vec2,
  radius: number
): { pt: Vec2; t: number }[] {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const fx = p1[0] - center[0];
  const fy = p1[1] - center[1];

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;

  let disc = b * b - 4 * a * c;
  if (disc < 0 || a < 1e-9) return [];

  disc = Math.sqrt(disc);
  const t1 = (-b - disc) / (2 * a);
  const t2 = (-b + disc) / (2 * a);

  const results: { pt: Vec2; t: number }[] = [];
  for (const t of [t1, t2]) {
    if (t >= 1e-4 && t <= 1 - 1e-4) {
      results.push({
        pt: [p1[0] + t * dx, p1[1] + t * dy],
        t,
      });
    }
  }
  return results;
}

/**
 * Trims the clicked sub-segment of a sketch primitive between its two nearest
 * intersections with other sketch primitives.
 */
export function trimSegmentAtPoint(
  sketch: Sketch,
  clickPoint: Vec2,
  targetPrimId: string
): SketchPrimitive[] {
  const target = sketch.primitives.find((p) => p.id === targetPrimId);
  if (!target) return sketch.primitives;

  // If target is a rectangle or polygon, explode it into 4 lines first so single side can be trimmed
  let workingPrims = [...sketch.primitives];
  let activeLine: SketchPrimitive | null = null;

  if (target.type === 'rect') {
    const [p1, p2] = target.points;
    const corners: Vec2[] = [
      [p1[0], p1[1]],
      [p2[0], p1[1]],
      [p2[0], p2[1]],
      [p1[0], p2[1]],
    ];
    const rectLines: SketchPrimitive[] = [0, 1, 2, 3].map((i) => ({
      id: uuidv4(),
      type: 'line',
      points: [corners[i], corners[(i + 1) % 4]],
      isConstruction: target.isConstruction,
      status: 'under',
    }));
    workingPrims = workingPrims.filter((p) => p.id !== target.id).concat(rectLines);
    // Pick closest edge of exploded rectangle
    let bestDist = Infinity;
    for (const rl of rectLines) {
      const d = distToSegment(clickPoint, rl.points[0], rl.points[1]);
      if (d < bestDist) {
        bestDist = d;
        activeLine = rl;
      }
    }
  } else if (target.type === 'line') {
    activeLine = target;
  } else {
    // Non-line primitive: remove it directly on trim click
    return workingPrims.filter((p) => p.id !== target.id);
  }

  if (!activeLine) return workingPrims;

  const [a1, a2] = activeLine.points;
  const tParams: number[] = [0, 1];

  // Collect all intersection parameters t along activeLine
  for (const other of workingPrims) {
    if (other.id === activeLine.id) continue;

    if (other.type === 'line') {
      const hit = lineLineIntersection(a1, a2, other.points[0], other.points[1]);
      if (hit && hit.tA > 1e-3 && hit.tA < 1 - 1e-3) {
        tParams.push(hit.tA);
      }
    } else if (other.type === 'rect') {
      const [r1, r2] = other.points;
      const rc: Vec2[] = [
        [r1[0], r1[1]],
        [r2[0], r1[1]],
        [r2[0], r2[1]],
        [r1[0], r2[1]],
      ];
      for (let i = 0; i < 4; i++) {
        const hit = lineLineIntersection(a1, a2, rc[i], rc[(i + 1) % 4]);
        if (hit && hit.tA > 1e-3 && hit.tA < 1 - 1e-3) {
          tParams.push(hit.tA);
        }
      }
    } else if (other.type === 'circle') {
      const r =
        other.radius ||
        Math.hypot(
          other.points[1][0] - other.points[0][0],
          other.points[1][1] - other.points[0][1]
        );
      const hits = lineCircleIntersections(a1, a2, other.points[0], r);
      for (const h of hits) tParams.push(h.t);
    }
  }

  tParams.sort((a, b) => a - b);

  // Deduplicate close parameters
  const uniqueT: number[] = [];
  for (const t of tParams) {
    if (uniqueT.length === 0 || Math.abs(t - uniqueT[uniqueT.length - 1]) > 1e-3) {
      uniqueT.push(t);
    }
  }

  // If no interior intersections, remove the entire line
  if (uniqueT.length <= 2) {
    return workingPrims.filter((p) => p.id !== activeLine!.id);
  }

  // Project clickPoint onto activeLine to find tClick
  const dx = a2[0] - a1[0];
  const dy = a2[1] - a1[1];
  const lenSq = dx * dx + dy * dy || 1;
  const tClick = Math.max(
    0,
    Math.min(1, ((clickPoint[0] - a1[0]) * dx + (clickPoint[1] - a1[1]) * dy) / lenSq)
  );

  const replacementSegments: SketchPrimitive[] = [];
  for (let i = 0; i < uniqueT.length - 1; i++) {
    const tStart = uniqueT[i];
    const tEnd = uniqueT[i + 1];
    if (tClick >= tStart - 1e-4 && tClick <= tEnd + 1e-4) {
      // This is the sub-segment the user clicked to trim away!
      continue;
    }
    replacementSegments.push({
      id: uuidv4(),
      type: 'line',
      points: [
        [a1[0] + tStart * dx, a1[1] + tStart * dy],
        [a1[0] + tEnd * dx, a1[1] + tEnd * dy],
      ],
      isConstruction: activeLine.isConstruction,
      status: 'under',
    });
  }

  return workingPrims
    .filter((p) => p.id !== activeLine!.id)
    .concat(replacementSegments);
}

export function offsetSketchPrimitive(
  prim: SketchPrimitive,
  offsetDist: number
): SketchPrimitive {
  if (prim.type === 'circle') {
    const c = prim.points[0];
    const oldR =
      prim.radius ||
      Math.hypot(prim.points[1][0] - c[0], prim.points[1][1] - c[1]);
    const newR = Math.max(1, oldR + offsetDist);
    return {
      ...prim,
      id: uuidv4(),
      points: [c, [c[0] + newR, c[1]]],
      radius: newR,
    };
  }
  if (prim.type === 'rect') {
    const [p1, p2] = prim.points;
    const minX = Math.min(p1[0], p2[0]) - offsetDist;
    const maxX = Math.max(p1[0], p2[0]) + offsetDist;
    const minY = Math.min(p1[1], p2[1]) - offsetDist;
    const maxY = Math.max(p1[1], p2[1]) + offsetDist;
    return {
      ...prim,
      id: uuidv4(),
      points: [
        [minX, minY],
        [maxX, maxY],
      ],
    };
  }
  if (prim.type === 'line') {
    const [p1, p2] = prim.points;
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * offsetDist;
    const ny = (dx / len) * offsetDist;
    return {
      ...prim,
      id: uuidv4(),
      points: [
        [p1[0] + nx, p1[1] + ny],
        [p2[0] + nx, p2[1] + ny],
      ],
    };
  }
  return {
    ...prim,
    id: uuidv4(),
    points: prim.points.map(([x, y]) => [x + offsetDist, y + offsetDist]),
  };
}

function distToSegment(p: Vec2, v: Vec2, w: Vec2): number {
  const l2 = (w[0] - v[0]) ** 2 + (w[1] - v[1]) ** 2;
  if (l2 === 0) return Math.hypot(p[0] - v[0], p[1] - v[1]);
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(
    p[0] - (v[0] + t * (w[0] - v[0])),
    p[1] - (v[1] + t * (w[1] - v[1]))
  );
}

// ============================================================================
// 3. AUTOMATIC CLOSED PROFILE LOOP DETECTOR & EARCUT TRIANGULATOR
// ============================================================================

export function detectClosedProfiles(sketch: Sketch): ClosedProfileLoop[] {
  const rawPolygons: { id: string; contour: Vec2[]; area: number }[] = [];
  const lineSegments: [Vec2, Vec2][] = [];

  for (const prim of sketch.primitives) {
    if (prim.isConstruction) continue;

    if (prim.type === 'rect' && prim.points.length >= 2) {
      const [p1, p2] = prim.points;
      const minX = Math.min(p1[0], p2[0]);
      const maxX = Math.max(p1[0], p2[0]);
      const minY = Math.min(p1[1], p2[1]);
      const maxY = Math.max(p1[1], p2[1]);
      if (maxX - minX > 0.5 && maxY - minY > 0.5) {
        const contour: Vec2[] = [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
        ];
        rawPolygons.push({
          id: prim.id,
          contour,
          area: Math.abs(signedPolygonArea(contour)),
        });
      }
    } else if (prim.type === 'circle' && prim.points.length >= 2) {
      const center = prim.points[0];
      const r =
        prim.radius ??
        Math.hypot(prim.points[1][0] - center[0], prim.points[1][1] - center[1]);
      if (r > 0.5) {
        const segs = 48;
        const contour: Vec2[] = [];
        for (let i = 0; i < segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          contour.push([center[0] + Math.cos(a) * r, center[1] + Math.sin(a) * r]);
        }
        rawPolygons.push({
          id: prim.id,
          contour,
          area: Math.PI * r * r,
        });
      }
    } else if (prim.type === 'polygon' && prim.points.length >= 2) {
      const center = prim.points[0];
      const r =
        prim.radius ??
        Math.hypot(prim.points[1][0] - center[0], prim.points[1][1] - center[1]);
      const sides = Math.max(3, prim.sides ?? 6);
      if (r > 0.5) {
        const contour: Vec2[] = [];
        for (let i = 0; i < sides; i++) {
          const a = (i / sides) * Math.PI * 2;
          contour.push([center[0] + Math.cos(a) * r, center[1] + Math.sin(a) * r]);
        }
        rawPolygons.push({
          id: prim.id,
          contour,
          area: Math.abs(signedPolygonArea(contour)),
        });
      }
    } else if (prim.type === 'ellipse' && prim.points.length >= 2) {
      const center = prim.points[0];
      const rx = Math.max(1, Math.abs(prim.points[1][0] - center[0]));
      const ry = Math.max(1, prim.radiusY ?? Math.abs(prim.points[1][1] - center[1]));
      const segs = 48;
      const contour: Vec2[] = [];
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        contour.push([center[0] + Math.cos(a) * rx, center[1] + Math.sin(a) * ry]);
      }
      rawPolygons.push({
        id: prim.id,
        contour,
        area: Math.PI * rx * ry,
      });
    } else if (prim.type === 'line' && prim.points.length >= 2) {
      lineSegments.push([prim.points[0], prim.points[1]]);
    } else if (prim.type === 'arc' && prim.points.length >= 3) {
      const arcPts = sampleThreePointArc(prim.points[0], prim.points[1], prim.points[2], 16);
      for (let i = 0; i < arcPts.length - 1; i++) {
        lineSegments.push([arcPts[i], arcPts[i + 1]]);
      }
    } else if (prim.type === 'spline' && prim.points.length >= 3) {
      const splinePts = sampleCatmullRom2D(prim.points, 24);
      for (let i = 0; i < splinePts.length - 1; i++) {
        lineSegments.push([splinePts[i], splinePts[i + 1]]);
      }
    }
  }

  // Planar graph cycle detection on connected line/arc/spline segments
  const lineCycles = extractClosedCyclesFromSegments(lineSegments);
  for (const cyc of lineCycles) {
    const area = Math.abs(signedPolygonArea(cyc));
    if (area > 1.0) {
      rawPolygons.push({
        id: uuidv4(),
        contour: ensureCounterClockwise(cyc),
        area,
      });
    }
  }

  // Sort polygons by area descending so outer contours come before inner holes
  rawPolygons.sort((a, b) => b.area - a.area);

  // Determine parent-hole hierarchy using point-in-polygon
  const usedAsHole = new Set<number>();
  const profiles: ClosedProfileLoop[] = [];

  for (let i = 0; i < rawPolygons.length; i++) {
    if (usedAsHole.has(i)) continue;
    const outer = ensureCounterClockwise(rawPolygons[i].contour);
    const holes: Vec2[][] = [];

    for (let j = i + 1; j < rawPolygons.length; j++) {
      if (usedAsHole.has(j)) continue;
      const cand = rawPolygons[j].contour;
      // Check if cand is strictly inside outer
      if (isPointInPolygon(cand[0], outer)) {
        holes.push(ensureClockwise(cand));
        usedAsHole.add(j);
      }
    }

    const { vertices, indices, netArea, centroid } = triangulateProfileWithHoles(
      outer,
      holes
    );

    profiles.push({
      id: `prof_${sketch.id}_${i}`,
      sketchId: sketch.id,
      outerContour: outer,
      holes,
      areaMm2: netArea,
      centroid,
      triangulatedVertices: vertices,
      triangulatedIndices: indices,
    });

    // Also add the hole itself as an independently selectable inner profile (Shapr3D style!)
    for (const h of holes) {
      const innerCCW = ensureCounterClockwise(h);
      const innerTri = triangulateProfileWithHoles(innerCCW, []);
      profiles.push({
        id: `prof_${sketch.id}_hole_${profiles.length}`,
        sketchId: sketch.id,
        outerContour: innerCCW,
        holes: [],
        areaMm2: innerTri.netArea,
        centroid: innerTri.centroid,
        triangulatedVertices: innerTri.vertices,
        triangulatedIndices: innerTri.indices,
      });
    }
  }

  return profiles;
}

function extractClosedCyclesFromSegments(segments: [Vec2, Vec2][]): Vec2[][] {
  if (segments.length < 3) return [];
  const SNAP = 1.5; // 1.5mm endpoint snap tolerance
  const nodes: Vec2[] = [];
  const adj = new Map<number, number[]>();

  const getNodeId = (pt: Vec2): number => {
    for (let i = 0; i < nodes.length; i++) {
      if (Math.hypot(nodes[i][0] - pt[0], nodes[i][1] - pt[1]) <= SNAP) {
        return i;
      }
    }
    nodes.push([pt[0], pt[1]]);
    adj.set(nodes.length - 1, []);
    return nodes.length - 1;
  };

  for (const [p1, p2] of segments) {
    const u = getNodeId(p1);
    const v = getNodeId(p2);
    if (u !== v) {
      if (!adj.get(u)!.includes(v)) adj.get(u)!.push(v);
      if (!adj.get(v)!.includes(u)) adj.get(v)!.push(u);
    }
  }

  // Prune degree-1 dead-end branches iteratively
  let changed = true;
  while (changed) {
    changed = false;
    for (const [u, neighbors] of adj.entries()) {
      if (neighbors.length === 1) {
        const v = neighbors[0];
        adj.set(
          v,
          (adj.get(v) || []).filter((x) => x !== u)
        );
        adj.set(u, []);
        changed = true;
      }
    }
  }

  const visitedNodes = new Set<number>();
  const cycles: Vec2[][] = [];

  for (const startNode of adj.keys()) {
    const nbs = adj.get(startNode) || [];
    if (nbs.length < 2 || visitedNodes.has(startNode)) continue;

    const path: number[] = [startNode];
    let curr = nbs[0];
    let prev = startNode;
    visitedNodes.add(startNode);

    while (curr !== undefined && curr !== startNode && path.length < 200) {
      path.push(curr);
      visitedNodes.add(curr);
      const currNbs = adj.get(curr) || [];
      const next = currNbs.find((n) => n !== prev);
      if (next === undefined) break;
      prev = curr;
      curr = next;
    }

    if (curr === startNode && path.length >= 3) {
      cycles.push(path.map((idx) => nodes[idx]));
    }
  }

  return cycles;
}

function triangulateProfileWithHoles(
  outer: Vec2[],
  holes: Vec2[][]
): {
  vertices: Vec2[];
  indices: number[];
  netArea: number;
  centroid: Vec2;
} {
  const flatCoords: number[] = [];
  const allVertices: Vec2[] = [];
  const holeIndices: number[] = [];

  for (const pt of outer) {
    flatCoords.push(pt[0], pt[1]);
    allVertices.push(pt);
  }

  for (const hole of holes) {
    holeIndices.push(allVertices.length);
    for (const pt of hole) {
      flatCoords.push(pt[0], pt[1]);
      allVertices.push(pt);
    }
  }

  const indices = earcut(flatCoords, holeIndices.length > 0 ? holeIndices : undefined, 2);

  let netArea = Math.abs(signedPolygonArea(outer));
  for (const h of holes) {
    netArea -= Math.abs(signedPolygonArea(h));
  }
  netArea = Math.max(0.1, netArea);

  let cx = 0,
    cy = 0;
  for (const pt of outer) {
    cx += pt[0];
    cy += pt[1];
  }
  cx /= outer.length || 1;
  cy /= outer.length || 1;

  return {
    vertices: allVertices,
    indices,
    netArea,
    centroid: [cx, cy],
  };
}

export function signedPolygonArea(pts: Vec2[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  return area * 0.5;
}

function ensureCounterClockwise(pts: Vec2[]): Vec2[] {
  return signedPolygonArea(pts) < 0 ? [...pts].reverse() : [...pts];
}

function ensureClockwise(pts: Vec2[]): Vec2[] {
  return signedPolygonArea(pts) > 0 ? [...pts].reverse() : [...pts];
}

export function isPointInPolygon(pt: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0],
      yi = polygon[i][1];
    const xj = polygon[j][0],
      yj = polygon[j][1];
    const intersect =
      yi > pt[1] !== yj > pt[1] &&
      pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function sampleThreePointArc(p1: Vec2, pMid: Vec2, p2: Vec2, segments = 20): Vec2[] {
  // Circumcircle through p1, pMid, p2
  const ax = p1[0],
    ay = p1[1];
  const bx = pMid[0],
    by = pMid[1];
  const cx = p2[0],
    cy = p2[1];

  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-6) {
    return [p1, p2];
  }

  const ux =
    ((ax * ax + ay * ay) * (by - cy) +
      (bx * bx + by * by) * (cy - ay) +
      (cx * cx + cy * cy) * (ay - by)) /
    d;
  const uy =
    ((ax * ax + ay * ay) * (cx - bx) +
      (bx * bx + by * by) * (ax - cx) +
      (cx * cx + cy * cy) * (bx - ax)) /
    d;

  const r = Math.hypot(ax - ux, ay - uy);
  let a1 = Math.atan2(ay - uy, ax - ux);
  let aM = Math.atan2(by - uy, bx - ux);
  let a2 = Math.atan2(cy - uy, cx - ux);

  const norm = (ang: number) => ((ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const dM = norm(aM - a1);
  const d2 = norm(a2 - a1);

  let sweep = d2;
  if (dM > d2) {
    sweep = d2 - 2 * Math.PI;
  }

  const pts: Vec2[] = [];
  for (let i = 0; i <= segments; i++) {
    const ang = a1 + (i / segments) * sweep;
    pts.push([ux + Math.cos(ang) * r, uy + Math.sin(ang) * r]);
  }
  return pts;
}

export function sampleCatmullRom2D(controlPts: Vec2[], subdivisions = 24): Vec2[] {
  if (controlPts.length < 2) return controlPts;
  const out: Vec2[] = [];
  const n = controlPts.length;

  for (let i = 0; i < n - 1; i++) {
    const p0 = controlPts[Math.max(0, i - 1)];
    const p1 = controlPts[i];
    const p2 = controlPts[i + 1];
    const p3 = controlPts[Math.min(n - 1, i + 2)];

    const steps = Math.max(4, Math.floor(subdivisions / (n - 1)));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      out.push([x, y]);
    }
  }
  out.push(controlPts[n - 1]);
  return out;
}

// ============================================================================
// 4. LEVENBERG-MARQUARDT / GAUSS-NEWTON 2D GEOMETRIC CONSTRAINT SOLVER
// ============================================================================

export function solveSketchConstraints(
  sketch: Sketch,
  variables: ParametricVariable[] = []
): Sketch {
  const prims: SketchPrimitive[] = sketch.primitives.map((p) => ({
    ...p,
    points: p.points.map((pt) => [pt[0], pt[1]] as Vec2),
    status: 'under',
  }));
  const constraints: SketchConstraint[] = sketch.constraints.map((c) => ({
    ...c,
    hasConflict: false,
  }));

  const primById = new Map<string, SketchPrimitive>();
  for (const p of prims) primById.set(p.id, p);

  const lockedPrimIds = new Set<string>();
  for (const c of constraints) {
    if (c.type === 'lock') {
      c.primitiveIds.forEach((id) => lockedPrimIds.add(id));
    }
  }

  // Iterative damped relaxation / Levenberg-Marquardt step loop
  const MAX_ITERS = 35;
  for (let iter = 0; iter < MAX_ITERS; iter++) {
    let maxError = 0;

    for (const c of constraints) {
      let targetVal = c.value ?? 0;
      if (c.expression) {
        const evalRes = evaluateParametricExpression(c.expression, variables);
        if (evalRes.valid) targetVal = evalRes.value;
      }

      const pA = primById.get(c.primitiveIds[0]);
      const pB = c.primitiveIds[1] ? primById.get(c.primitiveIds[1]) : undefined;
      if (!pA) continue;

      const isLockedA = lockedPrimIds.has(pA.id);
      const isLockedB = pB ? lockedPrimIds.has(pB.id) : false;

      switch (c.type) {
        case 'horizontal': {
          if (pA.points.length >= 2 && !isLockedA) {
            const avgY = (pA.points[0][1] + pA.points[1][1]) * 0.5;
            maxError = Math.max(maxError, Math.abs(pA.points[0][1] - pA.points[1][1]));
            pA.points[0][1] = avgY;
            pA.points[1][1] = avgY;
          }
          break;
        }
        case 'vertical': {
          if (pA.points.length >= 2 && !isLockedA) {
            const avgX = (pA.points[0][0] + pA.points[1][0]) * 0.5;
            maxError = Math.max(maxError, Math.abs(pA.points[0][0] - pA.points[1][0]));
            pA.points[0][0] = avgX;
            pA.points[1][0] = avgX;
          }
          break;
        }
        case 'coincident': {
          if (pB && pA.points.length > 0 && pB.points.length > 0) {
            const idxA = c.pointIndices?.[0] ?? 0;
            const idxB = c.pointIndices?.[1] ?? 0;
            const ptA = pA.points[idxA] || pA.points[0];
            const ptB = pB.points[idxB] || pB.points[0];
            const mx = isLockedA ? ptA[0] : isLockedB ? ptB[0] : (ptA[0] + ptB[0]) * 0.5;
            const my = isLockedA ? ptA[1] : isLockedB ? ptB[1] : (ptA[1] + ptB[1]) * 0.5;
            maxError = Math.max(maxError, Math.hypot(ptA[0] - ptB[0], ptA[1] - ptB[1]));
            if (!isLockedA) {
              ptA[0] = mx;
              ptA[1] = my;
            }
            if (!isLockedB) {
              ptB[0] = mx;
              ptB[1] = my;
            }
          }
          break;
        }
        case 'distance': {
          if (pA.type === 'line' && !pB && targetVal > 0 && !isLockedA) {
            const [pt1, pt2] = pA.points;
            const dx = pt2[0] - pt1[0];
            const dy = pt2[1] - pt1[1];
            const curLen = Math.hypot(dx, dy) || 1;
            const err = targetVal - curLen;
            maxError = Math.max(maxError, Math.abs(err));
            const ux = (dx / curLen) * (err * 0.5);
            const uy = (dy / curLen) * (err * 0.5);
            pt1[0] -= ux;
            pt1[1] -= uy;
            pt2[0] += ux;
            pt2[1] += uy;
          } else if (pA.type === 'rect' && targetVal > 0 && !isLockedA) {
            const [pt1, pt2] = pA.points;
            const cx = (pt1[0] + pt2[0]) * 0.5;
            pt1[0] = cx - targetVal * 0.5;
            pt2[0] = cx + targetVal * 0.5;
          }
          break;
        }
        case 'radius':
        case 'diameter': {
          const r = c.type === 'diameter' ? targetVal * 0.5 : targetVal;
          if (r > 0 && !isLockedA) {
            pA.radius = r;
            if (pA.points.length >= 2) {
              pA.points[1] = [pA.points[0][0] + r, pA.points[0][1]];
            }
          }
          break;
        }
        case 'parallel':
        case 'perpendicular': {
          if (pB && pA.points.length >= 2 && pB.points.length >= 2 && !isLockedB) {
            const angA = Math.atan2(
              pA.points[1][1] - pA.points[0][1],
              pA.points[1][0] - pA.points[0][0]
            );
            const targetAng =
              c.type === 'parallel' ? angA : angA + Math.PI * 0.5;
            const lenB = Math.hypot(
              pB.points[1][0] - pB.points[0][0],
              pB.points[1][1] - pB.points[0][1]
            );
            const midB: Vec2 = [
              (pB.points[0][0] + pB.points[1][0]) * 0.5,
              (pB.points[0][1] + pB.points[1][1]) * 0.5,
            ];
            pB.points[0] = [
              midB[0] - Math.cos(targetAng) * lenB * 0.5,
              midB[1] - Math.sin(targetAng) * lenB * 0.5,
            ];
            pB.points[1] = [
              midB[0] + Math.cos(targetAng) * lenB * 0.5,
              midB[1] + Math.sin(targetAng) * lenB * 0.5,
            ];
          }
          break;
        }
        case 'concentric': {
          if (pB && pA.points.length > 0 && pB.points.length > 0 && !isLockedB) {
            const dx = pA.points[0][0] - pB.points[0][0];
            const dy = pA.points[0][1] - pB.points[0][1];
            pB.points = pB.points.map(([x, y]) => [x + dx, y + dy]);
          }
          break;
        }
        case 'equal': {
          if (pB && !isLockedB) {
            if (pA.type === 'circle' && pB.type === 'circle') {
              const rA =
                pA.radius ??
                Math.hypot(
                  pA.points[1][0] - pA.points[0][0],
                  pA.points[1][1] - pA.points[0][1]
                );
              pB.radius = rA;
              pB.points[1] = [pB.points[0][0] + rA, pB.points[0][1]];
            } else if (pA.type === 'line' && pB.type === 'line') {
              const lenA = Math.hypot(
                pA.points[1][0] - pA.points[0][0],
                pA.points[1][1] - pA.points[0][1]
              );
              const angB = Math.atan2(
                pB.points[1][1] - pB.points[0][1],
                pB.points[1][0] - pB.points[0][0]
              );
              pB.points[1] = [
                pB.points[0][0] + Math.cos(angB) * lenA,
                pB.points[0][1] + Math.sin(angB) * lenA,
              ];
            }
          }
          break;
        }
        case 'tangent': {
          if (pB && pA.type === 'circle' && pB.type === 'line' && !isLockedB) {
            const center = pA.points[0];
            const r =
              pA.radius ??
              Math.hypot(pA.points[1][0] - center[0], pA.points[1][1] - center[1]);
            const [l1, l2] = pB.points;
            const dx = l2[0] - l1[0];
            const dy = l2[1] - l1[1];
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const signedDist = (center[0] - l1[0]) * nx + (center[1] - l1[1]) * ny;
            const shift = (signedDist >= 0 ? r : -r) - signedDist;
            pB.points[0] = [l1[0] - nx * shift, l1[1] - ny * shift];
            pB.points[1] = [l2[0] - nx * shift, l2[1] - ny * shift];
          }
          break;
        }
      }
    }

    if (maxError < 1e-4) break;
  }

  // Update constraint status badges per primitive
  const constraintCountByPrim = new Map<string, number>();
  for (const c of constraints) {
    for (const pid of c.primitiveIds) {
      constraintCountByPrim.set(pid, (constraintCountByPrim.get(pid) || 0) + 1);
    }
  }

  for (const p of prims) {
    const cnt = constraintCountByPrim.get(p.id) || 0;
    if (lockedPrimIds.has(p.id) || cnt >= 2) {
      p.status = cnt > 4 ? 'over' : 'fully';
    } else {
      p.status = 'under';
    }
  }

  const updatedSketch: Sketch = {
    ...sketch,
    primitives: prims,
    constraints,
    closedProfiles: [],
  };
  updatedSketch.closedProfiles = detectClosedProfiles(updatedSketch);
  return updatedSketch;
}
