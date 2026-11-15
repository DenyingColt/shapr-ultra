import * as THREE from 'three';

export type UnitSystem = 'mm' | 'cm' | 'm' | 'in';

export type VisualStyle =
  | 'shaded_edges'
  | 'shaded'
  | 'matcap'
  | 'blueprint_white'
  | 'wireframe'
  | 'xray'
  | 'zebra'
  | 'overhang'
  | 'curvature_map'
  | 'draft_analysis'
  | 'thickness_heatmap';

export type SelectionFilterMode = 'all' | 'body' | 'face' | 'edge' | 'vertex' | 'sketch';

export type ShaprWorkspace = 'modeling' | 'visualization' | 'drawings2d';

export type ConstructionPlaneType =
  | 'offset'
  | 'midplane'
  | 'angle'
  | 'three_points'
  | 'tangent'
  | 'perp_curve';

export type ConstructionAxisType =
  | 'cylinder_center'
  | 'two_points'
  | 'plane_intersection'
  | 'face_normal';

export type EnvironmentPresetId =
  | 'studio_softbox'
  | 'gradient_mood'
  | 'industrial_loft'
  | 'daylight_sun'
  | 'dark_showroom'
  | 'warm_workshop';

export interface PBRMaterialPreset {
  id: string;
  category: 'metals' | 'plastics' | 'woods' | 'glass' | 'automotive' | 'stone';
  name: string;
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
  densityGPerCm3: number;
  clearcoat?: number;
}

export interface PinnedMeasurement {
  id: string;
  label: string;
  valueStr: string;
  type: 'distance' | 'angle' | 'area' | 'length' | 'radius' | 'volume';
  entityIds: string[];
  timestamp: number;
}

export interface ConstructionAxisItem {
  id: string;
  name: string;
  origin: Vec3;
  direction: Vec3;
  lengthMm: number;
  visible: boolean;
}

export type ActiveTool =
  | 'select'
  | 'sketch_pen'
  | 'sketch_line'
  | 'sketch_arc'
  | 'sketch_circle'
  | 'sketch_rect'
  | 'sketch_polygon'
  | 'sketch_spline'
  | 'sketch_slot'
  | 'sketch_conic'
  | 'sketch_spiral'
  | 'sketch_equation'
  | 'sketch_text'
  | 'sketch_fillet'
  | 'sketch_chamfer'
  | 'sketch_split'
  | 'sketch_3d'
  | 'sketch_project'
  | 'sketch_trim'
  | 'sketch_offset'
  | 'extrude'
  | 'revolve'
  | 'sweep'
  | 'loft'
  | 'fillet_chamfer'
  | 'variable_fillet'
  | 'shell'
  | 'boolean'
  | 'offset_face'
  | 'delete_heal_face'
  | 'replace_face'
  | 'bridge_faces'
  | 'emboss_deboss'
  | 'split_body'
  | 'move_rotate'
  | 'translate_body'
  | 'align_bodies'
  | 'scale_body'
  | 'construct_plane'
  | 'construct_axis'
  | 'measure_tool'
  | 'pattern_linear'
  | 'pattern_circular'
  | 'mirror'
  | 'hole_wizard'
  | 'rib_web'
  | 'mounting_boss'
  | 'lip_groove'
  | 'surface_patch'
  | 'surface_offset'
  | 'surface_thicken'
  | 'surface_stitch'
  | 'sheet_base_flange'
  | 'sheet_edge_flange'
  | 'sheet_hem'
  | 'sheet_unfold'
  | 'assembly_joint'
  | 'ref_canvas_calibrate';

export type BooleanMode = 'new_body' | 'union' | 'subtract' | 'intersect';

export type SurfaceType = 'planar' | 'cylindrical' | 'spherical' | 'conical' | 'freeform';

export type EdgeCurveType = 'line' | 'arc' | 'circle' | 'polyline';

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export interface ParametricVariable {
  id: string;
  name: string;
  expression: string;
  value: number;
  unit: UnitSystem | 'deg' | 'unitless';
  description?: string;
}

