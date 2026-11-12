import { create } from 'zustand';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import {
  ActiveTool,
  AssemblyJoint,
  AssemblyJointType,
  BooleanMode,
  CADBody,
  CADMaterial,
  ConstraintType,
  HistoryFeatureNode,
  HoleWizardParams,
  InterferenceClash,
  ParametricVariable,
  ReferenceCanvasItem,
  SavedCADProject,
  SectionBoxBounds,
  SelectionFilterMode,
  SheetMetalParams,
  Sketch,
  SketchPlane,
  SketchPrimitive,
  UnitSystem,
  Vec2,
  Vec3,
  VisualStyle,
} from '../types/cad';
import { buildTopology } from '../kernel/topologyBuilder';
import {
  detectClosedProfiles,
  offsetSketchPrimitive,
  solveSketchConstraints,
  trimSegmentAtPoint,
} from '../kernel/sketchSolver';
import {
  applyFilletOrChamfer,
  detectAutoBooleanMode,
  extrudeProfile3D,
  extrudeTopologicalFace,
  loftProfiles3D,
  mirrorBodyGeometry,
  performCSG,
  revolveProfile3D,
  shellSolidBody,
  splitBodyByPlane,
  sweepProfileAlongPath,
} from '../kernel/solidKernel';
import {
  BoltParams,
  GearParams,
  HingeJointParams,
  SpringParams,
  generateArticulatedHingeGeometry,
  generateCoilSpringGeometry,
  generateISOBoltOrNutGeometry,
  generateInvoluteGearGeometry,
} from '../kernel/mechanicalMacros';
import { applyXYClearanceCompensation } from '../kernel/meshDoctor';
import {
  applySketchCornerChamfer,
  applySketchCornerFillet,
  computePlaneBodyIntersectionCurve,
  generateArchimedeanSpiralPoints,
  generateConicCurvePoints,
  generateEquationCurvePoints,
  generateStraightSlotPoints,
  generateVectorTextPrimitives,
  splitSketchPrimitiveAtPoint,
} from '../kernel/sketchAdvanced';
import {
  applyVariableRadiusFillet,
  bridgeTopologicalFaces,
  deleteAndHealFaces,
  embossOrDebossTextOnFace,
  replaceFaceWithTarget,
} from '../kernel/directModeling';
import {
  addMountingBossToBody,
  applyEnclosureLipOrGroove,
  drillParametricHoleOnBody,
  generateStructuralRibOnBody,
} from '../kernel/enclosureFeatures';
import {
  createBoundaryPatchSurface,
  extrudeCurveAsSurface,
  offsetOrExtractSurfaceFromFace,
  stitchSurfacesToSolid,
  thickenSurfaceToSolid,
} from '../kernel/surfaceKernel';
import {
  DEFAULT_SHEET_METAL_PARAMS,
  addSheetMetalEdgeFlange,
  addSheetMetalHemOnEdge,
  generateSheetMetalBaseFlange,
  unfoldSheetMetalToFlatPattern,
} from '../kernel/sheetMetal';
import {
  computeExplodedViewVectors,
  detectAssemblyInterferences,
} from '../kernel/assemblyEngine';
import { recomputeAllVariables } from '../kernel/mathParser';
import { serializeProjectToSHAPRX } from '../kernel/fileIO';
import {
  captureViewportThumbnail,
  generateFallbackSVGThumbnail,
  triggerHapticPulse,
} from '../services/nativeBridge';
import {
  StoredProjectRecord,
  deleteProjectFromIDB,
  getProjectFromIDB,
  listAllProjectsFromIDB,
  saveProjectRecordToIDB,
} from '../services/projectStorage';

export const DEFAULT_MATERIALS: Record<string, CADMaterial> = {
  aluminum: {
    name: '6061 Alüminyum',
    color: '#38bdf8',
    metalness: 0.45,
    roughness: 0.32,
    opacity: 1.0,
    densityGPerCm3: 2.7,
  },
  steel: {
    name: 'Paslanmaz Çelik 316L',
    color: '#94a3b8',
    metalness: 0.72,
    roughness: 0.25,
    opacity: 1.0,
    densityGPerCm3: 7.85,
  },
  brass: {
    name: 'Mekanik Pirinç (Dişli)',
    color: '#f59e0b',
    metalness: 0.65,
    roughness: 0.28,
    opacity: 1.0,
    densityGPerCm3: 8.4,
  },
  pla_blue: {
    name: 'PLA+ Kobalt Mavi (3D Baskı)',
    color: '#2563eb',
    metalness: 0.12,
    roughness: 0.48,
    opacity: 1.0,
    densityGPerCm3: 1.24,
  },
  carbon_petg: {
    name: 'Karbon Fiber PETG',
    color: '#334155',
    metalness: 0.2,
    roughness: 0.55,
    opacity: 1.0,
    densityGPerCm3: 1.38,
  },
  med_abs: {
    name: 'Medikal ABS Beyaz',
    color: '#e2e8f0',
    metalness: 0.08,
    roughness: 0.38,
    opacity: 1.0,
    densityGPerCm3: 1.06,
  },
};

export function createCADBodyFromGeometry(
  geometry: THREE.BufferGeometry,
  name: string,
  material: CADMaterial = DEFAULT_MATERIALS.aluminum,
  id = uuidv4()
): CADBody {
  const { indexedGeometry, topology } = buildTopology(geometry, id);
  return {
    id,
    name,
    visible: true,
    locked: false,
    geometry: indexedGeometry,
    topology,
    material: { ...material },
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      pivot: [0, 0, 0],
    },
  };
}

interface Snapshot {
  bodies: CADBody[];
  sketches: Sketch[];
  history: HistoryFeatureNode[];
}

export interface NumericHUDState {
  visible: boolean;
  screenX: number;
  screenY: number;
  label: string;
  value: string;
  unit: string;
  targetField: 'extrude' | 'draft' | 'fillet' | 'shell' | 'revolve' | 'sketch_dim';
}

export interface ThumbModifierState {
  multiSelect: boolean;
  snapOverride: boolean;
  constructionMode: boolean;
  boxSelectMode: boolean;
  leftHanded: boolean;
}

export interface RadialMenuState {
  visible: boolean;
  x: number;
  y: number;
}

export interface MagneticLoupeState {
  visible: boolean;
  x: number;
  y: number;
  worldCoordsLabel: string;
}

interface CADStoreState {
  // Project Studio & IndexedDB Sync
  projectName: string;
  activeProjectId: string;
  savedProjects: SavedCADProject[];
  isProjectHubOpen: boolean;
  autoSaveStatus: 'saved' | 'saving' | 'offline_ready';
  lastSavedTimestamp: number;

  // Scene Entities
  bodies: CADBody[];
  sketches: Sketch[];
  constructionPlanes: SketchPlane[];
  activeSketchId: string | null;
  variables: ParametricVariable[];
  history: HistoryFeatureNode[];
  rollbackIndex: number;

  // Undo / Redo Stacks
  undoStack: Snapshot[];
  redoStack: Snapshot[];

  // Sub-Object & Entity Selection State
  selectedBodyIds: string[];
  selectedFaceIds: string[];
  selectedEdgeIds: string[];
  selectedVertexIds: string[];
  selectedProfileIds: string[];
  selectedSketchPrimIds: string[];

  hoveredFaceId: string | null;
  hoveredEdgeId: string | null;
  hoveredVertexId: string | null;
  hoveredProfileId: string | null;

  // Tool & Live Gizmo Parameters
  activeTool: ActiveTool;
  extrudeDistance: number;
  extrudeDraftAngle: number;
  extrudeSymmetric: boolean;
  extrudeBooleanMode: BooleanMode;
  filletChamferAmount: number;
  shellThickness: number;
  revolveAngleDeg: number;
  patternCount: number;
  patternSpacing: number;
  keepToolBodies: boolean;
  globalClearanceOffsetMm: number;

  // Tablet Ergonomics, Radial Menu & Magnetic Loupe
  thumbModifiers: ThumbModifierState;
  radialMenu: RadialMenuState;
  magneticLoupe: MagneticLoupeState;

  // Viewport & Environment
  unit: UnitSystem;
  gridSnapMm: number;
  visualStyle: VisualStyle;
  isOrtho: boolean;
  sectionViewEnabled: boolean;
  sectionPlaneAxis: 'X' | 'Y' | 'Z';
  sectionPlaneOffset: number;
  cameraPresetTrigger: { view: string; seq: number } | null;

  // Kinematic Joint Articulation
  jointArticulationDeg: number;
  isKinematicPlaying: boolean;

  // Modals & Floating Numeric HUD
  isMacrosModalOpen: boolean;
  isBlueprintModalOpen: boolean;
  isMeshDoctorModalOpen: boolean;
  isCommandPaletteOpen: boolean;
  isHoleWizardModalOpen: boolean;
  isInterferenceModalOpen: boolean;
  isSheetMetalBarOpen: boolean;
  numericHud: NumericHUDState;
  statusMessage: string;

  // Pro Subsystems State (Selection Filter, Reference Canvases, Hole Wizard, Sheet Metal, Assemblies, Section Box)
  selectionFilter: SelectionFilterMode;
  sectionBox: SectionBoxBounds;
  referenceCanvases: ReferenceCanvasItem[];
  assemblyJoints: AssemblyJoint[];
  explosionFactor: number;
  interferenceClashes: InterferenceClash[];
  holeWizardParams: HoleWizardParams;
  sheetMetalParams: SheetMetalParams;
  flatPatternResult: {
    flatWidthMm: number;
    flatDepthMm: number;
    bendAllowanceMm: number;
    dxfString: string;
    svgString: string;
  } | null;

  // Actions
  setProjectName: (name: string) => void;
  setProjectHubOpen: (open: boolean) => void;
  syncProjectsFromIndexedDB: () => Promise<void>;
  saveCurrentProjectToDevice: () => Promise<void>;
  openSavedProjectById: (id: string) => Promise<void>;
  duplicateSavedProjectById: (id: string) => Promise<void>;
  renameSavedProjectById: (id: string, newName: string) => Promise<void>;
  deleteSavedProjectById: (id: string) => Promise<void>;

  // 4 Industrial Starter Templates + Blank Project
  createNewEmptyProject: (name?: string) => void;
  loadStarterMechanicalBracket: () => void;
  loadParametricEnclosureBox: () => void;
  loadPlanetaryGearAssembly: () => void;
  loadMedicalDispenserMechanism: () => void;
  loadArticulatedRobotJointAssembly: () => void;

  // Tablet Ergonomics & Gestures
  toggleThumbModifier: (key: keyof ThumbModifierState) => void;
  openRadialMenu: (x: number, y: number) => void;
  closeRadialMenu: () => void;
  setMagneticLoupe: (state: Partial<MagneticLoupeState>) => void;

  setUnit: (unit: UnitSystem) => void;
  setGridSnapMm: (snap: number) => void;
  setVisualStyle: (style: VisualStyle) => void;
  toggleOrtho: () => void;
  toggleSectionView: () => void;
  setSectionPlaneAxis: (axis: 'X' | 'Y' | 'Z') => void;
  setSectionPlaneOffset: (offset: number) => void;
  setSectionBox: (patch: Partial<SectionBoxBounds>) => void;
  triggerCameraView: (view: string) => void;

  setJointArticulationDeg: (deg: number) => void;
  setKinematicPlaying: (playing: boolean) => void;

  setActiveTool: (tool: ActiveTool) => void;
  setSelectionFilter: (filter: SelectionFilterMode) => void;
  clearSelection: () => void;
  selectBody: (bodyId: string, multi?: boolean) => void;
  selectFace: (faceId: string, bodyId: string, multi?: boolean) => void;
  selectEdge: (edgeId: string, bodyId: string, multi?: boolean) => void;
  selectTangentEdgeLoopForSelected: () => void;
  selectCoplanarFaces: () => void;
  selectEqualRadiusFaces: () => void;
  selectTangentFaceChain: () => void;
  invertBodySelection: () => void;
  selectVertex: (vertexId: string, multi?: boolean) => void;
  selectProfile: (profileId: string, multi?: boolean) => void;
  selectSketchPrimitive: (primId: string, multi?: boolean) => void;

  setHoveredSubObject: (
    type: 'face' | 'edge' | 'vertex' | 'profile',
    id: string | null
  ) => void;

  // Live Gizmo Updates & Commits
  setExtrudeParams: (
    params: Partial<{
      distance: number;
      draftAngle: number;
      symmetric: boolean;
      booleanMode: BooleanMode;
    }>
  ) => void;
  commitExtrude: (customDistance?: number) => void;

  setFilletChamferAmount: (val: number) => void;
  commitFilletChamfer: (customAmount?: number) => void;

  setShellThickness: (val: number) => void;
  commitShell: (customThickness?: number) => void;

  commitRevolve: (angleDeg?: number) => void;
  commitSweep: () => void;
  commitLoft: () => void;
  commitBoolean: (mode: 'union' | 'subtract' | 'intersect') => void;
  commitSplitBody: () => void;
  commitLinearPattern: (count?: number, spacing?: number) => void;
  commitCircularPattern: (count?: number) => void;
  commitMirrorBody: () => void;
  applyGlobalToleranceCompensation: (offsetMm: number) => void;

  // Subsystem 1: Advanced 2D & 3D Sketching
  addSlotToActiveSketch: (slotWidth?: number, lengthMm?: number) => void;
  addConicToActiveSketch: (rho?: number) => void;
  addSpiralToActiveSketch: (revolutions?: number, endRadius?: number) => void;
  addEquationCurveToActiveSketch: (xExpr?: string, yExpr?: string) => void;
  addVectorTextToActiveSketch: (text: string, fontSizeMm?: number, arcRadius?: number) => void;
  applySketchCornerFilletOrChamfer: (mode: 'fillet' | 'chamfer', amountMm?: number) => void;
  splitSelectedSketchCurve: () => void;
  projectIntersectionCurveToActiveSketch: () => void;

  // Subsystem 2: Reference Image Canvas & 2-Point Scale Calibrator
  addReferenceCanvas: (name: string, imageUrl: string, plane?: 'XY' | 'XZ' | 'YZ') => void;
  updateReferenceCanvas: (id: string, patch: Partial<ReferenceCanvasItem>) => void;
  removeReferenceCanvas: (id: string) => void;
  calibrateReferenceCanvasScale: (id: string, pixelDist: number, targetRealMm: number) => void;

  // Subsystem 3: Direct Modeling (Delete & Heal, Variable Fillet, Replace Face, Solid Bridge, Emboss/Deboss)
  commitDeleteAndHealFaces: () => void;
  commitVariableRadiusFillet: (rStart: number, rMid: number, rEnd: number, chordal?: boolean) => void;
  commitReplaceFace: () => void;
  commitBridgeFaces: (bulgeTension?: number, continuity?: 'G0' | 'G1' | 'G2') => void;
  commitEmbossOrDebossText: (text: string, depthMm: number, mode: 'emboss' | 'deboss') => void;

  // Subsystem 4: Enclosure & Mechanical Features (Hole Wizard, Rib, Mounting Boss, Lip & Groove)
  setHoleWizardParams: (patch: Partial<HoleWizardParams>) => void;
  commitHoleWizardDrill: () => void;
  commitStructuralRib: (thicknessMm?: number, heightMm?: number) => void;
  commitMountingBoss: (outerDiaMm?: number, innerHoleDiaMm?: number, heightMm?: number) => void;
  commitEnclosureLipGroove: (mode: 'lip' | 'groove', clearanceMm?: number) => void;

  // Subsystem 5: Surface Modeling & Patch Kernel
  commitExtrudeAsSurface: (distanceMm?: number) => void;
  commitBoundaryPatchSurface: (domeBulgeMm?: number) => void;
  commitOffsetSurface: (offsetDistanceMm?: number) => void;
  commitThickenSurface: (thicknessMm?: number) => void;
  commitStitchSurfaces: () => void;

  // Subsystem 6: Sheet Metal & Flat Pattern DXF/SVG
  setSheetMetalParams: (patch: Partial<SheetMetalParams>) => void;
  commitSheetMetalBaseFlange: (widthMm?: number, depthMm?: number) => void;
  commitSheetMetalEdgeFlange: (side?: 'right' | 'left') => void;
  commitSheetMetalHem: () => void;
  generateSheetMetalFlatPattern: () => void;

  // Subsystem 7: Assemblies, Kinematic Joints, Auto-Explode & Interference Check
  addAssemblyJoint: (type: AssemblyJointType, name?: string) => void;
  removeAssemblyJoint: (id: string) => void;
  setExplosionFactor: (factor: number) => void;
  runAssemblyInterferenceCheck: () => void;