export interface TopologicalFace {
  id: string;
  bodyId: string;
  surfaceType: SurfaceType;
  normal: Vec3;
  center: Vec3;
  area: number; // mm^2
  triangleIndices: number[];
  boundaryEdgeIds: string[];
  cylinderAxis?: Vec3;
  cylinderRadius?: number;
}

export interface TopologicalEdge {
  id: string;
  bodyId: string;
  edgeType: EdgeCurveType;
  vertices: Vec3[];
  length: number; // mm
  adjacentFaceIds: string[];
  radius?: number;
  center?: Vec3;
  isSharp: boolean;
}

export interface TopologicalVertex {
  id: string;
  bodyId: string;
  position: Vec3;
  connectedEdgeIds: string[];
}

export interface BodyTopology {
  faces: TopologicalFace[];
  edges: TopologicalEdge[];
  vertices: TopologicalVertex[];
  faceMapByTriangle: Record<number, string>;
  volumeMm3: number;
  surfaceAreaMm2: number;
  openEdgeCount?: number;
}

export interface CADMaterial {
  name: string;
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
  densityGPerCm3: number;
}

export interface KinematicJointConfig {
  role: 'static' | 'revolute_joint' | 'rotating_gear' | 'slider';
  axis: Vec3;
  pivot: Vec3;
  minAngleDeg: number;
  maxAngleDeg: number;
  currentAngleDeg: number;
  gearRatio?: number;
}

export interface SheetMetalParams {
  thicknessMm: number;
  bendRadiusMm: number;
  kFactor: number;
  reliefType: 'rectangular' | 'obround' | 'tear';
  bendAngleDeg: number;
  flangeLengthMm: number;
  bendsCount?: number;
}

export interface CADBody {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  isolated?: boolean;
  isSurfaceBody?: boolean;
  componentId?: string;
  explosionVector?: Vec3;
  sheetMetalMeta?: SheetMetalParams;
  geometry: THREE.BufferGeometry;
  topology: BodyTopology;
  material: CADMaterial;
  transform: {
    position: Vec3;
    rotation: Vec3;
    scale: Vec3;
    pivot: Vec3;
  };
  kinematics?: KinematicJointConfig;
  sourceFeatureId?: string;
}

export type SketchPrimitiveType =
  | 'line'
  | 'arc'
  | 'circle'
  | 'rect'
  | 'polygon'
  | 'ellipse'
  | 'spline'
  | 'slot'
  | 'conic'
  | 'spiral'
  | 'equation'
  | 'text';

export type ConstraintStatus = 'under' | 'fully' | 'over';

export interface SketchPrimitive {
  id: string;
  type: SketchPrimitiveType;
  points: Vec2[];
  points3D?: Vec3[];
  radius?: number;
  radiusY?: number;
  sides?: number;
  rho?: number;
  text?: string;
  fontSize?: number;
  equationExpr?: string;
  isConstruction: boolean;
  status: ConstraintStatus;
}

export type ConstraintType =
  | 'coincident'
  | 'horizontal'
  | 'vertical'
  | 'parallel'
  | 'perpendicular'
  | 'tangent'
  | 'concentric'
  | 'equal'
  | 'midpoint'
  | 'symmetric'
  | 'lock'
  | 'distance'
  | 'angle'
  | 'radius'
  | 'diameter';

export interface SketchConstraint {
  id: string;
  type: ConstraintType;
  primitiveIds: string[];
  pointIndices?: number[];
  value?: number;
  expression?: string;
  hasConflict?: boolean;
}

export interface ClosedProfileLoop {
  id: string;
  sketchId: string;
  outerContour: Vec2[];
  holes: Vec2[][];
  areaMm2: number;
  centroid: Vec2;
  triangulatedVertices: Vec2[];
  triangulatedIndices: number[];
}

export interface SketchPlane {
  id: string;
  name: string;
  origin: Vec3;
  normal: Vec3;
  xAxis: Vec3;
  yAxis: Vec3;
  sourceFaceId?: string;
  sourceBodyId?: string;
  visible: boolean;
}

export interface Sketch {
  id: string;
  name: string;
  plane: SketchPlane;
  primitives: SketchPrimitive[];
  constraints: SketchConstraint[];
  closedProfiles: ClosedProfileLoop[];
  is3DSketch?: boolean;
  visible: boolean;
}

export interface ReferenceCanvasItem {
  id: string;
  name: string;
  imageUrl: string;
  plane: 'XY' | 'XZ' | 'YZ';
  opacity: number;
  flipH: boolean;
  flipV: boolean;
  locked: boolean;
  offsetX: number;
  offsetY: number;
  rotationDeg: number;
  widthMm: number;
  heightMm: number;
  visible: boolean;
}

export type ISOMetricThreadSize =
  | 'M2'
  | 'M2.5'
  | 'M3'
  | 'M4'
  | 'M5'
  | 'M6'
  | 'M8'
  | 'M10'
  | 'M12'
  | 'M16'
  | 'M20';

export interface HoleWizardParams {
  holeType: 'simple' | 'counterbore' | 'countersink' | 'tapped';
  isoSize: ISOMetricThreadSize;
  fitClass: 'close' | 'normal' | 'loose';
  depthMode: 'through_all' | 'blind';
  depthMm: number;
  tipAngleDeg: 118 | 135 | 180;
  position: Vec3;
  normal: Vec3;
}

export type AssemblyJointType =
  | 'rigid'
  | 'revolute'
  | 'slider'
  | 'cylindrical'
  | 'planar'
  | 'ball';

export interface AssemblyJoint {
  id: string;
  name: string;
  type: AssemblyJointType;
  bodyAId: string;
  bodyBId: string;
  anchorWorld: Vec3;
  axisWorld: Vec3;
  minLimit: number;
  maxLimit: number;
  currentValue: number;
  gearRatio?: number;
}

export interface InterferenceClash {
  id: string;
  bodyAId: string;
  bodyAName: string;
  bodyBId: string;
  bodyBName: string;
  volumeMm3: number;
  centerWorld: Vec3;
  clashGeometry?: THREE.BufferGeometry;
}

export interface SectionBoxBounds {
  enabled: boolean;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export type FeatureOperationType =
  | 'primitive_box'
  | 'primitive_cylinder'
  | 'primitive_sphere'
  | 'sketch'
  | 'extrude'
  | 'revolve'
  | 'sweep'
  | 'loft'
  | 'fillet'
  | 'variable_fillet'
  | 'chamfer'
  | 'shell'
  | 'boolean'
  | 'offset_face'
  | 'delete_heal_face'
  | 'replace_face'
  | 'bridge_faces'
  | 'emboss_deboss'
  | 'split_body'
  | 'pattern_linear'
  | 'pattern_circular'
  | 'macro_gear'
  | 'macro_bolt'
  | 'macro_spring'
  | 'macro_hinge'
  | 'hole_wizard'
  | 'rib_web'
  | 'mounting_boss'
  | 'lip_groove'
  | 'surface_patch'
  | 'surface_offset'
  | 'surface_thicken'
  | 'surface_stitch'
  | 'sheet_flange'
  | 'sheet_hem'
  | 'assembly_joint'
  | 'tolerance_comp'
  | 'align'
  | 'scale'
  | 'translate'
  | 'construct_plane'
  | 'construct_axis'
  | 'helical_revolve';

export interface HistoryFeatureNode {
  id: string;
  name: string;
  type: FeatureOperationType;
  suppressed: boolean;
  timestamp: number;
  params: Record<string, number | string | boolean | Vec3 | Vec2[]>;
  targetBodyIds: string[];
  resultBodyId?: string;
}

export interface SavedCADProject {
  id: string;
  name: string;
  category: string;
  updatedAt: string;
  partCount: number;
  thumbnailDataUrl?: string;
  fileSizeKb?: number;
}