  // Primitives & Mechanical Macros
  addPrimitiveSolid: (type: 'box' | 'cylinder' | 'sphere' | 'torus') => void;
  addGearMacro: (params: GearParams) => void;
  addBoltOrNutMacro: (params: BoltParams) => void;
  addSpringMacro: (params: SpringParams) => void;
  addHingeJointMacro: (params: HingeJointParams) => void;
  importExternalGeometry: (geom: THREE.BufferGeometry, name: string) => void;

  // Body Management
  toggleBodyVisibility: (bodyId: string) => void;
  toggleBodyLock: (bodyId: string) => void;
  isolateBody: (bodyId: string) => void;
  updateBodyMaterial: (bodyId: string, patch: Partial<CADMaterial>) => void;
  updateBodyTransform: (bodyId: string, pos: Vec3, rot: Vec3, scale?: Vec3) => void;
  deleteSelectedEntities: () => void;
  duplicateSelectedBody: () => void;

  // 2D Sketching & Constraints
  startSketchOnSelectionOrPlane: (planeId?: string) => void;
  finishActiveSketch: () => void;
  addSketchPrimitiveToActive: (prim: SketchPrimitive) => void;
  updateSketchPrimitivePoints: (primId: string, points: Vec2[], radius?: number) => void;
  toggleSketchPrimitiveConstruction: (primId: string) => void;
  trimActiveSketchAt: (clickPt: Vec2, primId: string) => void;
  offsetSelectedSketchPrim: (distance: number) => void;
  addConstraintToActiveSketch: (
    type: ConstraintType,
    value?: number,
    expression?: string
  ) => void;

  // Variables & Parametric History
  addVariable: (name: string, expression: string, unit?: UnitSystem | 'deg' | 'unitless') => void;
  updateVariable: (id: string, expression: string) => void;
  removeVariable: (id: string) => void;
  setRollbackIndex: (idx: number) => void;
  toggleSuppressFeature: (featureId: string) => void;

  // Undo / Redo & Modals
  pushUndoSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  setMacrosModalOpen: (open: boolean) => void;
  setBlueprintModalOpen: (open: boolean) => void;
  setMeshDoctorModalOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setHoleWizardModalOpen: (open: boolean) => void;
  setInterferenceModalOpen: (open: boolean) => void;
  setSheetMetalBarOpen: (open: boolean) => void;
  openNumericHUD: (config: Partial<NumericHUDState>) => void;
  closeNumericHUD: () => void;
}

const DEFAULT_PLANES: SketchPlane[] = [
  {
    id: 'plane_xy',
    name: 'Üst Düzlem (XY - Taban)',
    origin: [0, 0, 0],
    normal: [0, 0, 1],
    xAxis: [1, 0, 0],
    yAxis: [0, 1, 0],
    visible: true,
  },
  {
    id: 'plane_xz',
    name: 'Ön Düzlem (XZ)',
    origin: [0, 0, 0],
    normal: [0, -1, 0],
    xAxis: [1, 0, 0],
    yAxis: [0, 0, 1],
    visible: false,
  },
  {
    id: 'plane_yz',
    name: 'Yan Düzlem (YZ)',
    origin: [0, 0, 0],
    normal: [1, 0, 0],
    xAxis: [0, 1, 0],
    yAxis: [0, 0, 1],
    visible: false,
  },
];

function buildStarterMechanicalBracketScene(): {
  bodies: CADBody[];
  sketches: Sketch[];
  history: HistoryFeatureNode[];
} {
  const baseSketch: Sketch = {
    id: 'sketch_base_bracket',
    name: 'Eskiz 1 (Taban Plakası)',
    plane: DEFAULT_PLANES[0],
    primitives: [
      {
        id: 'prim_outer_rect',
        type: 'rect',
        points: [
          [-45, -28],
          [45, 28],
        ],
        isConstruction: false,
        status: 'fully',
      },
      {
        id: 'prim_hole_left',
        type: 'circle',
        points: [
          [-28, 0],
          [-21, 0],
        ],
        radius: 7,
        isConstruction: false,
        status: 'fully',
      },
      {
        id: 'prim_hole_right',
        type: 'circle',
        points: [
          [28, 0],
          [35, 0],
        ],
        radius: 7,
        isConstruction: false,
        status: 'fully',
      },
    ],
    constraints: [
      {
        id: 'c_width',
        type: 'distance',
        primitiveIds: ['prim_outer_rect'],
        value: 90,
        expression: 'base_width',
      },
      {
        id: 'c_hole_r',
        type: 'radius',
        primitiveIds: ['prim_hole_left'],
        value: 7,
        expression: 'hole_radius',
      },
    ],
    closedProfiles: [],
    visible: true,
  };
  baseSketch.closedProfiles = detectClosedProfiles(baseSketch);

  const mainProfile = baseSketch.closedProfiles[0];
  let bracketGeom = extrudeProfile3D(mainProfile, DEFAULT_PLANES[0], 12, 0, false);

  const bossOuter = new THREE.CylinderGeometry(18, 18, 28, 36);
  bossOuter.rotateX(Math.PI * 0.5);
  bossOuter.translate(0, 0, 12 + 14 - 1);
  bracketGeom = performCSG(bracketGeom, bossOuter, 'union');

  const bossBore = new THREE.CylinderGeometry(10, 10, 48, 32);
  bossBore.rotateX(Math.PI * 0.5);
  bossBore.translate(0, 0, 20);
  bracketGeom = performCSG(bracketGeom, bossBore, 'subtract');

  const bracketBody = createCADBodyFromGeometry(
    bracketGeom,
    'Rulman_Yatagi_Govde',
    DEFAULT_MATERIALS.aluminum,
    'body_starter_bracket'
  );

  const boltGeom = generateISOBoltOrNutGeometry({
    nominalDiameterMm: 10,
    pitchMm: 1.5,
    lengthMm: 28,
    headHeightMm: 7,
    isNut: false,
  });
  boltGeom.translate(-28, 0, -8);
  const boltBody = createCADBodyFromGeometry(
    boltGeom,
    'ISO_M10_Sabitleme_Civatasi',
    DEFAULT_MATERIALS.steel,
    'body_starter_bolt'
  );

  const history: HistoryFeatureNode[] = [
    {
      id: 'feat_1',
      name: 'Eskiz 1 (Taban Profili)',
      type: 'sketch',
      suppressed: false,
      timestamp: Date.now() - 40000,
      params: { profiles: 3 },
      targetBodyIds: [],
    },
    {
      id: 'feat_2',
      name: 'Extrude 1 (12.0 mm)',
      type: 'extrude',
      suppressed: false,
      timestamp: Date.now() - 30000,
      params: { distance: 12, draftAngle: 0 },
      targetBodyIds: ['body_starter_bracket'],
      resultBodyId: 'body_starter_bracket',
    },
    {
      id: 'feat_3',
      name: 'Rulman Yatağı & Ø20 Delik (CSG)',
      type: 'boolean',
      suppressed: false,
      timestamp: Date.now() - 20000,
      params: { mode: 'subtract', boreRadius: 10 },
      targetBodyIds: ['body_starter_bracket'],
    },
    {
      id: 'feat_4',
      name: 'Mekanik Makro: ISO M10 Cıvata',
      type: 'macro_bolt',
      suppressed: false,
      timestamp: Date.now() - 10000,
      params: { diameter: 10, pitch: 1.5, length: 28 },
      targetBodyIds: ['body_starter_bolt'],
      resultBodyId: 'body_starter_bolt',
    },
  ];

  return {
    bodies: [bracketBody, boltBody],
    sketches: [baseSketch],
    history,
  };
}

let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleDebouncedAutoSave(getStore: () => CADStoreState) {
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    void getStore().saveCurrentProjectToDevice();
  }, 2500);
}

export const useCADStore = create<CADStoreState>((set, get) => {
  const starter = buildStarterMechanicalBracketScene();

  return {
    projectName: 'Hassas_Rulman_Yatagi_Blok',
    activeProjectId: 'proj_bearing_block',
    savedProjects: [
      {
        id: 'proj_bearing_block',
        name: 'Hassas_Rulman_Yatagi_Blok',
        category: 'Hassas Mekanik Yatak + ISO M10 Vida',
        updatedAt: 'Az önce kaydedildi',
        partCount: 2,
        fileSizeKb: 148,
        thumbnailDataUrl: generateFallbackSVGThumbnail('Rulman Yatağı & M10 Cıvata', '#38bdf8'),
      },
      {
        id: 'proj_enclosure_box',
        name: 'SnapFit_Elektronik_Kutu_PCB',
        category: 'Parametrik Kutu + PCB Burçları',
        updatedAt: 'Endüstriyel Şablon',
        partCount: 2,
        fileSizeKb: 164,
        thumbnailDataUrl: generateFallbackSVGThumbnail('Snap-Fit Elektronik Kutu', '#10b981'),
      },
      {
        id: 'proj_planetary_gear',
        name: 'Planet_Disli_Reduktor_Montaji',
        category: 'Involute Dişli Grubu + Helezon Yay',
        updatedAt: 'Endüstriyel Şablon',
        partCount: 3,
        fileSizeKb: 212,
        thumbnailDataUrl: generateFallbackSVGThumbnail('Planet Dişli Redüktör', '#f59e0b'),
      },
      {
        id: 'proj_medical_dispenser',
        name: 'Medikal_Bant_Bicak_Mekanizmasi',
        category: 'Tıbbi Cihaz Makarası & Kesici Kol',
        updatedAt: 'Endüstriyel Şablon',
        partCount: 3,
        fileSizeKb: 186,
        thumbnailDataUrl: generateFallbackSVGThumbnail('Medikal Bant & Kesici', '#a855f7'),
      },
    ],
    isProjectHubOpen: false,
    autoSaveStatus: 'offline_ready',
    lastSavedTimestamp: Date.now(),

    bodies: starter.bodies,
    sketches: starter.sketches,
    constructionPlanes: DEFAULT_PLANES,
    activeSketchId: null,
    variables: [
      {
        id: 'var_1',
        name: 'base_width',
        expression: '90mm',
        value: 90,
        unit: 'mm',
        description: 'Ana taban plaka genişliği',
      },
      {
        id: 'var_2',
        name: 'hole_radius',
        expression: '7mm',
        value: 7,
        unit: 'mm',
        description: 'Montaj cıvata deliği yarıçapı',
      },
      {
        id: 'var_3',
        name: 'wall_thickness',
        expression: '3mm',
        value: 3,
        unit: 'mm',
        description: 'Kabuk (Shell) et kalınlığı',
      },
      {
        id: 'var_4',
        name: 'print_clearance',
        expression: '0.25mm',
        value: 0.25,
        unit: 'mm',
        description: '3D Yazıcı hareketli eklem boşluğu',
      },
    ],
    history: starter.history,
    rollbackIndex: starter.history.length - 1,

    undoStack: [],
    redoStack: [],

    selectedBodyIds: ['body_starter_bracket'],
    selectedFaceIds: [],
    selectedEdgeIds: [],
    selectedVertexIds: [],
    selectedProfileIds: [],
    selectedSketchPrimIds: [],

    hoveredFaceId: null,
    hoveredEdgeId: null,
    hoveredVertexId: null,
    hoveredProfileId: null,

    activeTool: 'select',
    extrudeDistance: 20,
    extrudeDraftAngle: 0,
    extrudeSymmetric: false,
    extrudeBooleanMode: 'union',
    filletChamferAmount: 2.5,
    shellThickness: 2.5,
    revolveAngleDeg: 360,
    patternCount: 3,
    patternSpacing: 35,
    keepToolBodies: false,
    globalClearanceOffsetMm: 0.0,

    thumbModifiers: {
      multiSelect: false,
      snapOverride: false,
      constructionMode: false,
      boxSelectMode: false,
      leftHanded: true,
    },
    radialMenu: {
      visible: false,
      x: 0,
      y: 0,
    },
    magneticLoupe: {
      visible: false,
      x: 0,
      y: 0,
      worldCoordsLabel: '0.0, 0.0 mm',
    },

    unit: 'mm',
    gridSnapMm: 1.0,
    visualStyle: 'shaded_edges',
    isOrtho: false,
    sectionViewEnabled: false,
    sectionPlaneAxis: 'Y',
    sectionPlaneOffset: 0,
    cameraPresetTrigger: null,

    jointArticulationDeg: 0,
    isKinematicPlaying: false,

    isMacrosModalOpen: false,
    isBlueprintModalOpen: false,
    isMeshDoctorModalOpen: false,
    isCommandPaletteOpen: false,
    isHoleWizardModalOpen: false,
    isInterferenceModalOpen: false,
    isSheetMetalBarOpen: false,
    numericHud: {
      visible: false,
      screenX: 420,
      screenY: 260,
      label: 'Extrude Mesafesi',
      value: '20',
      unit: 'mm',
      targetField: 'extrude',
    },
    statusMessage:
      'SHAPR-PRO Hazır • Bir yüzeye (Face) veya kenara (Edge) dokunarak doğrudan 3D modellemeye başlayın.',

    selectionFilter: 'all',
    sectionBox: {
      enabled: false,
      minX: -65,
      maxX: 65,
      minY: -65,
      maxY: 65,
      minZ: -20,
      maxZ: 65,
    },
    referenceCanvases: [],
    assemblyJoints: [
      {
        id: 'joint_default_1',
        name: 'Merkez Rulman Döner Mafsalı (Revolute)',
        type: 'revolute',
        bodyAId: 'body_starter_bracket',
        bodyBId: 'body_starter_pinion',
        anchorWorld: [26, 0, 12],
        axisWorld: [0, 0, 1],
        minLimit: -180,
        maxLimit: 180,
        currentValue: 0,
        gearRatio: 1.5,
      },
    ],
    explosionFactor: 0,
    interferenceClashes: [],
    holeWizardParams: {
      holeType: 'counterbore',
      isoSize: 'M6',
      fitClass: 'normal',
      depthMode: 'through_all',
      depthMm: 18,
      tipAngleDeg: 118,
      position: [0, 14, 12],
      normal: [0, 0, 1],
    },
    sheetMetalParams: { ...DEFAULT_SHEET_METAL_PARAMS },
    flatPatternResult: null,

    setProjectName: (name) => {
      set({ projectName: name });
      scheduleDebouncedAutoSave(get);
    },
    setProjectHubOpen: (open) => set({ isProjectHubOpen: open }),

    syncProjectsFromIndexedDB: async () => {
      const stored = await listAllProjectsFromIDB();
      if (stored.length === 0) return;
      const mapped: SavedCADProject[] = stored.map((rec) => ({
        id: rec.id,
        name: rec.name,
        category: rec.category,
        updatedAt: new Date(rec.updatedAt).toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        partCount: rec.bodyCount,
        fileSizeKb: rec.fileSizeKb,
        thumbnailDataUrl: rec.thumbnailDataUrl,
      }));
      set((s) => {
        const existingIds = new Set(mapped.map((m) => m.id));
        const builtins = s.savedProjects.filter((p) => !existingIds.has(p.id));
        return { savedProjects: [...mapped, ...builtins] };
      });
    },

    saveCurrentProjectToDevice: async () => {
      const s = get();
      set({ autoSaveStatus: 'saving' });
      const payload = serializeProjectToSHAPRX(
        s.projectName,
        s.bodies,
        s.sketches,
        s.variables,
        s.history
      );
      const sizeKb = Math.max(12, Math.round(payload.length / 1024));
      const thumb = captureViewportThumbnail();

      const record: StoredProjectRecord = {
        id: s.activeProjectId,
        name: s.projectName,
        category: `${s.bodies.length} Katı Gövde • ${s.sketches.length} Eskiz`,
        updatedAt: Date.now(),
        bodyCount: s.bodies.length,
        fileSizeKb: sizeKb,
        thumbnailDataUrl: thumb,
        serializedPayload: payload,
      };

      await saveProjectRecordToIDB(record);
      set({
        autoSaveStatus: 'saved',
        lastSavedTimestamp: Date.now(),
      });
      await get().syncProjectsFromIndexedDB();
    },

    openSavedProjectById: async (id) => {
      if (id === 'proj_bearing_block') {
        get().loadStarterMechanicalBracket();
        return;
      }
      if (id === 'proj_enclosure_box') {
        get().loadParametricEnclosureBox();
        return;
      }
      if (id === 'proj_planetary_gear') {
        get().loadPlanetaryGearAssembly();
        return;
      }
      if (id === 'proj_medical_dispenser') {
        get().loadMedicalDispenserMechanism();
        return;
      }

      const rec = await getProjectFromIDB(id);
      if (!rec) return;

      try {
        const parsed = JSON.parse(rec.serializedPayload);
        const restoredBodies: CADBody[] = (parsed.bodies || []).map(
          (b: {
            id: string;
            name: string;
            positions: number[];
            indices: number[];
            material: CADMaterial;
            transform: CADBody['transform'];
          }) => {
            const g = new THREE.BufferGeometry();
            g.setAttribute(
              'position',
              new THREE.Float32BufferAttribute(b.positions || [], 3)
            );
            if (b.indices && b.indices.length > 0) {
              g.setIndex(b.indices);
            }
            const cadBody = createCADBodyFromGeometry(g, b.name, b.material, b.id);
            if (b.transform) cadBody.transform = b.transform;
            return cadBody;
          }
        );

        set({
          activeProjectId: rec.id,
          projectName: rec.name,
          bodies: restoredBodies,
          sketches: parsed.sketches || [],
          variables: parsed.variables || [],
          history: parsed.history || [],
          rollbackIndex: (parsed.history?.length || 1) - 1,
          isProjectHubOpen: false,
          statusMessage: `${rec.name} yerel IndexedDB depolamasından yüklendi.`,
        });
      } catch {
        // Ignore parse error
      }
    },

    duplicateSavedProjectById: async (id) => {
      const s = get();
      const target = s.savedProjects.find((p) => p.id === id);
      if (!target) return;
      const newId = `proj_${Date.now()}`;
      const copyCard: SavedCADProject = {
        ...target,
        id: newId,
        name: `${target.name}_Kopya`,
        updatedAt: 'Az önce kopyalandı',
      };
      set({ savedProjects: [copyCard, ...s.savedProjects] });
      triggerHapticPulse('commit');
    },

    renameSavedProjectById: async (id, newName) => {
      const rec = await getProjectFromIDB(id);
      if (rec) {
        rec.name = newName;
        await saveProjectRecordToIDB(rec);
      }
      set((s) => ({
        projectName: s.activeProjectId === id ? newName : s.projectName,
        savedProjects: s.savedProjects.map((p) =>
          p.id === id ? { ...p, name: newName } : p
        ),
      }));
    },

    deleteSavedProjectById: async (id) => {
      await deleteProjectFromIDB(id);
      set((s) => ({
        savedProjects: s.savedProjects.filter((p) => p.id !== id),
      }));
    },

    createNewEmptyProject: (name = 'Yeni_Endustriyel_Proje') => {
      get().pushUndoSnapshot();
      const emptySketch: Sketch = {
        id: uuidv4(),
        name: 'Eskiz 1 (Taban XY)',
        plane: DEFAULT_PLANES[0],
        primitives: [],
        constraints: [],
        closedProfiles: [],
        visible: true,
      };
      set({
        activeProjectId: `proj_${Date.now()}`,
        projectName: name,
        bodies: [],
        sketches: [emptySketch],
        activeSketchId: null,
        history: [],
        rollbackIndex: -1,
        selectedBodyIds: [],
        selectedFaceIds: [],
        selectedEdgeIds: [],
        selectedProfileIds: [],
        isProjectHubOpen: false,
        statusMessage: `${name} oluşturuldu.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    // TEMPLATE 1: Precision Mechanical Bearing Block
    loadStarterMechanicalBracket: () => {
      get().pushUndoSnapshot();
      const scene = buildStarterMechanicalBracketScene();
      set({
        activeProjectId: 'proj_bearing_block',
        projectName: 'Hassas_Rulman_Yatagi_Blok',
        bodies: scene.bodies,
        sketches: scene.sketches,
        history: scene.history,
        rollbackIndex: scene.history.length - 1,
        selectedBodyIds: [scene.bodies[0].id],
        selectedFaceIds: [],
        selectedEdgeIds: [],
        activeSketchId: null,
        isProjectHubOpen: false,
        statusMessage: 'Şablon 1: Hassas Rulman Yatağı ve ISO M10 Cıvata yüklendi.',
      });
      scheduleDebouncedAutoSave(get);
    },

    // TEMPLATE 2: Parametric Enclosure Box with Snap-Fit Lid & PCB Bosses
    loadParametricEnclosureBox: () => {
      get().pushUndoSnapshot();
      const outerBox = new THREE.BoxGeometry(92, 64, 28);
      outerBox.translate(0, 0, 14);
      const innerCavity = new THREE.BoxGeometry(84, 56, 26);
      innerCavity.translate(0, 0, 16);
      let enclosureGeom = performCSG(outerBox, innerCavity, 'subtract');

      // Add 4 corner PCB Standoff Mounting Bosses inside the enclosure
      const bossPositions: [number, number][] = [
        [-34, -20],
        [34, -20],
        [34, 20],
        [-34, 20],
      ];
      for (const [bx, by] of bossPositions) {
        const standOff = new THREE.CylinderGeometry(4.5, 4.5, 10, 20);
        standOff.rotateX(Math.PI * 0.5);
        standOff.translate(bx, by, 7);
        enclosureGeom = performCSG(enclosureGeom, standOff, 'union');
      }

      const baseEnclosure = createCADBodyFromGeometry(
        enclosureGeom,
        'Alt_Elektronik_Muhafaza_Kutu',
        DEFAULT_MATERIALS.carbon_petg
      );

      // Snap-fit translucent top lid (raised in exploded view at Z = 36)
      const lidPlate = new THREE.BoxGeometry(92, 64, 4);
      lidPlate.translate(0, 0, 38);
      const lidLip = new THREE.BoxGeometry(83.4, 55.4, 3);
      lidLip.translate(0, 0, 35);
      const lidGeom = performCSG(lidPlate, lidLip, 'union');
      const snapLid = createCADBodyFromGeometry(
        lidGeom,
        'Ust_SnapFit_Kapak',
        { ...DEFAULT_MATERIALS.aluminum, opacity: 0.78 }
      );
      snapLid.kinematics = {
        role: 'revolute_joint',
        axis: [1, 0, 0],
        pivot: [0, 32, 28],
        minAngleDeg: -75,
        maxAngleDeg: 75,
        currentAngleDeg: 0,
      };

      const history: HistoryFeatureNode[] = [
        {
          id: uuidv4(),
          name: 'Dış Kutu Gövde (92×64×28 mm)',
          type: 'extrude',
          suppressed: false,
          timestamp: Date.now() - 30000,
          params: { distance: 28 },
          targetBodyIds: [baseEnclosure.id],
        },
        {
          id: uuidv4(),
          name: 'Kabuk (Shell Et Kalınlığı 4.0 mm)',
          type: 'shell',
          suppressed: false,
          timestamp: Date.now() - 20000,
          params: { thickness: 4 },
          targetBodyIds: [baseEnclosure.id],
        },
        {
          id: uuidv4(),
          name: '4x PCB Montaj Burcu + Snap-Fit Kapak',
          type: 'boolean',
          suppressed: false,
          timestamp: Date.now() - 10000,
          params: { bosses: 4 },
          targetBodyIds: [baseEnclosure.id, snapLid.id],
        },
      ];

      set({
        activeProjectId: 'proj_enclosure_box',
        projectName: 'SnapFit_Elektronik_Kutu_PCB',
        bodies: [baseEnclosure, snapLid],
        history,
        rollbackIndex: history.length - 1,
        selectedBodyIds: [baseEnclosure.id],
        selectedFaceIds: [],
        selectedEdgeIds: [],
        activeSketchId: null,
        isProjectHubOpen: false,
        statusMessage: 'Şablon 2: Snap-Fit Elektronik Muhafaza Kutusu ve PCB Burçları yüklendi.',
      });
      scheduleDebouncedAutoSave(get);
    },

    // TEMPLATE 3: Planetary Gear Assembly
    loadPlanetaryGearAssembly: () => {
      get().pushUndoSnapshot();
      const gearBigGeom = generateInvoluteGearGeometry({
        moduleMm: 2.5,
        teeth: 18,
        thicknessMm: 12,
        pressureAngleDeg: 20,
        boreDiameterMm: 12,
      });
      gearBigGeom.translate(-26, 0, 0);
      const gearBig = createCADBodyFromGeometry(
        gearBigGeom,
        'Ana_Gunes_Disli_Z18',
        DEFAULT_MATERIALS.brass
      );
      gearBig.kinematics = {
        role: 'rotating_gear',
        axis: [0, 0, 1],
        pivot: [-26, 0, 0],
        minAngleDeg: -360,
        maxAngleDeg: 360,
        currentAngleDeg: 0,
        gearRatio: 1.0,
      };

      const gearPinionGeom = generateInvoluteGearGeometry({
        moduleMm: 2.5,
        teeth: 12,
        thicknessMm: 12,
        pressureAngleDeg: 20,
        boreDiameterMm: 8,
      });
      gearPinionGeom.translate(14, 0, 0);
      const gearPinion = createCADBodyFromGeometry(
        gearPinionGeom,
        'Gezegen_Pinyon_Disli_Z12',
        DEFAULT_MATERIALS.steel
      );
      gearPinion.kinematics = {
        role: 'rotating_gear',
        axis: [0, 0, 1],
        pivot: [14, 0, 0],
        minAngleDeg: -360,
        maxAngleDeg: 360,
        currentAngleDeg: 0,
        gearRatio: -1.5,
      };

      const springGeom = generateCoilSpringGeometry({
        meanDiameterMm: 22,
        wireDiameterMm: 3,
        activeCoils: 5,
        freeLengthMm: 34,
      });
      springGeom.translate(-26, 0, 12);
      const springBody = createCADBodyFromGeometry(
        springGeom,
        'On_Gerilme_Helezon_Yayi',
        DEFAULT_MATERIALS.aluminum
      );

      set({
        activeProjectId: 'proj_planetary_gear',
        projectName: 'Planet_Disli_Reduktor_Montaji',
        bodies: [gearBig, gearPinion, springBody],
        selectedBodyIds: [gearBig.id],
        selectedFaceIds: [],
        selectedEdgeIds: [],
        activeSketchId: null,
        isProjectHubOpen: false,
        statusMessage: 'Şablon 3: Planet Dişli Redüktör ve Helezon Yay Montajı yüklendi.',
      });
      scheduleDebouncedAutoSave(get);
    },

    // TEMPLATE 4: Medical / Lab Tape & Blade Dispenser Mechanism
    loadMedicalDispenserMechanism: () => {
      get().pushUndoSnapshot();
      // 1. Dispenser Side Frame Chassis with Tape Spool Hub
      const frameBox = new THREE.BoxGeometry(96, 36, 44);
      frameBox.translate(0, 0, 22);
      const spoolWell = new THREE.CylinderGeometry(24, 24, 26, 32);
      spoolWell.translate(-16, 0, 26);
      let dispenserGeom = performCSG(frameBox, spoolWell, 'subtract');

      const spoolHub = new THREE.CylinderGeometry(10, 10, 38, 28);
      spoolHub.translate(-16, 0, 22);
      dispenserGeom = performCSG(dispenserGeom, spoolHub, 'union');

      const chassisBody = createCADBodyFromGeometry(
        dispenserGeom,
        'Medikal_Dispenser_Ana_Govde',
        DEFAULT_MATERIALS.med_abs
      );

      // 2. Rotating Tape Roll Ring
      const rollOuter = new THREE.CylinderGeometry(21, 21, 22, 36);
      const rollInner = new THREE.CylinderGeometry(11, 11, 26, 32);
      const rollGeom = performCSG(rollOuter, rollInner, 'subtract');
      rollGeom.translate(-16, 0, 26);
      const tapeRollBody = createCADBodyFromGeometry(
        rollGeom,
        'Steril_Bant_Makarasi',
        DEFAULT_MATERIALS.pla_blue
      );
      tapeRollBody.kinematics = {
        role: 'rotating_gear',
        axis: [0, 1, 0],
        pivot: [-16, 0, 26],
        minAngleDeg: -360,
        maxAngleDeg: 360,
        currentAngleDeg: 0,
        gearRatio: 1.0,
      };

      // 3. Articulated Stainless Steel Serrated Cutter Blade Arm
      const cutterArmGeom = new THREE.BoxGeometry(28, 32, 6);
      cutterArmGeom.translate(34, 0, 44);
      const cutterBody = createCADBodyFromGeometry(
        cutterArmGeom,
        'Kesici_Bicak_Mekanizmasi',
        DEFAULT_MATERIALS.steel
      );
      cutterBody.kinematics = {
        role: 'revolute_joint',
        axis: [0, 1, 0],
        pivot: [22, 0, 44],
        minAngleDeg: -45,
        maxAngleDeg: 45,
        currentAngleDeg: 0,
      };

      set({
        activeProjectId: 'proj_medical_dispenser',
        projectName: 'Medikal_Bant_Bicak_Mekanizmasi',
        bodies: [chassisBody, tapeRollBody, cutterBody],
        selectedBodyIds: [chassisBody.id],
        selectedFaceIds: [],
        selectedEdgeIds: [],
        activeSketchId: null,
        isProjectHubOpen: false,
        statusMessage: 'Şablon 4: Medikal / Laboratuvar Bant ve Kesici Bıçak Mekanizması yüklendi.',
      });
      scheduleDebouncedAutoSave(get);
    },

    loadArticulatedRobotJointAssembly: () => {
      get().pushUndoSnapshot();
      const clevisGeom = generateArticulatedHingeGeometry({
        widthMm: 44,
        lengthMm: 36,
        heightMm: 36,
        pinDiameterMm: 10,
        clearanceMm: 0.3,
      });
      const clevisBody = createCADBodyFromGeometry(
        clevisGeom,
        'Alt_Mafsal_Catal_Govde',
        DEFAULT_MATERIALS.aluminum
      );

      const armGeom = new THREE.BoxGeometry(14, 24, 56);
      armGeom.translate(0, 0, 48);
      const armBody = createCADBodyFromGeometry(
        armGeom,
        'Ust_Hareketli_Robot_Kol',
        DEFAULT_MATERIALS.pla_blue
      );
      armBody.kinematics = {
        role: 'revolute_joint',
        axis: [1, 0, 0],
        pivot: [0, 0, 26],
        minAngleDeg: -75,
        maxAngleDeg: 75,
        currentAngleDeg: 25,
      };

      const pinBoltGeom = generateISOBoltOrNutGeometry({
        nominalDiameterMm: 10,
        pitchMm: 1.5,
        lengthMm: 48,
        headHeightMm: 6,
      });
      pinBoltGeom.rotateY(Math.PI * 0.5);
      pinBoltGeom.translate(-24, 0, 26);
      const pinBody = createCADBodyFromGeometry(
        pinBoltGeom,
        'M10_Mafsal_Merkez_Pimi',
        DEFAULT_MATERIALS.steel
      );

      set({
        projectName: 'Hareketli_Robot_Kol_Mafsali',
        bodies: [clevisBody, armBody, pinBody],
        selectedBodyIds: [armBody.id],
        selectedFaceIds: [],
        selectedEdgeIds: [],
        activeSketchId: null,
        jointArticulationDeg: 25,
        isProjectHubOpen: false,
        statusMessage: 'Hareketli Robot Kol Mafsalı yüklendi.',
      });
      scheduleDebouncedAutoSave(get);
    },

    toggleThumbModifier: (key) => {
      triggerHapticPulse('snap');
      set((s) => ({
        thumbModifiers: {
          ...s.thumbModifiers,
          [key]: !s.thumbModifiers[key],
        },
      }));
    },

    openRadialMenu: (x, y) => {
      triggerHapticPulse('radial');
      set({ radialMenu: { visible: true, x, y } });
    },

    closeRadialMenu: () =>
      set((s) => ({ radialMenu: { ...s.radialMenu, visible: false } })),

    setMagneticLoupe: (patch) =>
      set((s) => ({ magneticLoupe: { ...s.magneticLoupe, ...patch } })),

    setUnit: (unit) => set({ unit }),
    setGridSnapMm: (gridSnapMm) => set({ gridSnapMm }),
    setVisualStyle: (visualStyle) => set({ visualStyle }),
    toggleOrtho: () => set((s) => ({ isOrtho: !s.isOrtho })),
    toggleSectionView: () => set((s) => ({ sectionViewEnabled: !s.sectionViewEnabled })),
    setSectionPlaneAxis: (sectionPlaneAxis) => set({ sectionPlaneAxis }),
    setSectionPlaneOffset: (sectionPlaneOffset) => set({ sectionPlaneOffset }),
    triggerCameraView: (view) =>
      set((s) => ({
        cameraPresetTrigger: { view, seq: (s.cameraPresetTrigger?.seq || 0) + 1 },
      })),

    setJointArticulationDeg: (jointArticulationDeg) => set({ jointArticulationDeg }),
    setKinematicPlaying: (isKinematicPlaying) => set({ isKinematicPlaying }),

    setActiveTool: (tool) => {
      const state = get();
      triggerHapticPulse('snap');
      if (tool.startsWith('sketch_') && !state.activeSketchId) {
        state.startSketchOnSelectionOrPlane();
      }
      set({ activeTool: tool });

      if (tool === 'extrude') {
        state.openNumericHUD({
          visible: true,
          label: 'Extrude Mesafesi',
          value: String(state.extrudeDistance),
          unit: state.unit,
          targetField: 'extrude',
        });
      } else if (tool === 'fillet_chamfer') {
        state.openNumericHUD({
          visible: true,
          label: state.filletChamferAmount >= 0 ? 'Fillet Yarıçapı' : 'Chamfer Pah',
          value: String(state.filletChamferAmount),
          unit: state.unit,
          targetField: 'fillet',
        });
      } else if (tool === 'shell') {
        state.openNumericHUD({
          visible: true,
          label: 'Kabuk Et Kalınlığı',
          value: String(state.shellThickness),
          unit: state.unit,
          targetField: 'shell',
        });
      }
    },

    clearSelection: () =>
      set({
        selectedBodyIds: [],
        selectedFaceIds: [],
        selectedEdgeIds: [],
        selectedVertexIds: [],
        selectedProfileIds: [],
        selectedSketchPrimIds: [],
        activeTool: get().activeSketchId ? get().activeTool : 'select',
        numericHud: { ...get().numericHud, visible: false },
      }),

    selectBody: (bodyId, multi = false) => {
      triggerHapticPulse('snap');
      const useMulti = multi || get().thumbModifiers.multiSelect;
      set((s) => {
        const exists = s.selectedBodyIds.includes(bodyId);
        const next = useMulti
          ? exists
            ? s.selectedBodyIds.filter((id) => id !== bodyId)
            : [...s.selectedBodyIds, bodyId]
          : [bodyId];
        return {
          selectedBodyIds: next,
          selectedFaceIds: [],
          selectedEdgeIds: [],
          selectedVertexIds: [],
          selectedProfileIds: [],
        };
      });
    },

    selectFace: (faceId, bodyId, multi = false) => {
      triggerHapticPulse('snap');
      const useMulti = multi || get().thumbModifiers.multiSelect;
      set((s) => {
        const exists = s.selectedFaceIds.includes(faceId);
        const nextFaces = useMulti
          ? exists
            ? s.selectedFaceIds.filter((id) => id !== faceId)
            : [...s.selectedFaceIds, faceId]
          : [faceId];
        return {
          selectedFaceIds: nextFaces,
          selectedBodyIds: [bodyId],
          selectedEdgeIds: [],
          selectedVertexIds: [],
          selectedProfileIds: [],
          statusMessage: `Yüzey seçildi (${faceId}) • Push/Pull Extrude, Kabuk (Shell) veya Yüzeyde Eskiz başlatabilirsiniz.`,
        };
      });
    },

    selectEdge: (edgeId, bodyId, multi = false) => {
      triggerHapticPulse('snap');
      const useMulti = multi || get().thumbModifiers.multiSelect;
      set((s) => {
        const exists = s.selectedEdgeIds.includes(edgeId);
        const nextEdges = useMulti
          ? exists
            ? s.selectedEdgeIds.filter((id) => id !== edgeId)
            : [...s.selectedEdgeIds, edgeId]
          : [edgeId];
        return {
          selectedEdgeIds: nextEdges,
          selectedBodyIds: [bodyId],
          selectedFaceIds: [],
          selectedVertexIds: [],
          selectedProfileIds: [],
          statusMessage: `Kenar seçildi (${nextEdges.length} adet) • Fillet (Yuvarlatma) veya Chamfer (Pah Kırma) uygulayabilirsiniz.`,
        };
      });
    },

    selectTangentEdgeLoopForSelected: () => {
      const s = get();
      if (s.selectedEdgeIds.length === 0 || s.selectedBodyIds.length === 0) return;
      const body = s.bodies.find((b) => b.id === s.selectedBodyIds[0]);
      if (!body) return;
      const loopIds = new Set<string>();
      for (const eid of s.selectedEdgeIds) {
        const found = body.topology.faces
          .filter((f) => f.boundaryEdgeIds.includes(eid))
          .flatMap((f) => f.boundaryEdgeIds);
        found.forEach((id) => loopIds.add(id));
      }
      triggerHapticPulse('angle');
      set({
        selectedEdgeIds: Array.from(loopIds),
        statusMessage: `Teğet kenar halkası seçildi (${loopIds.size} kenar).`,
      });
    },

    selectVertex: (vertexId, multi = false) =>
      set((s) => ({
        selectedVertexIds: multi ? [...s.selectedVertexIds, vertexId] : [vertexId],
      })),

    selectProfile: (profileId, multi = false) => {
      triggerHapticPulse('snap');
      const useMulti = multi || get().thumbModifiers.multiSelect;
      set((s) => {
        const exists = s.selectedProfileIds.includes(profileId);
        const next = useMulti
          ? exists
            ? s.selectedProfileIds.filter((id) => id !== profileId)
            : [...s.selectedProfileIds, profileId]
          : [profileId];
        return {
          selectedProfileIds: next,
          selectedFaceIds: [],
          selectedEdgeIds: [],
          statusMessage: `Kapalı 2D Profil seçildi • Extrude, Revolve, Sweep veya Loft yapabilirsiniz.`,
        };
      });
    },

    selectSketchPrimitive: (primId, multi = false) =>
      set((s) => {
        const useMulti = multi || s.thumbModifiers.multiSelect;
        const exists = s.selectedSketchPrimIds.includes(primId);
        const next = useMulti
          ? exists
            ? s.selectedSketchPrimIds.filter((id) => id !== primId)
            : [...s.selectedSketchPrimIds, primId]
          : [primId];
        return { selectedSketchPrimIds: next };
      }),

    setHoveredSubObject: (type, id) => {
      if (type === 'face') set({ hoveredFaceId: id, hoveredEdgeId: null });
      else if (type === 'edge') set({ hoveredEdgeId: id, hoveredFaceId: null });
      else if (type === 'vertex') set({ hoveredVertexId: id });
      else if (type === 'profile') set({ hoveredProfileId: id });
    },

    setExtrudeParams: (params) => {
      const prevDist = get().extrudeDistance;
      if (
        params.distance !== undefined &&
        Math.sign(params.distance) !== Math.sign(prevDist)
      ) {
        // Trigger crisp boolean mode transition haptic pulse when crossing 0
        triggerHapticPulse('boolean');
      }
      set((s) => ({
        extrudeDistance: params.distance ?? s.extrudeDistance,
        extrudeDraftAngle: params.draftAngle ?? s.extrudeDraftAngle,
        extrudeSymmetric: params.symmetric ?? s.extrudeSymmetric,
        extrudeBooleanMode: params.booleanMode ?? s.extrudeBooleanMode,
      }));
    },

    commitExtrude: (customDistance) => {
      const s = get();
      const dist = customDistance ?? s.extrudeDistance;
      if (Math.abs(dist) < 0.1) return;

      triggerHapticPulse('commit');
      s.pushUndoSnapshot();

      if (s.selectedFaceIds.length > 0 && s.selectedBodyIds.length > 0) {
        const bodyId = s.selectedBodyIds[0];
        const faceId = s.selectedFaceIds[0];
        const targetBody = s.bodies.find((b) => b.id === bodyId);
        if (!targetBody) return;

        const newGeom = extrudeTopologicalFace(
          targetBody,
          faceId,
          dist,
          s.extrudeDraftAngle
        );
        const updatedBody = createCADBodyFromGeometry(
          newGeom,
          targetBody.name,
          targetBody.material,
          targetBody.id
        );
        updatedBody.transform = { ...targetBody.transform };
        updatedBody.kinematics = targetBody.kinematics;

        const newFeature: HistoryFeatureNode = {
          id: uuidv4(),
          name: `Push/Pull Yüzey (${dist > 0 ? '+' : ''}${dist.toFixed(1)} mm)`,
          type: 'extrude',
          suppressed: false,
          timestamp: Date.now(),
          params: { distance: dist, draftAngle: s.extrudeDraftAngle, faceId },
          targetBodyIds: [bodyId],
          resultBodyId: bodyId,
        };

        set({
          bodies: s.bodies.map((b) => (b.id === bodyId ? updatedBody : b)),
          history: [...s.history, newFeature],
          rollbackIndex: s.history.length,
          selectedFaceIds: [],
          activeTool: 'select',
          numericHud: { ...s.numericHud, visible: false },
          statusMessage: `Yüzey ${dist.toFixed(1)} mm katılandı (Direct Push/Pull).`,
        });
        scheduleDebouncedAutoSave(get);
        return;
      }

      let targetProfiles = s.sketches
        .flatMap((sk) => sk.closedProfiles.map((p) => ({ profile: p, plane: sk.plane })))
        .filter((item) => s.selectedProfileIds.includes(item.profile.id));

      if (targetProfiles.length === 0 && s.sketches.length > 0) {
        const lastSketch = s.sketches[s.sketches.length - 1];
        if (lastSketch.closedProfiles.length > 0) {
          targetProfiles = [
            { profile: lastSketch.closedProfiles[0], plane: lastSketch.plane },
          ];
        }
      }

      if (targetProfiles.length === 0) return;

      let nextBodies = [...s.bodies];
      for (const { profile, plane } of targetProfiles) {
        const prismGeom = extrudeProfile3D(
          profile,
          plane,
          dist,
          s.extrudeDraftAngle,
          s.extrudeSymmetric
        );

        const autoDetect = detectAutoBooleanMode(
          prismGeom,
          nextBodies,
          dist,
          plane.sourceBodyId
        );
        const mode =
          s.extrudeBooleanMode !== 'union' ? s.extrudeBooleanMode : autoDetect.mode;

        if (mode === 'new_body' || !autoDetect.targetBodyId) {
          const newBody = createCADBodyFromGeometry(
            prismGeom,
            `Katı_Gövde_${nextBodies.length + 1}`,
            DEFAULT_MATERIALS.aluminum
          );
          nextBodies.push(newBody);
        } else {
          const host = nextBodies.find((b) => b.id === autoDetect.targetBodyId);
          if (host) {
            const csgMode =
              mode === 'subtract'
                ? 'subtract'
                : mode === 'intersect'
                ? 'intersect'
                : 'union';
            const mergedGeom = performCSG(host.geometry, prismGeom, csgMode);
            const updatedHost = createCADBodyFromGeometry(
              mergedGeom,
              host.name,
              host.material,
              host.id
            );
            updatedHost.transform = { ...host.transform };
            nextBodies = nextBodies.map((b) => (b.id === host.id ? updatedHost : b));
          }
        }
      }

      const newFeature: HistoryFeatureNode = {
        id: uuidv4(),
        name: `Extrude (${dist.toFixed(1)} mm)`,
        type: 'extrude',
        suppressed: false,
        timestamp: Date.now(),
        params: { distance: dist, draftAngle: s.extrudeDraftAngle },
        targetBodyIds: nextBodies.map((b) => b.id),
      };

      set({
        bodies: nextBodies,
        history: [...s.history, newFeature],
        rollbackIndex: s.history.length,
        activeSketchId: null,
        selectedProfileIds: [],
        activeTool: 'select',
        numericHud: { ...s.numericHud, visible: false },
        statusMessage: `2D Profil ${dist.toFixed(1)} mm katı modele dönüştürüldü.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    setFilletChamferAmount: (filletChamferAmount) => set({ filletChamferAmount }),

    commitFilletChamfer: (customAmount) => {
      const s = get();
      const amount = customAmount ?? s.filletChamferAmount;
      if (s.selectedEdgeIds.length === 0 || s.selectedBodyIds.length === 0) return;

      const bodyId = s.selectedBodyIds[0];
      const body = s.bodies.find((b) => b.id === bodyId);
      if (!body) return;

      triggerHapticPulse('commit');
      s.pushUndoSnapshot();
      const modifiedGeom = applyFilletOrChamfer(body, s.selectedEdgeIds, amount);
      const updatedBody = createCADBodyFromGeometry(
        modifiedGeom,
        body.name,
        body.material,
        body.id
      );
      updatedBody.transform = { ...body.transform };

      const opName = amount >= 0 ? 'Fillet (Yuvarlatma)' : 'Chamfer (Pah)';
      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `${opName} (${Math.abs(amount).toFixed(1)} mm)`,
        type: amount >= 0 ? 'fillet' : 'chamfer',
        suppressed: false,
        timestamp: Date.now(),
        params: { amount, edges: s.selectedEdgeIds.length },
        targetBodyIds: [bodyId],
      };

      set({
        bodies: s.bodies.map((b) => (b.id === bodyId ? updatedBody : b)),
        history: [...s.history, feat],
        rollbackIndex: s.history.length,
        selectedEdgeIds: [],
        activeTool: 'select',
        numericHud: { ...s.numericHud, visible: false },
        statusMessage: `${opName} ${Math.abs(amount).toFixed(1)} mm uygulandı.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    setShellThickness: (shellThickness) => set({ shellThickness }),

    commitShell: (customThickness) => {
      const s = get();
      const t = customThickness ?? s.shellThickness;
      const bodyId = s.selectedBodyIds[0] || s.bodies[0]?.id;
      const body = s.bodies.find((b) => b.id === bodyId);
      if (!body) return;

      triggerHapticPulse('commit');
      s.pushUndoSnapshot();
      const shelledGeom = shellSolidBody(body, s.selectedFaceIds, t);
      const updated = createCADBodyFromGeometry(
        shelledGeom,
        body.name,
        body.material,
        body.id
      );
      updated.transform = { ...body.transform };

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `Shell / Kabuk (${t.toFixed(1)} mm)`,
        type: 'shell',
        suppressed: false,
        timestamp: Date.now(),
        params: { thickness: t },
        targetBodyIds: [body.id],
      };

      set({
        bodies: s.bodies.map((b) => (b.id === body.id ? updated : b)),
        history: [...s.history, feat],
        rollbackIndex: s.history.length,
        selectedFaceIds: [],
        activeTool: 'select',
        numericHud: { ...s.numericHud, visible: false },
        statusMessage: `Gövde ${t.toFixed(1)} mm et kalınlığı ile kabuk (Shell) yapıldı.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitRevolve: (angleDeg) => {
      const s = get();
      const sweepAngle = angleDeg ?? s.revolveAngleDeg;
      const allProfiles = s.sketches.flatMap((sk) =>
        sk.closedProfiles.map((p) => ({ profile: p, plane: sk.plane }))
      );
      const chosen =
        allProfiles.find((x) => s.selectedProfileIds.includes(x.profile.id)) ||
        allProfiles[allProfiles.length - 1];
      if (!chosen) return;

      triggerHapticPulse('commit');
      s.pushUndoSnapshot();
      const revGeom = revolveProfile3D(
        chosen.profile,
        chosen.plane,
        [0, 0, 0],
        [0, 1, 0],
        sweepAngle,
        48
      );
      const newBody = createCADBodyFromGeometry(
        revGeom,
        `Revolve_Gövde_${s.bodies.length + 1}`,
        DEFAULT_MATERIALS.aluminum
      );

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `Revolve (${sweepAngle}°)`,
        type: 'revolve',
        suppressed: false,
        timestamp: Date.now(),
        params: { angleDeg: sweepAngle },
        targetBodyIds: [newBody.id],
      };

      set({
        bodies: [...s.bodies, newBody],
        history: [...s.history, feat],
        rollbackIndex: s.history.length,
        activeSketchId: null,
        activeTool: 'select',
        statusMessage: `Profil ${sweepAngle}° döndürülerek katılandı (Revolve).`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitSweep: () => {
      const s = get();
      const allProfiles = s.sketches.flatMap((sk) =>
        sk.closedProfiles.map((p) => ({ profile: p, plane: sk.plane }))
      );
      const chosen =
        allProfiles.find((x) => s.selectedProfileIds.includes(x.profile.id)) ||
        allProfiles[0];
      if (!chosen) return;

      triggerHapticPulse('commit');
      s.pushUndoSnapshot();
      let path3D: Vec3[] = [
        [0, 0, 0],
        [0, 15, 22],
        [12, 30, 45],
        [20, 45, 65],
      ];
      if (s.selectedEdgeIds.length > 0 && s.selectedBodyIds.length > 0) {
        const b = s.bodies.find((x) => x.id === s.selectedBodyIds[0]);
        const edge = b?.topology.edges.find((e) => e.id === s.selectedEdgeIds[0]);
        if (edge && edge.vertices.length >= 2) {
          path3D = edge.vertices;
        }
      }

      const sweptGeom = sweepProfileAlongPath(chosen.profile, path3D, 0, 1.0);
      const newBody = createCADBodyFromGeometry(
        sweptGeom,
        `Sweep_Gövde_${s.bodies.length + 1}`,
        DEFAULT_MATERIALS.pla_blue
      );

      set({
        bodies: [...s.bodies, newBody],
        activeTool: 'select',
        statusMessage: 'Sweep (Yol Boyunca Süpürme) katı modeli oluşturuldu.',
      });
      scheduleDebouncedAutoSave(get);
    },

    commitLoft: () => {
      const s = get();
      const allProfiles = s.sketches.flatMap((sk) =>
        sk.closedProfiles.map((p) => ({ profile: p, plane: sk.plane }))
      );
      if (allProfiles.length === 0) return;

      triggerHapticPulse('commit');
      s.pushUndoSnapshot();
      const secA = allProfiles[0];
      const topPlane: SketchPlane = {
        ...secA.plane,
        origin: [
          secA.plane.origin[0],
          secA.plane.origin[1],
          secA.plane.origin[2] + 40,
        ],
      };
      const scaledContour: Vec2[] = secA.profile.outerContour.map(([u, v]) => [
        u * 0.6,
        v * 0.6,
      ]);
      const secB = {
        profile: { ...secA.profile, outerContour: scaledContour },
        plane: topPlane,
      };

      const loftGeom = loftProfiles3D([secA, allProfiles[1] || secB], 64);
      const newBody = createCADBodyFromGeometry(
        loftGeom,
        `Loft_Gövde_${s.bodies.length + 1}`,
        DEFAULT_MATERIALS.aluminum
      );

      set({
        bodies: [...s.bodies, newBody],
        activeTool: 'select',
        statusMessage: 'Loft (Kesitler Arası Geçiş) katı modeli oluşturuldu.',
      });
      scheduleDebouncedAutoSave(get);
    },

    commitBoolean: (mode) => {
      const s = get();
      const targetIds =
        s.selectedBodyIds.length >= 2
          ? s.selectedBodyIds
          : s.bodies.slice(0, 2).map((b) => b.id);
      if (targetIds.length < 2) return;

      const bodyA = s.bodies.find((b) => b.id === targetIds[0]);
      const bodyB = s.bodies.find((b) => b.id === targetIds[1]);
      if (!bodyA || !bodyB) return;

      triggerHapticPulse('boolean');
      s.pushUndoSnapshot();
      const resGeom = performCSG(bodyA.geometry, bodyB.geometry, mode);
      const updatedA = createCADBodyFromGeometry(
        resGeom,
        `${bodyA.name}_${mode.toUpperCase()}`,
        bodyA.material,
        bodyA.id
      );

      const nextBodies = s.keepToolBodies
        ? s.bodies.map((b) => (b.id === bodyA.id ? updatedA : b))
        : s.bodies
            .filter((b) => b.id !== bodyB.id)
            .map((b) => (b.id === bodyA.id ? updatedA : b));

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `Boolean ${mode.toUpperCase()}`,
        type: 'boolean',
        suppressed: false,
        timestamp: Date.now(),
        params: { mode },
        targetBodyIds: [bodyA.id],
      };

      set({
        bodies: nextBodies,
        history: [...s.history, feat],
        rollbackIndex: s.history.length,
        selectedBodyIds: [bodyA.id],
        activeTool: 'select',
        statusMessage: `Boolean ${mode.toUpperCase()} işlemi tamamlandı.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitSplitBody: () => {
      const s = get();
      const body = s.bodies.find((b) => b.id === s.selectedBodyIds[0]) || s.bodies[0];
      if (!body) return;

      triggerHapticPulse('commit');
      s.pushUndoSnapshot();
      const [geomA, geomB] = splitBodyByPlane(body, [0, 0, 0], [1, 0, 0]);
      const partA = createCADBodyFromGeometry(
        geomA,
        `${body.name}_Sol`,
        body.material,
        body.id
      );
      const partB = createCADBodyFromGeometry(
        geomB,
        `${body.name}_Sag`,
        DEFAULT_MATERIALS.pla_blue
      );
      partB.transform.position = [4, 0, 0];

      set({
        bodies: s.bodies.map((b) => (b.id === body.id ? partA : b)).concat(partB),
        selectedBodyIds: [partA.id, partB.id],
        activeTool: 'select',
        statusMessage: `${body.name} düzlem boyunca 2 bağımsız gövdeye bölündü (Split Body).`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitLinearPattern: (count, spacing) => {
      const s = get();
      const body = s.bodies.find((b) => b.id === s.selectedBodyIds[0]) || s.bodies[0];
      if (!body) return;

      const n = Math.max(2, count ?? s.patternCount);
      const step = spacing ?? s.patternSpacing;

      triggerHapticPulse('commit');
      s.pushUndoSnapshot();
      const clones: CADBody[] = [];
      for (let i = 1; i < n; i++) {
        const g = body.geometry.clone();
        g.translate(i * step, 0, 0);
        clones.push(
          createCADBodyFromGeometry(
            g,
            `${body.name}_Dizi_${i + 1}`,
            body.material
          )
        );
      }

      set({
        bodies: [...s.bodies, ...clones],
        activeTool: 'select',
        statusMessage: `Doğrusal Çoğaltma (${n} adet, ${step} mm aralık) oluşturuldu.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitCircularPattern: (count) => {
      const s = get();
      const body = s.bodies.find((b) => b.id === s.selectedBodyIds[0]) || s.bodies[0];
      if (!body) return;

      const n = Math.max(3, count ?? s.patternCount);
      triggerHapticPulse('commit');
      s.pushUndoSnapshot();
      const clones: CADBody[] = [];
      for (let i = 1; i < n; i++) {
        const angle = (i / n) * Math.PI * 2;
        const g = body.geometry.clone();
        g.rotateZ(angle);
        clones.push(
          createCADBodyFromGeometry(
            g,
            `${body.name}_Dairesel_${i + 1}`,
            body.material
          )
        );
      }

      set({
        bodies: [...s.bodies, ...clones],
        activeTool: 'select',
        statusMessage: `Dairesel Çoğaltma (${n} adet, 360°) oluşturuldu.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitMirrorBody: () => {
      const s = get();
      const body = s.bodies.find((b) => b.id === s.selectedBodyIds[0]) || s.bodies[0];
      if (!body) return;

      triggerHapticPulse('commit');
      s.pushUndoSnapshot();
      const mirroredGeom = mirrorBodyGeometry(body.geometry, [55, 0, 0], [1, 0, 0]);
      const mirroredBody = createCADBodyFromGeometry(
        mirroredGeom,
        `${body.name}_Simetri`,
        body.material
      );

      set({
        bodies: [...s.bodies, mirroredBody],
        selectedBodyIds: [mirroredBody.id],
        activeTool: 'select',
        statusMessage: `${body.name} aynalandı (Mirror Body).`,
      });
      scheduleDebouncedAutoSave(get);
    },

    applyGlobalToleranceCompensation: (offsetMm) => {
      const s = get();
      if (Math.abs(offsetMm) < 1e-4) return;
      triggerHapticPulse('commit');
      s.pushUndoSnapshot();

      const compensatedBodies = s.bodies.map((b) => {
        if (!b.visible || b.locked) return b;
        const compGeom = applyXYClearanceCompensation(b.geometry, offsetMm);
        const updated = createCADBodyFromGeometry(
          compGeom,
          b.name,
          b.material,
          b.id
        );
        updated.transform = { ...b.transform };
        updated.kinematics = b.kinematics;
        return updated;
      });

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `3D Baskı XY Tolerans (${offsetMm > 0 ? '+' : ''}${offsetMm.toFixed(2)} mm)`,
        type: 'tolerance_comp',
        suppressed: false,
        timestamp: Date.now(),
        params: { offsetMm },
        targetBodyIds: compensatedBodies.map((b) => b.id),
      };

      set({
        bodies: compensatedBodies,
        globalClearanceOffsetMm: offsetMm,
        history: [...s.history, feat],
        rollbackIndex: s.history.length,
        statusMessage: `Tüm gövdelere ${offsetMm.toFixed(2)} mm FDM/SLA 3D yazıcı XY tolerans telafisi uygulandı.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    addPrimitiveSolid: (type) => {
      const s = get();
      triggerHapticPulse('commit');
      s.pushUndoSnapshot();
      let geom: THREE.BufferGeometry;
      let label = 'Blok';

      if (type === 'box') {
        geom = new THREE.BoxGeometry(36, 36, 24);
        geom.translate(0, 0, 12);
        label = 'Kutu_Blok';
      } else if (type === 'cylinder') {
        geom = new THREE.CylinderGeometry(18, 18, 32, 36);
        geom.rotateX(Math.PI * 0.5);
        geom.translate(0, 0, 16);
        label = 'Silindir';
      } else if (type === 'sphere') {
        geom = new THREE.SphereGeometry(20, 32, 24);
        geom.translate(0, 0, 20);
        label = 'Küre';
      } else {
        geom = new THREE.TorusGeometry(22, 6, 20, 40);
        geom.translate(0, 0, 6);
        label = 'Halka_Torus';
      }

      const offset = (s.bodies.length % 4) * 14;
      geom.translate(offset, offset * 0.5, 0);

      const newBody = createCADBodyFromGeometry(
        geom,
        `${label}_${s.bodies.length + 1}`,
        DEFAULT_MATERIALS.aluminum
      );

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `Ekle: ${newBody.name}`,
        type: 'primitive_box',
        suppressed: false,
        timestamp: Date.now(),
        params: { type },
        targetBodyIds: [newBody.id],
        resultBodyId: newBody.id,
      };

      set({
        bodies: [...s.bodies, newBody],
        history: [...s.history, feat],
        rollbackIndex: s.history.length,
        selectedBodyIds: [newBody.id],
        selectedFaceIds: [],
        selectedEdgeIds: [],
        statusMessage: `${newBody.name} sahneye eklendi.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    addGearMacro: (params) => {
      const s = get();
      triggerHapticPulse('commit');
      s.pushUndoSnapshot();
      const geom = generateInvoluteGearGeometry(params);
      const newBody = createCADBodyFromGeometry(
        geom,
        `Involute_Disli_Z${params.teeth}_M${params.moduleMm}`,
        DEFAULT_MATERIALS.brass
      );
      newBody.kinematics = {
        role: 'rotating_gear',
        axis: [0, 0, 1],
        pivot: [0, 0, 0],
        minAngleDeg: -360,
        maxAngleDeg: 360,
        currentAngleDeg: 0,
        gearRatio: 1,
      };

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `Dişli Makrosu (Z=${params.teeth}, m=${params.moduleMm})`,
        type: 'macro_gear',
        suppressed: false,
        timestamp: Date.now(),
        params: { ...params },
        targetBodyIds: [newBody.id],
      };

      set({
        bodies: [...s.bodies, newBody],
        history: [...s.history, feat],
        rollbackIndex: s.history.length,
        selectedBodyIds: [newBody.id],
        isMacrosModalOpen: false,
        statusMessage: `${newBody.name} parametrik dişli çark oluşturuldu.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    addBoltOrNutMacro: (params) => {
      const s = get();
      triggerHapticPulse('commit');
      s.pushUndoSnapshot();
      const geom = generateISOBoltOrNutGeometry(params);
      const prefix = params.isNut ? 'ISO_Somun' : 'ISO_Civata';
      const newBody = createCADBodyFromGeometry(
        geom,
        `${prefix}_M${params.nominalDiameterMm}x${params.lengthMm}`,
        DEFAULT_MATERIALS.steel
      );

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `${prefix} M${params.nominalDiameterMm}`,
        type: 'macro_bolt',
        suppressed: false,
        timestamp: Date.now(),
        params: { ...params, isNut: Boolean(params.isNut) },
        targetBodyIds: [newBody.id],
      };

      set({
        bodies: [...s.bodies, newBody],
        history: [...s.history, feat],
        rollbackIndex: s.history.length,
        selectedBodyIds: [newBody.id],
        isMacrosModalOpen: false,
        statusMessage: `${newBody.name} sahneye eklendi.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    addSpringMacro: (params) => {
      const s = get();
      triggerHapticPulse('commit');
      s.pushUndoSnapshot();
      const geom = generateCoilSpringGeometry(params);
      const newBody = createCADBodyFromGeometry(
        geom,
        `Helezon_Yay_D${params.meanDiameterMm}_L${params.freeLengthMm}`,
        DEFAULT_MATERIALS.steel
      );

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `Helezon Yay (${params.activeCoils} Sarım)`,
        type: 'macro_spring',
        suppressed: false,
        timestamp: Date.now(),
        params: { ...params },
        targetBodyIds: [newBody.id],
      };

      set({
        bodies: [...s.bodies, newBody],
        history: [...s.history, feat],
        rollbackIndex: s.history.length,
        selectedBodyIds: [newBody.id],
        isMacrosModalOpen: false,
        statusMessage: `${newBody.name} yay oluşturuldu.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    addHingeJointMacro: (params) => {
      const s = get();
      triggerHapticPulse('commit');
      s.pushUndoSnapshot();
      const geom = generateArticulatedHingeGeometry(params);
      const newBody = createCADBodyFromGeometry(
        geom,
        `Mafsal_Eklem_Catal_${params.widthMm}mm`,
        DEFAULT_MATERIALS.aluminum
      );

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `Mekanik Mafsal (${params.clearanceMm}mm Tolerans)`,
        type: 'macro_hinge',
        suppressed: false,
        timestamp: Date.now(),
        params: { ...params },
        targetBodyIds: [newBody.id],
      };

      set({
        bodies: [...s.bodies, newBody],
        history: [...s.history, feat],
        rollbackIndex: s.history.length,
        selectedBodyIds: [newBody.id],
        isMacrosModalOpen: false,
        statusMessage: `${newBody.name} mafsal eklemi oluşturuldu.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    importExternalGeometry: (geom, name) => {
      const s = get();
      s.pushUndoSnapshot();
      const newBody = createCADBodyFromGeometry(geom, name, DEFAULT_MATERIALS.pla_blue);
      set({
        bodies: [...s.bodies, newBody],
        selectedBodyIds: [newBody.id],
        statusMessage: `${name} içe aktarıldı ve B-Rep topolojisi oluşturuldu.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    toggleBodyVisibility: (bodyId) =>
      set((s) => ({
        bodies: s.bodies.map((b) =>
          b.id === bodyId ? { ...b, visible: !b.visible } : b
        ),
      })),

    toggleBodyLock: (bodyId) =>
      set((s) => ({
        bodies: s.bodies.map((b) =>
          b.id === bodyId ? { ...b, locked: !b.locked } : b
        ),
      })),

    isolateBody: (bodyId) =>
      set((s) => {
        const target = s.bodies.find((b) => b.id === bodyId);
        const alreadyIsolated = target?.isolated;
        return {
          bodies: s.bodies.map((b) => ({
            ...b,
            isolated: alreadyIsolated ? false : b.id === bodyId,
            visible: alreadyIsolated ? true : b.id === bodyId,
          })),
        };
      }),

    updateBodyMaterial: (bodyId, patch) =>
      set((s) => ({
        bodies: s.bodies.map((b) =>
          b.id === bodyId ? { ...b, material: { ...b.material, ...patch } } : b
        ),
      })),

    updateBodyTransform: (bodyId, position, rotation, scale) =>
      set((s) => ({
        bodies: s.bodies.map((b) =>
          b.id === bodyId
            ? {
                ...b,
                transform: {
                  ...b.transform,
                  position,
                  rotation,
                  scale: scale ?? b.transform.scale,
                },
              }
            : b
        ),
      })),

    deleteSelectedEntities: () => {
      const s = get();
      triggerHapticPulse('warning');
      if (s.selectedSketchPrimIds.length > 0 && s.activeSketchId) {
        s.pushUndoSnapshot();
        set({
          sketches: s.sketches.map((sk) => {
            if (sk.id !== s.activeSketchId) return sk;
            const filtered = {
              ...sk,
              primitives: sk.primitives.filter(
                (p) => !s.selectedSketchPrimIds.includes(p.id)
              ),
            };
            filtered.closedProfiles = detectClosedProfiles(filtered);
            return filtered;
          }),
          selectedSketchPrimIds: [],
        });
        return;
      }

      if (s.selectedBodyIds.length > 0) {
        s.pushUndoSnapshot();
        set({
          bodies: s.bodies.filter(
            (b) => !s.selectedBodyIds.includes(b.id) || b.locked
          ),
          selectedBodyIds: [],
          selectedFaceIds: [],
          selectedEdgeIds: [],
          statusMessage: 'Seçili gövde silindi.',
        });
        scheduleDebouncedAutoSave(get);
      }
    },

    duplicateSelectedBody: () => {
      const s = get();
      const target = s.bodies.find((b) => b.id === s.selectedBodyIds[0]);
      if (!target) return;
      triggerHapticPulse('commit');
      s.pushUndoSnapshot();
      const clonedGeom = target.geometry.clone();
      clonedGeom.translate(22, 0, 0);
      const copyBody = createCADBodyFromGeometry(
        clonedGeom,
        `${target.name}_Kopya`,
        target.material
      );
      set({
        bodies: [...s.bodies, copyBody],
        selectedBodyIds: [copyBody.id],
        statusMessage: `${copyBody.name} çoğaltıldı.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    startSketchOnSelectionOrPlane: (planeId) => {
      const s = get();
      triggerHapticPulse('commit');
      let targetPlane: SketchPlane = DEFAULT_PLANES[0];

      if (planeId) {
        const found = s.constructionPlanes.find((p) => p.id === planeId);
        if (found) targetPlane = found;
      } else if (s.selectedFaceIds.length > 0 && s.selectedBodyIds.length > 0) {
        const body = s.bodies.find((b) => b.id === s.selectedBodyIds[0]);
        const face = body?.topology.faces.find((f) => f.id === s.selectedFaceIds[0]);
        if (body && face) {
          const n = new THREE.Vector3(...face.normal).normalize();
          const up =
            Math.abs(n.y) < 0.9
              ? new THREE.Vector3(0, 1, 0)
              : new THREE.Vector3(1, 0, 0);
          const xAxis = new THREE.Vector3().crossVectors(up, n).normalize();
          const yAxis = new THREE.Vector3().crossVectors(n, xAxis).normalize();
          targetPlane = {
            id: `plane_face_${face.id}`,
            name: `Yüzey Düzlemi (${body.name})`,
            origin: [...face.center],
            normal: [n.x, n.y, n.z],
            xAxis: [xAxis.x, xAxis.y, xAxis.z],
            yAxis: [yAxis.x, yAxis.y, yAxis.z],
            sourceFaceId: face.id,
            sourceBodyId: body.id,
            visible: true,
          };
        }
      }

      const newSketch: Sketch = {
        id: uuidv4(),
        name: `Eskiz ${s.sketches.length + 1} (${targetPlane.name})`,
        plane: targetPlane,
        primitives: [],
        constraints: [],
        closedProfiles: [],
        visible: true,
      };

      set({
        sketches: [...s.sketches, newSketch],
        activeSketchId: newSketch.id,
        activeTool: 'sketch_line',
        statusMessage: `2D Eskiz Modu Aktif (${targetPlane.name}) • S-Pen veya çizim araçlarıyla kapalı profil oluşturun.`,
      });
    },

    finishActiveSketch: () => {
      triggerHapticPulse('commit');
      set({
        activeSketchId: null,
        activeTool: 'select',
        statusMessage: '2D Eskiz tamamlandı. Mavi kapalı profillere dokunup Extrude yapabilirsiniz.',
      });
      scheduleDebouncedAutoSave(get);
    },

    addSketchPrimitiveToActive: (prim) => {
      const s = get();
      triggerHapticPulse('snap');
      let skId = s.activeSketchId;
      if (!skId) {
        skId = s.sketches[s.sketches.length - 1]?.id || null;
      }
      if (!skId) return;

      const withMode: SketchPrimitive = {
        ...prim,
        isConstruction: s.thumbModifiers.constructionMode || prim.isConstruction,
      };

      set({
        sketches: s.sketches.map((sk) => {
          if (sk.id !== skId) return sk;
          return solveSketchConstraints(
            { ...sk, primitives: [...sk.primitives, withMode] },
            s.variables
          );
        }),
      });
      scheduleDebouncedAutoSave(get);
    },

    updateSketchPrimitivePoints: (primId, points, radius) => {
      const s = get();
      set({
        sketches: s.sketches.map((sk) => {
          if (!sk.primitives.some((p) => p.id === primId)) return sk;
          const updatedPrims = sk.primitives.map((p) =>
            p.id === primId ? { ...p, points, radius: radius ?? p.radius } : p
          );
          return solveSketchConstraints(
            { ...sk, primitives: updatedPrims },
            s.variables
          );
        }),
      });
    },

    toggleSketchPrimitiveConstruction: (primId) => {
      const s = get();
      set({
        sketches: s.sketches.map((sk) => {
          if (!sk.primitives.some((p) => p.id === primId)) return sk;
          const updatedPrims = sk.primitives.map((p) =>
            p.id === primId ? { ...p, isConstruction: !p.isConstruction } : p
          );
          return solveSketchConstraints(
            { ...sk, primitives: updatedPrims },
            s.variables
          );
        }),
      });
    },

    trimActiveSketchAt: (clickPt, primId) => {
      const s = get();
      triggerHapticPulse('commit');
      set({
        sketches: s.sketches.map((sk) => {
          if (!sk.primitives.some((p) => p.id === primId)) return sk;
          const nextPrims = trimSegmentAtPoint(sk, clickPt, primId);
          return solveSketchConstraints({ ...sk, primitives: nextPrims }, s.variables);
        }),
        statusMessage: 'Kesişen eskiz segmenti budandı (Trim).',
      });
    },

    offsetSelectedSketchPrim: (distance) => {
      const s = get();
      if (s.selectedSketchPrimIds.length === 0) return;
      const targetId = s.selectedSketchPrimIds[0];

      set({
        sketches: s.sketches.map((sk) => {
          const found = sk.primitives.find((p) => p.id === targetId);
          if (!found) return sk;
          const offsetPrim = offsetSketchPrimitive(found, distance);
          return solveSketchConstraints(
            { ...sk, primitives: [...sk.primitives, offsetPrim] },
            s.variables
          );
        }),
        statusMessage: `Eskiz çizgisi ${distance} mm ötelendi (Offset).`,
      });
    },

    addConstraintToActiveSketch: (type, value, expression) => {
      const s = get();
      if (s.selectedSketchPrimIds.length === 0) return;
      triggerHapticPulse('angle');
      const newConstraint = {
        id: uuidv4(),
        type,
        primitiveIds: [...s.selectedSketchPrimIds],
        value,
        expression,
      };

      set({
        sketches: s.sketches.map((sk) => {
          if (
            !sk.primitives.some((p) => s.selectedSketchPrimIds.includes(p.id))
          ) {
            return sk;
          }
          return solveSketchConstraints(
            { ...sk, constraints: [...sk.constraints, newConstraint] },
            s.variables
          );
        }),
        statusMessage: `Geometrik kısıtlama (${type.toUpperCase()}) eklendi ve çözüldü.`,
      });
    },

    addVariable: (name, expression, unit = 'mm') => {
      const s = get();
      const nextVars = recomputeAllVariables([
        ...s.variables,
        { id: uuidv4(), name, expression, value: 0, unit },
      ]);
      const updatedSketches = s.sketches.map((sk) =>
        solveSketchConstraints(sk, nextVars)
      );
      set({ variables: nextVars, sketches: updatedSketches });
      scheduleDebouncedAutoSave(get);
    },

    updateVariable: (id, expression) => {
      const s = get();
      const nextVars = recomputeAllVariables(
        s.variables.map((v) => (v.id === id ? { ...v, expression } : v))
      );
      const updatedSketches = s.sketches.map((sk) =>
        solveSketchConstraints(sk, nextVars)
      );
      set({
        variables: nextVars,
        sketches: updatedSketches,
        statusMessage: 'Parametrik değişken güncellendi ve eskiz kısıtlamaları yeniden çözüldü.',
      });
      scheduleDebouncedAutoSave(get);
    },

    removeVariable: (id) =>
      set((s) => ({ variables: s.variables.filter((v) => v.id !== id) })),

    setRollbackIndex: (idx) => {
      const s = get();
      triggerHapticPulse('snap');
      const clamped = Math.max(-1, Math.min(s.history.length - 1, idx));
      const activeFeatureIds = new Set(
        s.history
          .slice(0, clamped + 1)
          .filter((h) => !h.suppressed)
          .map((h) => h.resultBodyId)
          .filter(Boolean)
      );

      set({
        rollbackIndex: clamped,
        bodies: s.bodies.map((b, i) => ({
          ...b,
          visible:
            clamped >= s.history.length - 1
              ? true
              : activeFeatureIds.has(b.id) || i <= clamped,
        })),
        statusMessage: `Parametrik Zaman Çizelgesi Adım ${clamped + 1}/${s.history.length} konumuna sarıldı.`,
      });
    },

    toggleSuppressFeature: (featureId) =>
      set((s) => ({
        history: s.history.map((h) =>
          h.id === featureId ? { ...h, suppressed: !h.suppressed } : h
        ),
      })),

    pushUndoSnapshot: () => {
      const s = get();
      const snap: Snapshot = {
        bodies: s.bodies.map((b) => ({
          ...b,
          geometry: b.geometry.clone(),
        })),
        sketches: JSON.parse(JSON.stringify(s.sketches)),
        history: JSON.parse(JSON.stringify(s.history)),
      };
      set({
        undoStack: [...s.undoStack.slice(-19), snap],
        redoStack: [],
      });
    },

    undo: () => {
      const s = get();
      if (s.undoStack.length === 0) return;
      triggerHapticPulse('snap');
      const prev = s.undoStack[s.undoStack.length - 1];
      const currentSnap: Snapshot = {
        bodies: s.bodies.map((b) => ({ ...b, geometry: b.geometry.clone() })),
        sketches: JSON.parse(JSON.stringify(s.sketches)),
        history: JSON.parse(JSON.stringify(s.history)),
      };
      set({
        bodies: prev.bodies,
        sketches: prev.sketches,
        history: prev.history,
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, currentSnap],
        statusMessage: 'Geri alındı (Undo).',
      });
    },

    redo: () => {
      const s = get();
      if (s.redoStack.length === 0) return;
      triggerHapticPulse('snap');
      const next = s.redoStack[s.redoStack.length - 1];
      const currentSnap: Snapshot = {
        bodies: s.bodies.map((b) => ({ ...b, geometry: b.geometry.clone() })),
        sketches: JSON.parse(JSON.stringify(s.sketches)),
        history: JSON.parse(JSON.stringify(s.history)),
      };
      set({
        bodies: next.bodies,
        sketches: next.sketches,
        history: next.history,
        undoStack: [...s.undoStack, currentSnap],
        redoStack: s.redoStack.slice(0, -1),
        statusMessage: 'Yinelendi (Redo).',
      });
    },

    setMacrosModalOpen: (isMacrosModalOpen) => set({ isMacrosModalOpen }),
    setBlueprintModalOpen: (isBlueprintModalOpen) => set({ isBlueprintModalOpen }),
    setMeshDoctorModalOpen: (isMeshDoctorModalOpen) => set({ isMeshDoctorModalOpen }),
    setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
    setHoleWizardModalOpen: (isHoleWizardModalOpen) => set({ isHoleWizardModalOpen }),
    setInterferenceModalOpen: (isInterferenceModalOpen) => set({ isInterferenceModalOpen }),
    setSheetMetalBarOpen: (isSheetMetalBarOpen) => set({ isSheetMetalBarOpen }),

    setSelectionFilter: (selectionFilter) => {
      triggerHapticPulse('snap');
      set({
        selectionFilter,
        statusMessage: `Seçim Filtresi: ${selectionFilter.toUpperCase()} moduna kilitlendi.`,
      });
    },

    setSectionBox: (patch) =>
      set((s) => ({
        sectionBox: { ...s.sectionBox, ...patch },
      })),

    // Smart Topological Selection Helpers
    selectCoplanarFaces: () => {
      const s = get();
      const body = s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) || s.bodies[0];
      if (!body) return;
      const seedFace =
        body.topology.faces.find((f) => s.selectedFaceIds.includes(f.id)) ||
        body.topology.faces[0];
      if (!seedFace) return;

      const n0 = new THREE.Vector3(...seedFace.normal).normalize();
      const c0 = new THREE.Vector3(...seedFace.center);
      const coplanarIds = body.topology.faces
        .filter((f) => {
          const nf = new THREE.Vector3(...f.normal).normalize();
          if (n0.dot(nf) < 0.96) return false;
          const dist = Math.abs(new THREE.Vector3(...f.center).sub(c0).dot(n0));
          return dist < 1.2;
        })
        .map((f) => f.id);

      triggerHapticPulse('commit');
      set({
        selectedFaceIds: coplanarIds,
        selectedBodyIds: [body.id],
        statusMessage: `Eş Düzlemli (Coplanar) ${coplanarIds.length} yüzey otomatik seçildi.`,
      });
    },

    selectEqualRadiusFaces: () => {
      const s = get();
      const body = s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) || s.bodies[0];
      if (!body) return;
      const seedFace =
        body.topology.faces.find((f) => s.selectedFaceIds.includes(f.id)) ||
        body.topology.faces.find((f) => f.surfaceType === 'cylindrical') ||
        body.topology.faces[0];
      if (!seedFace) return;

      const targetArea = seedFace.area;
      const matchingIds = body.topology.faces
        .filter((f) => Math.abs(f.area - targetArea) / Math.max(1, targetArea) < 0.22)
        .map((f) => f.id);

      triggerHapticPulse('commit');
      set({
        selectedFaceIds: matchingIds,
        selectedBodyIds: [body.id],
        statusMessage: `Eşit Yarıçap / Alanlı ${matchingIds.length} yüzey seçildi.`,
      });
    },

    selectTangentFaceChain: () => {
      const s = get();
      const body = s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) || s.bodies[0];
      if (!body) return;
      const seedFace =
        body.topology.faces.find((f) => s.selectedFaceIds.includes(f.id)) ||
        body.topology.faces[0];
      if (!seedFace) return;

      const n0 = new THREE.Vector3(...seedFace.normal).normalize();
      const chainIds = body.topology.faces
        .filter((f) => {
          const nf = new THREE.Vector3(...f.normal).normalize();
          return n0.dot(nf) > 0.65;
        })
        .map((f) => f.id);

      triggerHapticPulse('commit');
      set({
        selectedFaceIds: chainIds,
        selectedBodyIds: [body.id],
        statusMessage: `Teğet Yüzey Zinciri (${chainIds.length} Face) seçildi.`,
      });
    },

    invertBodySelection: () => {
      const s = get();
      const inverted = s.bodies
        .filter((b) => !s.selectedBodyIds.includes(b.id))
        .map((b) => b.id);
      set({
        selectedBodyIds: inverted,
        statusMessage: `Gövde seçimi tersine çevrildi (${inverted.length} gövde).`,
      });
    },

    // =========================================================================
    // SUBSYSTEM 1: ADVANCED 2D & 3D SKETCHING ACTIONS
    // =========================================================================
    addSlotToActiveSketch: (slotWidth = 12, lengthMm = 36) => {
      const s = get();
      const targetSketchId = s.activeSketchId || s.sketches[s.sketches.length - 1]?.id;
      if (!targetSketchId) return;
      triggerHapticPulse('commit');

      const pts = generateStraightSlotPoints(
        [-lengthMm / 2, 0],
        [lengthMm / 2, 0],
        slotWidth,
        'center_to_center'
      );
      const slotPrim: SketchPrimitive = {
        id: uuidv4(),
        type: 'slot',
        points: pts,
        radius: slotWidth / 2,
        isConstruction: false,
        status: 'fully',
      };

      set({
        sketches: s.sketches.map((sk) => {
          if (sk.id !== targetSketchId) return sk;
          const nextPrims = [...sk.primitives, slotPrim];
          const nextSk = { ...sk, primitives: nextPrims };
          return {
            ...nextSk,
            closedProfiles: detectClosedProfiles(nextSk),
          };
        }),
        statusMessage: `Düz Yuva (Slot ${lengthMm}×${slotWidth} mm) eskize eklendi.`,
      });
    },

    addConicToActiveSketch: (rho = 0.6) => {
      const s = get();
      const targetSketchId = s.activeSketchId || s.sketches[s.sketches.length - 1]?.id;
      if (!targetSketchId) return;
      triggerHapticPulse('commit');

      const pts = generateConicCurvePoints([-28, -14], [0, 26], [28, -14], rho);
      const conicPrim: SketchPrimitive = {
        id: uuidv4(),
        type: 'conic',
        points: pts,
        rho,
        isConstruction: false,
        status: 'fully',
      };

      set({
        sketches: s.sketches.map((sk) =>
          sk.id === targetSketchId
            ? { ...sk, primitives: [...sk.primitives, conicPrim] }
            : sk
        ),
        statusMessage: `Konik Eğri (ρ = ${rho.toFixed(2)}) eskize eklendi.`,
      });
    },

    addSpiralToActiveSketch: (revolutions = 3, endRadius = 26) => {
      const s = get();
      const targetSketchId = s.activeSketchId || s.sketches[s.sketches.length - 1]?.id;
      if (!targetSketchId) return;
      triggerHapticPulse('commit');

      const pts = generateArchimedeanSpiralPoints([0, 0], 4, endRadius, revolutions);
      const spiralPrim: SketchPrimitive = {
        id: uuidv4(),
        type: 'spiral',
        points: pts,
        radius: endRadius,
        isConstruction: false,
        status: 'fully',
      };

      set({
        sketches: s.sketches.map((sk) =>
          sk.id === targetSketchId
            ? { ...sk, primitives: [...sk.primitives, spiralPrim] }
            : sk
        ),
        statusMessage: `Arşimet Spirali (${revolutions} Sarım, R=${endRadius}mm) eklendi.`,
      });
    },

    addEquationCurveToActiveSketch: (
      xExpr = '22 * cos(t) + 3 * cos(6 * t)',
      yExpr = '22 * sin(t) + 3 * sin(6 * t)'
    ) => {
      const s = get();
      const targetSketchId = s.activeSketchId || s.sketches[s.sketches.length - 1]?.id;
      if (!targetSketchId) return;
      triggerHapticPulse('commit');

      const pts = generateEquationCurvePoints(xExpr, yExpr, 0, Math.PI * 2, 72);
      const eqPrim: SketchPrimitive = {
        id: uuidv4(),
        type: 'equation',
        points: pts,
        equationExpr: `${xExpr}; ${yExpr}`,
        isConstruction: false,
        status: 'fully',
      };

      set({
        sketches: s.sketches.map((sk) => {
          if (sk.id !== targetSketchId) return sk;
          const nextPrims = [...sk.primitives, eqPrim];
          const nextSk = { ...sk, primitives: nextPrims };
          return {
            ...nextSk,
            closedProfiles: detectClosedProfiles(nextSk),
          };
        }),
        statusMessage: `Matematiksel Denklem Eğrisi (Kam Profili) eskize eklendi.`,
      });
    },

    addVectorTextToActiveSketch: (text, fontSizeMm = 12, arcRadius = 0) => {
      const s = get();
      const targetSketchId = s.activeSketchId || s.sketches[s.sketches.length - 1]?.id;
      if (!targetSketchId) return;
      triggerHapticPulse('commit');

      const textPrims = generateVectorTextPrimitives(
        text || 'SHAPR',
        [0, 0],
        fontSizeMm,
        2.8,
        arcRadius
      );
      set({
        sketches: s.sketches.map((sk) => {
          if (sk.id !== targetSketchId) return sk;
          const nextPrims = [...sk.primitives, ...textPrims];
          const nextSk = { ...sk, primitives: nextPrims };
          return {
            ...nextSk,
            closedProfiles: detectClosedProfiles(nextSk),
          };
        }),
        statusMessage: `Vektörel Metin ("${text}") katılaştırılabilir kapalı kontur olarak eklendi.`,
      });
    },

    applySketchCornerFilletOrChamfer: (mode = 'fillet', amountMm = 5) => {
      const s = get();
      const targetSketchId = s.activeSketchId || s.sketches[s.sketches.length - 1]?.id;
      const sk = s.sketches.find((k) => k.id === targetSketchId);
      if (!sk || sk.primitives.length < 2) return;

      const pA = sk.primitives[sk.primitives.length - 2];
      const pB = sk.primitives[sk.primitives.length - 1];
      triggerHapticPulse('commit');

      if (mode === 'fillet') {
        const res = applySketchCornerFillet(pA, pB, amountMm);
        if (!res) return;
        const nextPrims = [
          ...sk.primitives.slice(0, -2),
          res.updatedA,
          res.arcPrim,
          res.updatedB,
        ];
        set({
          sketches: s.sketches.map((k) =>
            k.id === sk.id ? { ...k, primitives: nextPrims } : k
          ),
          statusMessage: `2B Eskiz Köşe Yuvarlatma (R=${amountMm}mm) uygulandı.`,
        });
      } else {
        const res = applySketchCornerChamfer(pA, pB, amountMm, amountMm);
        if (!res) return;
        const nextPrims = [
          ...sk.primitives.slice(0, -2),
          res.updatedA,
          res.bevelPrim,
          res.updatedB,
        ];
        set({
          sketches: s.sketches.map((k) =>
            k.id === sk.id ? { ...k, primitives: nextPrims } : k
          ),
          statusMessage: `2B Eskiz Köşe Pahı (${amountMm}×${amountMm}mm) uygulandı.`,
        });
      }
    },

    splitSelectedSketchCurve: () => {
      const s = get();
      const targetSketchId = s.activeSketchId || s.sketches[s.sketches.length - 1]?.id;
      const sk = s.sketches.find((k) => k.id === targetSketchId);
      if (!sk || sk.primitives.length === 0) return;

      const targetPrim =
        sk.primitives.find((p) => s.selectedSketchPrimIds.includes(p.id)) ||
        sk.primitives[sk.primitives.length - 1];
      const splitPair = splitSketchPrimitiveAtPoint(targetPrim);

      triggerHapticPulse('snap');
      set({
        sketches: s.sketches.map((k) =>
          k.id === sk.id
            ? {
                ...k,
                primitives: k.primitives.flatMap((p) =>
                  p.id === targetPrim.id ? splitPair : [p]
                ),
              }
            : k
        ),
        statusMessage: 'Seçili eskiz eğrisi tam orta noktasından 2 bağımsız segmente bölündü.',
      });
    },

    projectIntersectionCurveToActiveSketch: () => {
      const s = get();
      const targetSketchId = s.activeSketchId || s.sketches[s.sketches.length - 1]?.id;
      const sk = s.sketches.find((k) => k.id === targetSketchId);
      const body = s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) || s.bodies[0];
      if (!sk || !body) return;

      const pts2D = computePlaneBodyIntersectionCurve(sk.plane, body);
      if (pts2D.length < 2) return;

      const interPrim: SketchPrimitive = {
        id: uuidv4(),
        type: 'spline',
        points: pts2D,
        isConstruction: false,
        status: 'fully',
      };

      triggerHapticPulse('commit');
      set({
        sketches: s.sketches.map((k) =>
          k.id === sk.id ? { ...k, primitives: [...k.primitives, interPrim] } : k
        ),
        statusMessage: `3B Gövde Kesişim Eğrisi (${pts2D.length} nokta) eskiz düzlemine yansıtıldı.`,
      });
    },

    // =========================================================================
    // SUBSYSTEM 2: REFERENCE IMAGE CANVAS & 2-POINT CALIBRATION
    // =========================================================================
    addReferenceCanvas: (name, imageUrl, plane = 'XY') => {
      triggerHapticPulse('commit');
      const newCanvas: ReferenceCanvasItem = {
        id: uuidv4(),
        name,
        imageUrl,
        plane,
        opacity: 0.65,
        flipH: false,
        flipV: false,
        locked: false,
        offsetX: 0,
        offsetY: 0,
        rotationDeg: 0,
        widthMm: 120,
        heightMm: 90,
        visible: true,
      };
      set((s) => ({
        referenceCanvases: [...s.referenceCanvases, newCanvas],
        statusMessage: `Referans Görsel Tuvali ("${name}") ${plane} düzlemine eklendi.`,
      }));
    },

    updateReferenceCanvas: (id, patch) =>
      set((s) => ({
        referenceCanvases: s.referenceCanvases.map((c) =>
          c.id === id ? { ...c, ...patch } : c
        ),
      })),

    removeReferenceCanvas: (id) =>
      set((s) => ({
        referenceCanvases: s.referenceCanvases.filter((c) => c.id !== id),
      })),

    calibrateReferenceCanvasScale: (id, measuredDistMm, targetRealMm) => {
      if (measuredDistMm <= 0.01 || targetRealMm <= 0.01) return;
      const ratio = targetRealMm / measuredDistMm;
      triggerHapticPulse('commit');
      set((s) => ({
        referenceCanvases: s.referenceCanvases.map((c) =>
          c.id === id
            ? {
                ...c,
                widthMm: Number((c.widthMm * ratio).toFixed(2)),
                heightMm: Number((c.heightMm * ratio).toFixed(2)),
              }
            : c
        ),
        statusMessage: `2-Nokta Kalibrasyonu Tamamlandı: Ölçek Çarpanı ×${ratio.toFixed(3)} (${targetRealMm} mm).`,
      }));
    },

    // =========================================================================
    // SUBSYSTEM 3: PLASTICITY / SHAPR3D DIRECT MODELING
    // =========================================================================
    commitDeleteAndHealFaces: () => {
      const s = get();
      const targetBody =
        s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) || s.bodies[0];
      if (!targetBody) return;

      const faceIds =
        s.selectedFaceIds.length > 0
          ? s.selectedFaceIds
          : targetBody.topology.faces.length > 1
          ? [targetBody.topology.faces[targetBody.topology.faces.length - 1].id]
          : [];
      if (faceIds.length === 0) return;

      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const healedGeom = deleteAndHealFaces(targetBody, faceIds);
      const updatedBody = createCADBodyFromGeometry(
        healedGeom,
        targetBody.name,
        targetBody.material,
        targetBody.id
      );
      updatedBody.transform = { ...targetBody.transform };

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `Delete & Heal Face (${faceIds.length} Yüzey)`,
        type: 'delete_heal_face',
        suppressed: false,
        timestamp: Date.now(),
        params: { count: faceIds.length },
        targetBodyIds: [targetBody.id],
      };

      const nextHistory = [...s.history, feat];
      set({
        bodies: s.bodies.map((b) => (b.id === targetBody.id ? updatedBody : b)),
        history: nextHistory,
        rollbackIndex: nextHistory.length - 1,
        selectedFaceIds: [],
        activeTool: 'select',
        statusMessage: `Delete & Heal: ${faceIds.length} yüzey silindi ve komşu yüzeyler uzatılarak katı onarıldı.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitVariableRadiusFillet: (rStart, rMid, rEnd, chordal = false) => {
      const s = get();
      const targetBody =
        s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) || s.bodies[0];
      if (!targetBody) return;

      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const filletedGeom = applyVariableRadiusFillet(
        targetBody,
        s.selectedEdgeIds,
        rStart,
        rMid,
        rEnd,
        chordal
      );
      const updatedBody = createCADBodyFromGeometry(
        filletedGeom,
        targetBody.name,
        targetBody.material,
        targetBody.id
      );
      updatedBody.transform = { ...targetBody.transform };

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `Değişken Fillet (R:${rStart}→${rMid}→${rEnd}mm)`,
        type: 'variable_fillet',
        suppressed: false,
        timestamp: Date.now(),
        params: { rStart, rMid, rEnd, chordal },
        targetBodyIds: [targetBody.id],
      };

      const nextHistory = [...s.history, feat];
      set({
        bodies: s.bodies.map((b) => (b.id === targetBody.id ? updatedBody : b)),
        history: nextHistory,
        rollbackIndex: nextHistory.length - 1,
        activeTool: 'select',
        statusMessage: `Değişken Radyüslü Fillet (R=${rStart}mm → ${rMid}mm → ${rEnd}mm) uygulandı.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitReplaceFace: () => {
      const s = get();
      const bodyA = s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) || s.bodies[0];
      if (!bodyA || bodyA.topology.faces.length < 2) return;

      const sourceFaceId = s.selectedFaceIds[0] || bodyA.topology.faces[0].id;
      const targetFace =
        bodyA.topology.faces.find((f) => f.id === s.selectedFaceIds[1]) ||
        bodyA.topology.faces[1];

      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const replacedGeom = replaceFaceWithTarget(bodyA, sourceFaceId, targetFace);
      const updatedBody = createCADBodyFromGeometry(
        replacedGeom,
        bodyA.name,
        bodyA.material,
        bodyA.id
      );
      updatedBody.transform = { ...bodyA.transform };

      set({
        bodies: s.bodies.map((b) => (b.id === bodyA.id ? updatedBody : b)),
        activeTool: 'select',
        statusMessage: 'Replace Face: Kaynak yüzey hedef yüzey düzlemine hizalandı.',
      });
      scheduleDebouncedAutoSave(get);
    },

    commitBridgeFaces: (bulgeTension = 1.0, continuity = 'G1') => {
      const s = get();
      const allFaces = s.bodies.flatMap((b) => b.topology.faces);
      if (allFaces.length < 2) return;

      const faceA =
        allFaces.find((f) => f.id === s.selectedFaceIds[0]) || allFaces[0];
      const faceB =
        allFaces.find((f) => f.id === s.selectedFaceIds[1]) ||
        allFaces[Math.min(1, allFaces.length - 1)];

      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const bridgeGeom = bridgeTopologicalFaces(faceA, faceB, bulgeTension, continuity);
      const bridgeBody = createCADBodyFromGeometry(
        bridgeGeom,
        `G2_Kopru_Gövde_${s.bodies.length + 1}`,
        DEFAULT_MATERIALS.aluminum
      );

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `Yüzey Köprüsü (${continuity} Continuity)`,
        type: 'bridge_faces',
        suppressed: false,
        timestamp: Date.now(),
        params: { bulgeTension, continuity },
        targetBodyIds: [bridgeBody.id],
        resultBodyId: bridgeBody.id,
      };

      const nextHistory = [...s.history, feat];
      set({
        bodies: [...s.bodies, bridgeBody],
        history: nextHistory,
        rollbackIndex: nextHistory.length - 1,
        selectedBodyIds: [bridgeBody.id],
        activeTool: 'select',
        statusMessage: `3B Katı Köprü (${continuity} Süreklilik, Gerginlik=${bulgeTension}) oluşturuldu.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitEmbossOrDebossText: (text, depthMm = 2.0, mode = 'emboss') => {
      const s = get();
      const targetBody =
        s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) || s.bodies[0];
      if (!targetBody) return;

      const targetFace =
        targetBody.topology.faces.find((f) => s.selectedFaceIds.includes(f.id)) ||
        targetBody.topology.faces.find((f) => f.normal[2] > 0.7) ||
        targetBody.topology.faces[0];
      if (!targetFace) return;

      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const resultGeom = embossOrDebossTextOnFace(
        targetBody,
        targetFace,
        text || 'SHAPR',
        depthMm,
        mode,
        9.5
      );
      const updatedBody = createCADBodyFromGeometry(
        resultGeom,
        targetBody.name,
        targetBody.material,
        targetBody.id
      );
      updatedBody.transform = { ...targetBody.transform };

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `3B Metin ${mode === 'emboss' ? 'Kabartma' : 'Kazıma'} ("${text}")`,
        type: 'emboss_deboss',
        suppressed: false,
        timestamp: Date.now(),
        params: { text, depthMm, mode },
        targetBodyIds: [targetBody.id],
      };

      const nextHistory = [...s.history, feat];
      set({
        bodies: s.bodies.map((b) => (b.id === targetBody.id ? updatedBody : b)),
        history: nextHistory,
        rollbackIndex: nextHistory.length - 1,
        activeTool: 'select',
        statusMessage: `3B Metin "${text}" (${depthMm}mm ${
          mode === 'emboss' ? 'Kabartma/Emboss' : 'Kazıma/Deboss'
        }) yüzeye işlendi.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    // =========================================================================
    // SUBSYSTEM 4: ENCLOSURE, PLASTIC PART & MECHANICAL FEATURES
    // =========================================================================
    setHoleWizardParams: (patch) =>
      set((s) => ({
        holeWizardParams: { ...s.holeWizardParams, ...patch },
      })),

    commitHoleWizardDrill: () => {
      const s = get();
      const targetBody =
        s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) || s.bodies[0];
      if (!targetBody) return;

      const selectedFace = targetBody.topology.faces.find((f) =>
        s.selectedFaceIds.includes(f.id)
      );
      const holeParams: HoleWizardParams = selectedFace
        ? {
            ...s.holeWizardParams,
            position: selectedFace.center,
            normal: selectedFace.normal,
          }
        : s.holeWizardParams;

      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const drilledGeom = drillParametricHoleOnBody(targetBody, holeParams);
      const updatedBody = createCADBodyFromGeometry(
        drilledGeom,
        targetBody.name,
        targetBody.material,
        targetBody.id
      );
      updatedBody.transform = { ...targetBody.transform };

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `ISO ${holeParams.isoSize} ${holeParams.holeType.toUpperCase()} Delik`,
        type: 'hole_wizard',
        suppressed: false,
        timestamp: Date.now(),
        params: {
          isoSize: holeParams.isoSize,
          holeType: holeParams.holeType,
          depthMm: holeParams.depthMm,
        },
        targetBodyIds: [targetBody.id],
      };

      const nextHistory = [...s.history, feat];
      set({
        bodies: s.bodies.map((b) => (b.id === targetBody.id ? updatedBody : b)),
        history: nextHistory,
        rollbackIndex: nextHistory.length - 1,
        isHoleWizardModalOpen: false,
        activeTool: 'select',
        statusMessage: `ISO ${holeParams.isoSize} (${holeParams.holeType}) standart mühendislik deliği açıldı.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitStructuralRib: (thicknessMm = 2.5, heightMm = 14) => {
      const s = get();
      const targetBody =
        s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) || s.bodies[0];
      if (!targetBody) return;

      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const ribbedGeom = generateStructuralRibOnBody(targetBody, thicknessMm, heightMm, 0);
      const updatedBody = createCADBodyFromGeometry(
        ribbedGeom,
        targetBody.name,
        targetBody.material,
        targetBody.id
      );
      updatedBody.transform = { ...targetBody.transform };

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `Takviye Federi / Rib (${thicknessMm}mm)`,
        type: 'rib_web',
        suppressed: false,
        timestamp: Date.now(),
        params: { thicknessMm, heightMm },
        targetBodyIds: [targetBody.id],
      };

      const nextHistory = [...s.history, feat];
      set({
        bodies: s.bodies.map((b) => (b.id === targetBody.id ? updatedBody : b)),
        history: nextHistory,
        rollbackIndex: nextHistory.length - 1,
        activeTool: 'select',
        statusMessage: `Yapısal Takviye Federi (Rib t=${thicknessMm}mm, h=${heightMm}mm) gövdeye eklendi.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitMountingBoss: (outerDiaMm = 9.0, innerHoleDiaMm = 3.2, heightMm = 15.0) => {
      const s = get();
      const targetBody =
        s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) || s.bodies[0];
      if (!targetBody) return;

      const selectedFace = targetBody.topology.faces.find((f) =>
        s.selectedFaceIds.includes(f.id)
      );
      const pos: Vec3 = selectedFace ? selectedFace.center : [0, 0, 2];

      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const bossGeom = addMountingBossToBody(
        targetBody,
        pos,
        outerDiaMm,
        innerHoleDiaMm,
        heightMm
      );
      const updatedBody = createCADBodyFromGeometry(
        bossGeom,
        targetBody.name,
        targetBody.material,
        targetBody.id
      );
      updatedBody.transform = { ...targetBody.transform };

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `4-Kanatlı PCB Vida Burcu (Ø${outerDiaMm}mm)`,
        type: 'mounting_boss',
        suppressed: false,
        timestamp: Date.now(),
        params: { outerDiaMm, innerHoleDiaMm, heightMm },
        targetBodyIds: [targetBody.id],
      };

      const nextHistory = [...s.history, feat];
      set({
        bodies: s.bodies.map((b) => (b.id === targetBody.id ? updatedBody : b)),
        history: nextHistory,
        rollbackIndex: nextHistory.length - 1,
        activeTool: 'select',
        statusMessage: `4 Destek Kanatlı (Gusset) PCB Montaj Burcu (Ø${outerDiaMm}mm / Delik Ø${innerHoleDiaMm}mm) eklendi.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitEnclosureLipGroove: (mode = 'lip', clearanceMm = 0.15) => {
      const s = get();
      const targetBody =
        s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) || s.bodies[0];
      if (!targetBody) return;

      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const rimGeom = applyEnclosureLipOrGroove(targetBody, mode, 2.5, 1.5, clearanceMm);
      const updatedBody = createCADBodyFromGeometry(
        rimGeom,
        targetBody.name,
        targetBody.material,
        targetBody.id
      );
      updatedBody.transform = { ...targetBody.transform };

      const feat: HistoryFeatureNode = {
        id: uuidv4(),
        name: `Kutu Geçmeli Dudak/Kanal (${mode.toUpperCase()})`,
        type: 'lip_groove',
        suppressed: false,
        timestamp: Date.now(),
        params: { mode, clearanceMm },
        targetBodyIds: [targetBody.id],
      };

      const nextHistory = [...s.history, feat];
      set({
        bodies: s.bodies.map((b) => (b.id === targetBody.id ? updatedBody : b)),
        history: nextHistory,
        rollbackIndex: nextHistory.length - 1,
        activeTool: 'select',
        statusMessage: `Geçmeli Kutu ${
          mode === 'lip' ? 'Erkek Dudak (Lip)' : 'Dişi Kanal (Groove)'
        } (${clearanceMm}mm 3B yazıcı toleranslı) oluşturuldu.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    // =========================================================================
    // SUBSYSTEM 5: SURFACE MODELING & PATCH KERNEL
    // =========================================================================
    commitExtrudeAsSurface: (distanceMm = 28) => {
      const s = get();
      const sk = s.sketches[s.sketches.length - 1];
      const prim = sk?.primitives[sk.primitives.length - 1];
      const pts = prim?.points || [
        [-24, -12],
        [0, 14],
        [24, -12],
      ];
      const plane = sk?.plane || DEFAULT_PLANES[0];

      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const surfGeom = extrudeCurveAsSurface(pts, plane, distanceMm);
      const surfBody = createCADBodyFromGeometry(
        surfGeom,
        `Yuzey_Ekstruzyon_${s.bodies.length + 1}`,
        { ...DEFAULT_MATERIALS.aluminum, opacity: 0.78 }
      );
      surfBody.isSurfaceBody = true;

      set({
        bodies: [...s.bodies, surfBody],
        selectedBodyIds: [surfBody.id],
        activeTool: 'select',
        statusMessage: `Sıfır Kalınlıklı Açık Yüzey Gövdesi (Surface Extrude ${distanceMm}mm) oluşturuldu.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitBoundaryPatchSurface: (domeBulgeMm = 5.0) => {
      const s = get();
      const targetBody = s.bodies.find((b) => s.selectedBodyIds.includes(b.id));
      const loopVerts: Vec3[] =
        targetBody && targetBody.topology.edges.length >= 3
          ? targetBody.topology.edges.slice(0, 6).map((e) => e.vertices[0])
          : [
              [-24, -18, 16],
              [24, -18, 16],
              [24, 18, 16],
              [-24, 18, 16],
            ];

      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const patchGeom = createBoundaryPatchSurface(loopVerts, domeBulgeMm);
      const patchBody = createCADBodyFromGeometry(
        patchGeom,
        `G1_Yuzey_Yamasi_${s.bodies.length + 1}`,
        { ...DEFAULT_MATERIALS.aluminum, color: '#38bdf8', opacity: 0.85 }
      );
      patchBody.isSurfaceBody = true;

      set({
        bodies: [...s.bodies, patchBody],
        selectedBodyIds: [patchBody.id],
        activeTool: 'select',
        statusMessage: `Sınır Yüzey Yaması (Boundary Patch G1 Kubbe=${domeBulgeMm}mm) oluşturuldu.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitOffsetSurface: (offsetDistanceMm = 4.0) => {
      const s = get();
      const targetBody =
        s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) || s.bodies[0];
      if (!targetBody) return;

      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const offsetGeom = offsetOrExtractSurfaceFromFace(
        targetBody,
        s.selectedFaceIds,
        offsetDistanceMm
      );
      const offsetBody = createCADBodyFromGeometry(
        offsetGeom,
        `Oteleme_Yuzeyi_${s.bodies.length + 1}`,
        { ...DEFAULT_MATERIALS.aluminum, color: '#22d3ee', opacity: 0.82 }
      );
      offsetBody.isSurfaceBody = true;

      set({
        bodies: [...s.bodies, offsetBody],
        selectedBodyIds: [offsetBody.id],
        activeTool: 'select',
        statusMessage: `Offset Surface (${offsetDistanceMm}mm) yeni yüzey gövdesi olarak üretildi.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitThickenSurface: (thicknessMm = 3.0) => {
      const s = get();
      const targetBody =
        s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) ||
        s.bodies.find((b) => b.isSurfaceBody) ||
        s.bodies[s.bodies.length - 1];
      if (!targetBody) return;

      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const thickenedGeom = thickenSurfaceToSolid(
        targetBody.geometry,
        thicknessMm,
        'symmetric'
      );
      const solidBody = createCADBodyFromGeometry(
        thickenedGeom,
        `${targetBody.name}_Kati`,
        DEFAULT_MATERIALS.aluminum,
        targetBody.id
      );
      solidBody.isSurfaceBody = false;
      solidBody.transform = { ...targetBody.transform };

      set({
        bodies: s.bodies.map((b) => (b.id === targetBody.id ? solidBody : b)),
        activeTool: 'select',
        statusMessage: `Thicken Surface: Açık yüzey ${thicknessMm}mm et kalınlığı verilerek su sızdırmaz katı gövdeye dönüştürüldü.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitStitchSurfaces: () => {
      const s = get();
      if (s.bodies.length < 2) return;
      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const stitchedGeom = stitchSurfacesToSolid(s.bodies);
      const stitchedBody = createCADBodyFromGeometry(
        stitchedGeom,
        `Birlestirilmis_Kati_${s.bodies.length}`,
        DEFAULT_MATERIALS.aluminum
      );

      set({
        bodies: [stitchedBody],
        selectedBodyIds: [stitchedBody.id],
        activeTool: 'select',
        statusMessage: 'Stitch / Knit: Tüm yüzeyler tek bir su sızdırmaz manifold gövdede dikildi.',
      });
      scheduleDebouncedAutoSave(get);
    },

    // =========================================================================
    // SUBSYSTEM 6: SHEET METAL & FLAT PATTERN ENGINE
    // =========================================================================
    setSheetMetalParams: (patch) =>
      set((s) => ({
        sheetMetalParams: { ...s.sheetMetalParams, ...patch },
      })),

    commitSheetMetalBaseFlange: (widthMm = 74, depthMm = 52) => {
      const s = get();
      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const geom = generateSheetMetalBaseFlange(widthMm, depthMm, s.sheetMetalParams);
      const body = createCADBodyFromGeometry(
        geom,
        `Sac_Metal_Taban_${s.bodies.length + 1}`,
        DEFAULT_MATERIALS.steel
      );
      body.sheetMetalMeta = { ...s.sheetMetalParams, bendsCount: 0 };

      set({
        bodies: [...s.bodies, body],
        selectedBodyIds: [body.id],
        statusMessage: `Sac Metal Taban Plakası (${widthMm}×${depthMm}×${s.sheetMetalParams.thicknessMm}mm, K=${s.sheetMetalParams.kFactor}) oluşturuldu.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitSheetMetalEdgeFlange: (side = 'right') => {
      const s = get();
      const targetBody =
        s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) ||
        s.bodies[s.bodies.length - 1];
      if (!targetBody) return;

      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const flangedGeom = addSheetMetalEdgeFlange(
        targetBody,
        s.sheetMetalParams,
        side
      );
      const updatedBody = createCADBodyFromGeometry(
        flangedGeom,
        targetBody.name,
        targetBody.material,
        targetBody.id
      );
      updatedBody.transform = { ...targetBody.transform };
      updatedBody.sheetMetalMeta = {
        ...s.sheetMetalParams,
        bendsCount: (targetBody.sheetMetalMeta?.bendsCount || 0) + 1,
      };

      set({
        bodies: s.bodies.map((b) => (b.id === targetBody.id ? updatedBody : b)),
        statusMessage: `Sac Metal Kenar Flanşı (${s.sheetMetalParams.bendAngleDeg}° Büküm, R=${s.sheetMetalParams.bendRadiusMm}mm) eklendi.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    commitSheetMetalHem: () => {
      const s = get();
      const targetBody =
        s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) ||
        s.bodies[s.bodies.length - 1];
      if (!targetBody) return;

      s.pushUndoSnapshot();
      triggerHapticPulse('commit');

      const hemmedGeom = addSheetMetalHemOnEdge(targetBody, s.sheetMetalParams);
      const updatedBody = createCADBodyFromGeometry(
        hemmedGeom,
        targetBody.name,
        targetBody.material,
        targetBody.id
      );
      updatedBody.transform = { ...targetBody.transform };

      set({
        bodies: s.bodies.map((b) => (b.id === targetBody.id ? updatedBody : b)),
        statusMessage: `Sac Metal 180° Kenar Kıvırma (Hem) uygulandı.`,
      });
      scheduleDebouncedAutoSave(get);
    },

    generateSheetMetalFlatPattern: () => {
      const s = get();
      const targetBody =
        s.bodies.find((b) => s.selectedBodyIds.includes(b.id)) ||
        s.bodies[s.bodies.length - 1];
      if (!targetBody) return;

      triggerHapticPulse('commit');
      const res = unfoldSheetMetalToFlatPattern(targetBody, s.sheetMetalParams);
      set({
        flatPatternResult: {
          flatWidthMm: res.flatWidthMm,
          flatDepthMm: res.flatDepthMm,
          bendAllowanceMm: res.bendAllowanceMm,
          dxfString: res.dxfString,
          svgString: res.svgString,
        },
        statusMessage: `Sac Açınımı (Flat Pattern): ${res.flatWidthMm}×${res.flatDepthMm} mm (Büküm Payı BA=${res.bendAllowanceMm}mm) hesaplandı.`,
      });
    },

    // =========================================================================
    // SUBSYSTEM 7: ASSEMBLIES, KINEMATIC JOINTS, EXPLODED VIEW & INTERFERENCE
    // =========================================================================
    addAssemblyJoint: (type, name) => {
      const s = get();
      const bA = s.bodies[0]?.id || '';
      const bB = s.bodies[Math.min(1, s.bodies.length - 1)]?.id || bA;
      triggerHapticPulse('commit');

      const newJoint: AssemblyJoint = {
        id: uuidv4(),
        name: name || `${type.toUpperCase()} Montaj Mafsalı #${s.assemblyJoints.length + 1}`,
        type,
        bodyAId: bA,
        bodyBId: bB,
        anchorWorld: [0, 0, 14],
        axisWorld: [0, 0, 1],
        minLimit: type === 'slider' ? -35 : -90,
        maxLimit: type === 'slider' ? 35 : 90,
        currentValue: 0,
      };

      set({
        assemblyJoints: [...s.assemblyJoints, newJoint],
        statusMessage: `${newJoint.name} montaj ağacına eklendi.`,
      });
    },

    removeAssemblyJoint: (id) =>
      set((s) => ({
        assemblyJoints: s.assemblyJoints.filter((j) => j.id !== id),
      })),

    setExplosionFactor: (factor) => {
      const s = get();
      const vectors = computeExplodedViewVectors(s.bodies);
      set({
        explosionFactor: factor,
        bodies: s.bodies.map((b) => ({
          ...b,
          explosionVector: vectors[b.id] || [0, 0, 0],
        })),
      });
    },

    runAssemblyInterferenceCheck: () => {
      const s = get();
      triggerHapticPulse('commit');
      const clashes = detectAssemblyInterferences(s.bodies);
      set({
        interferenceClashes: clashes,
        isInterferenceModalOpen: true,
        statusMessage:
          clashes.length === 0
            ? 'Çakışma Testi Tamamlandı: Gövdeler arasında çakışma (Interference) bulunamadı!'
            : `Çakışma Testi: ${clashes.length} adet hacimsel girişim (Clash) tespit edildi.`,
      });
    },

    openNumericHUD: (config) =>
      set((s) => ({
        numericHud: { ...s.numericHud, ...config, visible: true },
      })),

    closeNumericHUD: () =>
      set((s) => ({
        numericHud: { ...s.numericHud, visible: false },
      })),
  };
});
