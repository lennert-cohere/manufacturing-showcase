import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import gsap from 'gsap';
import { AREAS, NORTH_DATA, SCENARIOS } from './agents.js';

// ─── Brand Colors ────────────────────────────────────────────────────────────
const C = {
  bgDark: 0x0C0E12, cg700: 0x2B4239, cg500: 0x355146, cg300: 0x80948C,
  sc700: 0xCA492D, sc500: 0xFF7759, sc300: 0xFFA18C,
  sq700: 0x9B60AA, sq500: 0xD9A6E5, sq300: 0xE9D0EF,
  mg700: 0x8E8572, mg500: 0xB8B1A4, mg300: 0xD7CFC1,
  ab700: 0x2D4CB9, ab500: 0x4C6EE6, ab300: 0x8FA6F9,
  white: 0xFAFAFA,
};

// ─── Layout ──────────────────────────────────────────────────────────────────
const PLAT_W = 10, PLAT_D = 8, PLAT_H = 0.7;
const CENTER_Y = 2.5, OUTER_Y = 0.5;
const CENTER_PLAT_W = 11, CENTER_PLAT_D = 11;
const CAM_DEFAULT = { x: 30, y: 22, z: 30 };
const CAM_TARGET = { x: 0, y: 2, z: 0 };

// ─── State ───────────────────────────────────────────────────────────────────
let scene, camera, renderer, cssRenderer, composer, controls, clock;
let raycaster, mouse;
const clickTargets = [], allLabels = [], platformGroups = [], bridgeData = [], platformSlabMats = [];
let compassCrystal, compassWire, compassRings = [], trustRings = [];
let conduitParticles = [], ambientPts;
let selectedTarget = null, isAnimating = false, hoveredPlatform = -1;
let pointerDownPos = null;
let zoomedData = null, zoomedType = null, detailModalOpen = false;
let incidentActive = false, incidentPacket = null, activeScenarioSteps = null, incidentRunId = 0, activeScenarioIdx = -1;
let dropdownOpen = false, pendingScenarioIdx = -1;
let introBlurActive = true;

// Platform animation refs
const conveyorCubes = [];
let conveyorGroup = null, conveyorBaseY = 0, conveyorCZ = 0;
const BELT_HALF_LEN = 3, BELT_SPEED = 1.2, CUBE_SPACING = 1.2;
const CUBE_COLORS = [C.sc500, C.ab500, C.sq500, C.mg500, C.sc300];

let improvePdcaRing = null;
const improveSensorNodes = [], improvePdcaNodes = [];

const knowledgeDocPanels = [], knowledgeGraphNodes = [], knowledgeGraphEdges = [];
const robotArmJoints = [], robotArmUppers = [];
const analyticsBarSets = [];
let analyticsScanLine = null, analyticsScanCurve = null;
const supplyRouteDots = [];
let supplyRouteCurve = null;

// Tour
let tourActive = false, tourTimer = null, tourIndex = -1;
const TOUR_ORDER = ['north', 0, 1, 2, 3, 4];
const TOUR_INTERVAL = 14000;

// ─── Init ────────────────────────────────────────────────────────────────────
function init() {
  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2(-999, -999);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(C.bgDark);
  scene.fog = new THREE.FogExp2(C.bgDark, 0.006);
  bar(10);

  camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 400);
  camera.position.set(CAM_DEFAULT.x, CAM_DEFAULT.y, CAM_DEFAULT.z);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  document.getElementById('scene-container').appendChild(renderer.domElement);

  cssRenderer = new CSS2DRenderer();
  cssRenderer.setSize(innerWidth, innerHeight);
  cssRenderer.domElement.style.position = 'absolute';
  cssRenderer.domElement.style.top = '0';
  cssRenderer.domElement.style.left = '0';
  cssRenderer.domElement.style.pointerEvents = 'none';
  cssRenderer.domElement.classList.add('css2d-layer');
  document.getElementById('scene-container').appendChild(cssRenderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.04;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.15;
  controls.maxPolarAngle = Math.PI / 2.3; controls.minPolarAngle = 0.25;
  controls.minDistance = 14; controls.maxDistance = 70;
  controls.target.set(CAM_TARGET.x, CAM_TARGET.y, CAM_TARGET.z);
  controls.enablePan = false;
  bar(15);

  setupPost();
  setupLights();
  bar(20);

  createGround();
  bar(25);
  buildNorthPlatform();
  bar(35);
  AREAS.forEach((a, i) => buildAreaPlatform(a, i));
  bar(55);
  buildBridges();
  bar(65);
  createAmbientParticles();
  bar(70);
  setupInteractions();
  bar(75);

  // Tour dots
  const dotsEl = document.getElementById('tour-dots');
  TOUR_ORDER.forEach((_, i) => { const d = document.createElement('div'); d.className = 'tour-dot'; dotsEl.appendChild(d); });

  bar(100);
  setTimeout(() => { document.getElementById('loading-screen').classList.add('hidden'); playIntro(); }, 500);
  animate();
}

function bar(p) { const el = document.getElementById('loading-bar'); if (el) el.style.width = p + '%'; }

// ─── Post-Processing ─────────────────────────────────────────────────────────
function setupPost() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.1, 0.5, 0.55);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}

// ─── Lighting ────────────────────────────────────────────────────────────────
function setupLights() {
  const al = new THREE.AmbientLight(0x1a2a22, 0.8); scene.add(al);
  const hl = new THREE.HemisphereLight(0x6688aa, C.bgDark, 0.4); scene.add(hl);
  const dl1 = new THREE.DirectionalLight(0xffeedd, 0.55); dl1.position.set(20, 30, 15); scene.add(dl1);
  const dl2 = new THREE.DirectionalLight(0xccddee, 0.25); dl2.position.set(-15, 20, -10); scene.add(dl2);
  const cl1 = new THREE.PointLight(C.sq500, 2.5, 30, 1.5); cl1.position.set(0, CENTER_Y + 3, 0); scene.add(cl1);
  const cl2 = new THREE.PointLight(C.ab500, 1.2, 25, 2); cl2.position.set(0, CENTER_Y + 1, 0); scene.add(cl2);
}

// ─── Ground ──────────────────────────────────────────────────────────────────
function createGround() {
  const gm = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: C.bgDark, roughness: 0.95, metalness: 0.05 }));
  gm.rotation.x = -Math.PI / 2; gm.position.y = -0.5; scene.add(gm);
  const gh = new THREE.GridHelper(400, 200, 0x1A1E26, 0x1A1E26);
  gh.material.opacity = 0.08; gh.material.transparent = true; gh.position.y = -0.49; scene.add(gh);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: opts.r ?? 0.5, metalness: opts.m ?? 0.15, transparent: !!opts.o, opacity: opts.o ?? 1 });
}
function glow(color, opacity = 0.5) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
}
function addBox(parent, w, h, d, x, y, z, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); parent.add(m); return m;
}
function addEdges(parent, mesh, color = C.ab500, opacity = 0.5) {
  const edges = new THREE.EdgesGeometry(mesh.geometry);
  const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const lines = new THREE.LineSegments(edges, lineMat);
  lines.position.copy(mesh.position); lines.rotation.copy(mesh.rotation); lines.scale.copy(mesh.scale);
  parent.add(lines); return lines;
}

// ─── North Center Platform ───────────────────────────────────────────────────
function buildNorthPlatform() {
  const group = new THREE.Group();
  group.userData = { type: 'north', center: new THREE.Vector3(0, CENTER_Y, 0) };

  // Round platform disc
  const discRadius = CENTER_PLAT_W / 2;
  const discGeo = new THREE.CylinderGeometry(discRadius, discRadius, PLAT_H, 48);
  const discMat = mat(C.cg500, { r: 0.4, m: 0.2 });
  discMat.polygonOffset = true; discMat.polygonOffsetFactor = 1; discMat.polygonOffsetUnits = 1;
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.set(0, CENTER_Y, 0);
  group.add(disc);
  // Only show sharp edges (top/bottom rims), skip smooth cylinder side tessellation
  const discEdges = new THREE.EdgesGeometry(discGeo, 15);
  const discLineMat = new THREE.LineBasicMaterial({ color: C.ab500, transparent: true, opacity: 0.7 });
  const discLines = new THREE.LineSegments(discEdges, discLineMat);
  discLines.position.copy(disc.position);
  group.add(discLines);
  // Glow ring on top face only (avoids Z-fighting with the disc sides)
  const glowRing = new THREE.Mesh(
    new THREE.RingGeometry(discRadius - 0.3, discRadius, 48),
    glow(C.ab500, 0.06)
  );
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.set(0, CENTER_Y + PLAT_H / 2 + 0.01, 0);
  group.add(glowRing);

  // Underglow
  const ug = new THREE.PointLight(C.sq500, 1.5, 15, 2); ug.position.set(0, CENTER_Y - 1.5, 0); group.add(ug);

  // Pedestal
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.3, 0.5, 8), mat(C.cg700, { r: 0.3, m: 0.4 }));
  ped.position.set(0, CENTER_Y + PLAT_H / 2 + 0.25, 0); group.add(ped);

  // Compass crystal
  const crystalGeo = new THREE.IcosahedronGeometry(1.2, 1);
  compassCrystal = new THREE.Mesh(crystalGeo, new THREE.MeshPhysicalMaterial({
    color: C.sq500, emissive: C.sq500, emissiveIntensity: 0.7,
    roughness: 0.1, metalness: 0.15, transparent: true, opacity: 0.75, transmission: 0.15, thickness: 1,
  }));
  compassCrystal.position.set(0, CENTER_Y + 3.5, 0); group.add(compassCrystal);

  compassWire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), new THREE.MeshBasicMaterial({ color: C.ab500, wireframe: true, transparent: true, opacity: 0.3 }));
  compassWire.position.copy(compassCrystal.position); group.add(compassWire);

  const innerGlow = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), glow(C.sc500, 0.15));
  innerGlow.position.copy(compassCrystal.position); group.add(innerGlow);

  // Orbiting rings
  for (let i = 0; i < 3; i++) {
    const r = 1.8 + i * 0.35;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.02, 8, 48),
      glow([C.sc500, C.sq500, C.ab500][i], 0.3 + i * 0.06)
    );
    ring.position.copy(compassCrystal.position);
    ring.rotation.x = Math.PI / 3 + i * 0.4; ring.rotation.z = i * 0.6;
    compassRings.push(ring); group.add(ring);
  }

  // Trust escalation rings (5, initially dim, light up during incident)
  for (let i = 0; i < 5; i++) {
    const r = 3.5 + i * 0.5;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.015, 6, 36),
      glow([C.sc500, C.sc300, C.sq500, C.ab500, C.ab300][i], 0.05)
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, CENTER_Y + PLAT_H / 2 + 0.1 + i * 0.02, 0);
    trustRings.push(ring); group.add(ring);
  }

  // North label
  const nDiv = document.createElement('div'); nDiv.className = 'north-label';
  nDiv.innerHTML = '<div class="label-name">North</div><div class="label-sub">AI Platform</div>';
  const nLabel = new CSS2DObject(nDiv);
  nLabel.position.set(0, CENTER_Y + 6.5, 0); group.add(nLabel);
  allLabels.push({ element: nDiv, type: 'north', group });

  // Click target
  const ct = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
  ct.position.set(0, CENTER_Y + 2, 0);
  ct.userData = { type: 'north', data: NORTH_DATA };
  group.add(ct); clickTargets.push(ct);

  scene.add(group);
  platformGroups.push(group);
}

// ─── Area Platform ───────────────────────────────────────────────────────────
function buildAreaPlatform(area, idx) {
  const group = new THREE.Group();
  const cx = area.x, cz = area.z;

  // Compute rotation so that the platform's local -Z (front/accent strip side) faces center
  const angleToCenter = Math.atan2(-cx, -cz);
  group.position.set(cx, 0, cz);
  group.rotation.y = angleToCenter + Math.PI;
  group.userData = { type: 'area', index: idx, center: new THREE.Vector3(cx, OUTER_Y, cz) };

  // All children are built in LOCAL coordinates (0,0,0 = platform center)
  const ly = OUTER_Y; // local Y for slab center

  // Platform slab
  const slabMat = mat(C.cg500, { r: 0.4, m: 0.2 });
  slabMat.emissive = new THREE.Color(area.color);
  slabMat.emissiveIntensity = 0;
  const slab = addBox(group, PLAT_W, PLAT_H, PLAT_D, 0, ly, 0, slabMat);
  addEdges(group, slab, C.ab500, 0.6);
  addBox(group, PLAT_W, PLAT_H, PLAT_D, 0, ly, 0, glow(C.ab500, 0.03));
  platformSlabMats.push(slabMat);

  // Accent strip on the FRONT edge (local -Z), which now always faces center
  addBox(group, PLAT_W - 1, 0.04, 0.12, 0, ly + PLAT_H / 2 + 0.02, -PLAT_D / 2 + 0.2, glow(area.color, 0.5));

  // Underglow
  const ug = new THREE.PointLight(area.color, 0.8, 12, 2);
  ug.position.set(0, ly - 1.5, 0); group.add(ug);

  // Build area-specific props (all in local coords: 0,0,0 = platform center)
  const py = ly + PLAT_H / 2;
  const builders = [buildKnowledgeHub, buildProductionOps, buildAnalytics, buildSupplyChain, buildContinuousImprovement];
  builders[idx](group, 0, py, 0, area);

  // Agent crystal (floating above platform)
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshPhysicalMaterial({
      color: area.color, emissive: area.color, emissiveIntensity: 1.0,
      roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.9,
    })
  );
  crystal.position.set(0, py + 3.2, 0); group.add(crystal);
  const cRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.012, 8, 24), glow(area.color, 0.4));
  cRing.rotation.x = Math.PI / 2; cRing.position.set(0, py + 3.2, 0); group.add(cRing);
  group.userData.crystal = crystal; group.userData.crystalRing = cRing;

  // Primary label
  const lDiv = document.createElement('div'); lDiv.className = 'platform-label';
  const dotColor = area.accentHex;
  lDiv.innerHTML = `<div class="label-name">${area.shortName}</div><div class="label-agents"><span class="agent-dot" style="background:${dotColor}"></span> ${area.agents.length} agents active</div>`;
  const label = new CSS2DObject(lDiv);
  label.position.set(0, py + 4.5, 0); group.add(label);
  allLabels.push({ element: lDiv, type: 'area', index: idx, group });

  // Agent sub-labels
  area.agents.forEach((agent, ai) => {
    const sDiv = document.createElement('div'); sDiv.className = 'agent-sublabel';
    sDiv.innerHTML = `<div class="sublabel-name">${agent.name}</div>`;
    const sLabel = new CSS2DObject(sDiv);
    const aOffset = (ai - (area.agents.length - 1) / 2) * 2.2;
    sLabel.position.set(aOffset, py + 2.5, 0.5);
    group.add(sLabel);
    sDiv.style.opacity = '0';
    allLabels.push({ element: sDiv, type: 'agent-sub', parentIdx: idx, group });
  });

  // Click target
  const ct = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
  ct.position.set(0, OUTER_Y + 2, 0);
  ct.userData = { type: 'area', data: area, index: idx };
  group.add(ct); clickTargets.push(ct);

  scene.add(group);
  platformGroups.push(group);
}

// ─── Area Prop Builders ──────────────────────────────────────────────────────
function buildKnowledgeHub(g, cx, py, cz) {
  // ── Floating holographic document panels ─────────────────────────────────
  const docConfigs = [
    { x: -3.2, y: 1.4, z: 0.6, w: 1.2, h: 1.6, ry: 0.2, col: C.cg300 },
    { x: -2.0, y: 1.7, z: -0.2, w: 1.0, h: 1.4, ry: 0.1, col: C.cg500 },
    { x: 2.0, y: 1.5, z: 0.4, w: 1.1, h: 1.5, ry: -0.15, col: C.cg300 },
    { x: 3.2, y: 1.3, z: -0.5, w: 0.9, h: 1.3, ry: -0.25, col: C.cg500 },
    { x: -0.8, y: 1.9, z: 1.5, w: 0.8, h: 1.1, ry: 0.05, col: C.mg500 },
    { x: 1.0, y: 1.6, z: 1.8, w: 0.9, h: 1.2, ry: -0.08, col: C.mg500 },
  ];
  docConfigs.forEach((d, i) => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), glow(d.col, 0.06));
    panel.position.set(cx + d.x, py + d.y, cz + d.z);
    panel.rotation.y = d.ry;
    g.add(panel);
    const border = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h),
      new THREE.MeshBasicMaterial({ color: d.col, wireframe: true, transparent: true, opacity: 0.18 }));
    border.position.copy(panel.position); border.rotation.copy(panel.rotation);
    g.add(border);
    // Text lines on document
    for (let ln = 0; ln < 4; ln++) {
      const lw = d.w * (0.5 + Math.random() * 0.3);
      const line = new THREE.Mesh(new THREE.PlaneGeometry(lw, 0.02),
        glow(C.cg300, 0.25));
      line.position.set(
        panel.position.x + (lw - d.w) * 0.25,
        panel.position.y + d.h * 0.3 - ln * d.h * 0.18,
        panel.position.z + (d.ry > 0 ? -0.01 : 0.01)
      );
      line.rotation.y = d.ry;
      g.add(line);
    }
    panel.userData.baseY = py + d.y;
    panel.userData.phaseOffset = i * 1.1;
    knowledgeDocPanels.push(panel);
  });

  // ── Search terminal (central) ────────────────────────────────────────────
  const termBase = addBox(g, 1.2, 0.6, 0.8, cx, py + 0.3, cz - 1.5, mat(C.cg500, { r: 0.35, m: 0.2 }));
  addEdges(g, termBase, C.cg300, 0.25);
  const termScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), glow(C.cg300, 0.08));
  termScreen.position.set(cx, py + 0.8, cz - 1.9); g.add(termScreen);
  const termFrame = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6),
    new THREE.MeshBasicMaterial({ color: C.cg300, wireframe: true, transparent: true, opacity: 0.2 }));
  termFrame.position.copy(termScreen.position); g.add(termFrame);

  // ── Knowledge graph (floating connected nodes) ───────────────────────────
  const graphCenterY = py + 2.5;
  const graphNodes = [
    { x: 0, y: 0, z: 0, r: 0.1, col: C.ab500 },
    { x: 1.2, y: 0.3, z: 0.4, r: 0.07, col: C.cg300 },
    { x: -1.0, y: 0.4, z: 0.3, r: 0.07, col: C.sc500 },
    { x: 0.5, y: -0.3, z: -0.8, r: 0.06, col: C.sq500 },
    { x: -0.7, y: -0.2, z: -0.6, r: 0.06, col: C.mg500 },
    { x: 1.5, y: -0.1, z: -0.3, r: 0.05, col: C.cg500 },
    { x: -1.5, y: 0.1, z: -0.2, r: 0.05, col: C.ab300 },
    { x: 0.2, y: 0.5, z: 0.9, r: 0.05, col: C.sc300 },
  ];
  const graphMeshes = [];
  graphNodes.forEach((n, i) => {
    const nd = new THREE.Mesh(new THREE.SphereGeometry(n.r, 8, 8), glow(n.col, 0.8));
    nd.position.set(cx + n.x, graphCenterY + n.y, cz - 0.5 + n.z);
    nd.userData.basePos = { x: cx + n.x, y: graphCenterY + n.y, z: cz - 0.5 + n.z };
    nd.userData.phaseOffset = i * 0.7;
    g.add(nd);
    graphMeshes.push(nd);
    knowledgeGraphNodes.push(nd);
  });
  // Edges: connect hub (0) to all others, plus a few cross-links
  const edgePairs = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[1,5],[2,6],[3,4],[1,7]];
  edgePairs.forEach(([a, b]) => {
    const lineMat = new THREE.LineBasicMaterial({ color: C.ab500, transparent: true, opacity: 0.2 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([graphMeshes[a].position.clone(), graphMeshes[b].position.clone()]);
    const line = new THREE.Line(lineGeo, lineMat);
    line.userData.nodeA = a;
    line.userData.nodeB = b;
    g.add(line);
    knowledgeGraphEdges.push(line);
  });
}

function buildProductionOps(g, cx, py, cz) {
  conveyorGroup = g;
  conveyorBaseY = py;
  conveyorCZ = cz + 1;

  // Conveyor belt surface
  const conv = addBox(g, 6, 0.1, 1, cx, py + 0.25, cz + 1, mat(C.mg500, { r: 0.6 }));
  addEdges(g, conv, C.sc500, 0.35);
  // Belt side rails
  for (const s of [-0.52, 0.52]) {
    addBox(g, 6, 0.14, 0.04, cx, py + 0.27, cz + 1 + s, mat(C.mg700, { r: 0.4, m: 0.2 }));
  }
  // Belt rollers (visible through the front)
  for (let rx = -2.5; rx <= 2.5; rx += 0.5) {
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 6), mat(C.mg300, { m: 0.2 }));
    roller.rotation.z = Math.PI / 2; roller.position.set(cx + rx, py + 0.19, cz + 1); g.add(roller);
  }

  // Seed initial cubes on belt
  for (let i = -2; i <= 2; i++) {
    spawnConveyorCube(cx + i * CUBE_SPACING);
  }

  // Robotic arms (SC-500 orange) — animated
  for (let side of [-1, 1]) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.2, 8), mat(C.sc700, { m: 0.4 }));
    base.position.set(cx + side * 2.5, py + 0.1, cz - 1.5); g.add(base);
    const lower = addBox(g, 0.12, 1.2, 0.12, cx + side * 2.5, py + 0.8, cz - 1.5, mat(C.sc500, { m: 0.3 }));
    addEdges(g, lower, C.sc500, 0.4);
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), glow(C.sc500, 0.8));
    joint.position.set(cx + side * 2.5, py + 1.4, cz - 1.5); g.add(joint);
    robotArmJoints.push(joint);
    const upper = addBox(g, 0.08, 0.8, 0.08, cx + side * 2.5 + side * 0.3, py + 1.2, cz - 1.5, mat(C.sc500, { m: 0.3 }));
    upper.userData.baseX = cx + side * 2.5 + side * 0.3;
    upper.userData.baseZ = cz - 1.5;
    upper.userData.side = side;
    robotArmUppers.push(upper);
  }
  // CNC machine
  const cnc = addBox(g, 2, 1.3, 1.5, cx, py + 0.65, cz - 2.2, mat(C.cg700, { r: 0.3, m: 0.3 }));
  addEdges(g, cnc, C.ab500, 0.3);
  // Hazard stripe
  addBox(g, 6.5, 0.03, 0.1, cx, py + 0.01, cz + 2.8, glow(C.sc500, 0.5));
}

function spawnConveyorCube(localX) {
  const size = 0.3 + Math.random() * 0.15;
  const color = CUBE_COLORS[Math.floor(Math.random() * CUBE_COLORS.length)];
  const cubeMat = mat(color, { r: 0.35 });
  cubeMat.transparent = true; cubeMat.opacity = 1;
  const cube = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), cubeMat);
  cube.position.set(localX, conveyorBaseY + 0.25 + 0.05 + size / 2, conveyorCZ);
  cube.rotation.y = Math.random() * 0.3 - 0.15;
  conveyorGroup.add(cube);
  conveyorCubes.push(cube);
}

function buildAnalytics(g, cx, py, cz) {
  // Large dashboard screens (3)
  const screenColors = [C.ab500, C.sq500, C.sc500];
  for (let i = -1; i <= 1; i++) {
    const sw = 2, sh = 1.4, col = screenColors[i + 1];
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), glow(col, 0.05));
    screen.position.set(cx + i * 2.5, py + 1.6, cz - 2); g.add(screen);
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh),
      new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.25 }));
    frame.position.copy(screen.position); g.add(frame);
    // Animated bar chart
    const barSet = [];
    const barHeights = [0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.3];
    barHeights.forEach((bh, bi) => {
      const barMat = glow(col, 0.5);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.02), barMat);
      bar.position.set(cx + i * 2.5 - 0.5 + bi * 0.18, py + 1.1, cz - 1.99);
      bar.scale.y = bh * 0.6;
      bar.position.y += bh * 0.3;
      bar.userData.baseHeight = bh;
      bar.userData.barIndex = bi;
      bar.userData.screenIndex = i + 1;
      bar.userData.baseY = py + 1.1;
      g.add(bar);
      barSet.push(bar);
    });
    analyticsBarSets.push(barSet);
  }
  // Control desk
  const desk = addBox(g, 3.5, 0.06, 1, cx, py + 0.55, cz + 1.5, mat(C.mg300));
  addEdges(g, desk, C.ab500, 0.2);
  // SPC chart (line)
  const spcPoints = [];
  for (let i = 0; i <= 10; i++) spcPoints.push(new THREE.Vector3(cx - 2 + i * 0.4, py + 1.8 + Math.sin(i * 0.8) * 0.3, cz + 2.5));
  analyticsScanCurve = new THREE.CatmullRomCurve3(spcPoints);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(analyticsScanCurve, 20, 0.015, 4), glow(C.ab500, 0.6));
  g.add(tube);
  // Scan dot that travels along the SPC curve
  analyticsScanLine = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), glow(C.ab500, 0.9));
  analyticsScanLine.position.copy(spcPoints[0]);
  g.add(analyticsScanLine);
}

function buildSupplyChain(g, cx, py, cz) {
  // Delivery truck — cargo + cab
  const cargo = addBox(g, 1.2, 0.7, 1.6, cx - 2.8, py + 0.35, cz + 0.3, mat(C.mg700, { r: 0.4, m: 0.15 }));
  addEdges(g, cargo, C.sc300, 0.3);
  addBox(g, 1.0, 0.5, 0.6, cx - 2.8, py + 0.25, cz - 0.9, mat(C.cg500, { r: 0.4, m: 0.2 }));
  // Wheels
  for (const wz of [-0.6, 0.8]) for (const wx of [-0.45, 0.45]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8), mat(0x222222, { r: 0.8, m: 0.1 }));
    wheel.rotation.z = Math.PI / 2; wheel.position.set(cx - 2.8 + wx * 1.5, py + 0.06, cz + wz); g.add(wheel);
  }
  // Loading dock
  addBox(g, 1.8, 0.08, 1.4, cx - 1, py + 0.04, cz + 0.3, mat(C.mg500, { r: 0.6 }));

  // Shipping crates on dock
  const crateColors = [C.sc500, C.ab500, C.sq500, C.sc300];
  for (let i = 0; i < 4; i++) {
    const crate = addBox(g, 0.35, 0.3, 0.35, cx - 1.5 + i * 0.5, py + 0.23, cz + 0.3, mat(crateColors[i], { r: 0.4 }));
    addEdges(g, crate, crateColors[i], 0.3);
  }

  // Warehouse rack units (open shelving with items)
  for (let s = 0; s < 2; s++) {
    const rx = cx + 1.8 + s * 1.8;
    // Uprights
    for (const oz of [-0.8, 0.8]) {
      addBox(g, 0.06, 1.3, 0.06, rx, py + 0.65, cz + oz, mat(C.mg500, { r: 0.5, m: 0.2 }));
    }
    // Shelf planks + items
    for (let lv = 0; lv < 3; lv++) {
      const sy = py + 0.2 + lv * 0.4;
      addBox(g, 0.08, 0.03, 1.8, rx, sy, cz, mat(C.mg300));
      for (let b = 0; b < 3; b++) {
        const bx = cz - 0.5 + b * 0.5;
        addBox(g, 0.06, 0.12 + Math.random() * 0.1, 0.18, rx, sy + 0.1, bx, mat([C.sc300, C.ab500, C.sq500][b], { r: 0.4 }));
      }
    }
  }

  // Route map (curved glowing line showing logistics path)
  const routePts = [
    new THREE.Vector3(cx - 2.5, py + 1.8, cz - 1),
    new THREE.Vector3(cx - 0.5, py + 2.1, cz - 0.3),
    new THREE.Vector3(cx + 1.5, py + 2.0, cz + 0.3),
    new THREE.Vector3(cx + 3.5, py + 1.8, cz + 1),
  ];
  supplyRouteCurve = new THREE.CatmullRomCurve3(routePts);
  const routeTube = new THREE.Mesh(new THREE.TubeGeometry(supplyRouteCurve, 24, 0.018, 4), glow(C.sc300, 0.45));
  g.add(routeTube);
  // Static waypoint markers
  supplyRouteCurve.getPoints(5).forEach(p => {
    const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), glow(C.sc300, 0.4));
    marker.position.copy(p); g.add(marker);
  });
  // Traveling package dots (animated)
  for (let i = 0; i < 4; i++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), glow(C.sc500, 0.85));
    dot.userData.offset = i / 4;
    g.add(dot);
    supplyRouteDots.push(dot);
  }
}

function buildContinuousImprovement(g, cx, py, cz) {
  // ── Left: Machine with sensor nodes ──────────────────────────────────────
  // Hydraulic press body
  const press = addBox(g, 1.2, 0.7, 1.0, cx - 3, py + 0.35, cz + 0.8, mat(C.cg500, { r: 0.35, m: 0.2 }));
  addEdges(g, press, C.sq500, 0.3);
  // Press ram (cylinder on top)
  const ram = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8), mat(C.mg500, { m: 0.3 }));
  ram.position.set(cx - 3, py + 1.0, cz + 0.8); g.add(ram);
  // Sensor nodes on machine — small spheres with status glow
  const sensorPositions = [
    { x: -0.5, y: 0.75, z: 0, col: 0x22CC44 },  // green: OK
    { x: 0.5,  y: 0.75, z: 0, col: 0x22CC44 },   // green: OK
    { x: 0,    y: 0.95, z: 0.4, col: 0xFFAA22 },  // yellow: warning
    { x: 0,    y: 0.3,  z: -0.5, col: 0xDD3333 }, // red: alert
  ];
  sensorPositions.forEach(s => {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), glow(s.col, 0.9));
    node.position.set(cx - 3 + s.x, py + s.y, cz + 0.8 + s.z); g.add(node);
    improveSensorNodes.push(node);
    // Sensor glow halo
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.12, 12), glow(s.col, 0.3));
    ring.rotation.x = -Math.PI / 6;
    ring.position.copy(node.position);
    g.add(ring);
    improveSensorNodes.push(ring);
  });
  // Signal lines from sensors to dashboard area
  const dashX = cx + 0.2, dashZ = cz - 1.5;
  sensorPositions.forEach(s => {
    const from = new THREE.Vector3(cx - 3 + s.x, py + s.y, cz + 0.8 + s.z);
    const to = new THREE.Vector3(dashX, py + 1.4, dashZ);
    const mid = new THREE.Vector3().lerpVectors(from, to, 0.5);
    mid.y += 0.5;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.008, 4), glow(s.col, 0.25));
    g.add(tube);
  });

  // ── Center: Diagnostic dashboard ─────────────────────────────────────────
  const screenW = 3.0, screenH = 1.8;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), glow(C.sq500, 0.04));
  screen.position.set(dashX, py + 1.2, dashZ); g.add(screen);
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH),
    new THREE.MeshBasicMaterial({ color: C.sq500, wireframe: true, transparent: true, opacity: 0.15 }));
  frame.position.copy(screen.position); g.add(frame);
  // Degradation trend line (going from green-good to red-bad, left to right)
  const trendPts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const degradation = t * t * 0.6;
    trendPts.push(new THREE.Vector3(
      dashX - screenW * 0.4 + t * screenW * 0.8,
      py + 1.6 - degradation,
      dashZ - 0.01
    ));
  }
  const trendCurve = new THREE.CatmullRomCurve3(trendPts);
  const trendTube = new THREE.Mesh(new THREE.TubeGeometry(trendCurve, 24, 0.012, 4), glow(C.sc500, 0.6));
  g.add(trendTube);
  // Threshold line (horizontal)
  const threshPts = [
    new THREE.Vector3(dashX - screenW * 0.4, py + 1.1, dashZ - 0.01),
    new THREE.Vector3(dashX + screenW * 0.4, py + 1.1, dashZ - 0.01),
  ];
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(threshPts),
    new THREE.LineBasicMaterial({ color: 0xDD3333, transparent: true, opacity: 0.4 })));
  // Alert marker where trend crosses threshold
  const alert = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), glow(0xDD3333, 0.9));
  alert.position.set(dashX + screenW * 0.2, py + 1.1, dashZ - 0.01); g.add(alert);

  // ── Right: PDCA cycle + builder station ──────────────────────────────────
  // PDCA ring (Plan-Do-Check-Act)
  const pdcaY = py + 1.2, pdcaX = cx + 3, pdcaZ = cz + 0.5, pdcaR = 0.7;
  const pdcaRing = new THREE.Mesh(new THREE.TorusGeometry(pdcaR, 0.015, 8, 32), glow(C.sq500, 0.35));
  pdcaRing.rotation.x = -Math.PI / 5;
  pdcaRing.position.set(pdcaX, pdcaY, pdcaZ); g.add(pdcaRing);
  improvePdcaRing = pdcaRing;
  // PDCA quadrant nodes
  const pdcaEntries = [
    { angle: 0, col: C.ab500 },
    { angle: Math.PI / 2, col: C.sc500 },
    { angle: Math.PI, col: 0x22CC44 },
    { angle: Math.PI * 1.5, col: C.sq500 },
  ];
  pdcaEntries.forEach(p => {
    const nd = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), glow(p.col, 0.8));
    nd.userData.pdcaAngle = p.angle;
    nd.userData.pdcaCenter = { x: pdcaX, y: pdcaY, z: pdcaZ };
    nd.userData.pdcaR = pdcaR;
    g.add(nd);
    improvePdcaNodes.push(nd);
  });

  // Builder tablet (flat screen on desk)
  const desk = addBox(g, 2, 0.05, 1.2, cx + 2.8, py + 0.35, cz + 2.3, mat(C.mg300, { r: 0.5 }));
  addEdges(g, desk, C.sq500, 0.15);
  const tablet = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), glow(C.ab500, 0.06));
  tablet.rotation.x = -Math.PI / 2;
  tablet.position.set(cx + 2.8, py + 0.39, cz + 2.3); g.add(tablet);
  const tabletFrame = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7),
    new THREE.MeshBasicMaterial({ color: C.ab500, wireframe: true, transparent: true, opacity: 0.2 }));
  tabletFrame.rotation.x = -Math.PI / 2;
  tabletFrame.position.copy(tablet.position); g.add(tabletFrame);
  // Workflow nodes on tablet
  for (let i = 0; i < 4; i++) {
    const nx = cx + 2.2 + i * 0.4;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), glow(C.ab500, 0.7));
    dot.position.set(nx, py + 0.4, cz + 2.3); g.add(dot);
    if (i < 3) {
      g.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(nx + 0.05, py + 0.4, cz + 2.3),
          new THREE.Vector3(nx + 0.35, py + 0.4, cz + 2.3),
        ]),
        new THREE.LineBasicMaterial({ color: C.ab500, transparent: true, opacity: 0.3 })
      ));
    }
  }
}

// ─── Bridges ─────────────────────────────────────────────────────────────────
function buildBridges() {
  const northCenter = new THREE.Vector3(0, CENTER_Y + PLAT_H / 2, 0);
  AREAS.forEach((area, i) => {
    // The platform front edge (local -Z) faces center, so the bridge endpoint
    // is the front-center of the slab in world space
    const angle = Math.atan2(-area.x, -area.z);
    const edgeOffset = PLAT_D / 2;
    const areaCenter = new THREE.Vector3(
      area.x + Math.sin(angle) * edgeOffset,
      OUTER_Y + PLAT_H / 2,
      area.z + Math.cos(angle) * edgeOffset,
    );
    const mid = new THREE.Vector3().lerpVectors(northCenter, areaCenter, 0.5);
    mid.y = Math.max(northCenter.y, areaCenter.y) + 1.5;

    const curve = new THREE.QuadraticBezierCurve3(northCenter, mid, areaCenter);
    // Bridge tube
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.07, 6), glow(C.ab500, 0.12));
    scene.add(tube);
    // Bridge edge glow
    const tubeWire = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.09, 6), new THREE.MeshBasicMaterial({ color: C.ab500, wireframe: true, transparent: true, opacity: 0.06 }));
    scene.add(tubeWire);

    // Particles (outward = coral, inward = blue)
    const mkParts = (color, count, speed) => {
      const offsets = new Float32Array(count);
      for (let j = 0; j < count; j++) offsets[j] = Math.random();
      const positions = new Float32Array(count * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({ color, size: 0.1, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
      const pts = new THREE.Points(geo, mat); scene.add(pts);
      return { points: pts, curve, offsets, count, speed, inward: speed < 0 };
    };
    const outward = mkParts(C.sc500, 14, 0.12 + Math.random() * 0.06);
    const inward = mkParts(C.ab500, 10, -(0.1 + Math.random() * 0.05));
    conduitParticles.push(outward, inward);

    bridgeData.push({ tube, tubeWire, curve, areaIndex: i, outward, inward });
  });
}

// ─── Ambient Particles ───────────────────────────────────────────────────────
function createAmbientParticles() {
  const count = 350;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = Math.random() * 18 + 1;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  ambientPts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: C.ab300, size: 0.06, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  scene.add(ambientPts);
}

// ─── Interactions ────────────────────────────────────────────────────────────
function setupInteractions() {
  renderer.domElement.addEventListener('pointerdown', (e) => { pointerDownPos = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('mousemove', onMove);
  addEventListener('keydown', onKey);
  addEventListener('resize', onResize);
  document.getElementById('detail-trigger').addEventListener('click', openDetailModal);
  document.getElementById('exit-btn').addEventListener('click', closePanel);
  document.getElementById('detail-close-btn').addEventListener('click', closeDetailModal);
  document.getElementById('fs-btn').addEventListener('click', toggleFS);
  document.getElementById('tour-btn').addEventListener('click', toggleTour);
  // Populate scenario dropdown
  const menu = document.getElementById('scenario-menu');
  SCENARIOS.forEach((sc, i) => {
    const item = document.createElement('div');
    item.className = 'scenario-menu-item';
    item.dataset.idx = i;
    item.innerHTML = `<span class="menu-name">${sc.name}</span>`;
    item.addEventListener('click', () => { closeDropdown(); showScenarioModal(i); });
    menu.appendChild(item);
  });
  document.getElementById('scenario-btn').addEventListener('click', () => {
    if (incidentActive) { endIncident(true); return; }
    toggleDropdown();
  });
  document.getElementById('modal-run').addEventListener('click', confirmScenario);
  document.getElementById('modal-abort').addEventListener('click', hideScenarioModal);
  document.addEventListener('click', (e) => {
    if (dropdownOpen && !document.getElementById('scenario-dropdown').contains(e.target)) closeDropdown();
  });
}

function toggleDropdown() {
  dropdownOpen ? closeDropdown() : openDropdown();
}
function openDropdown() {
  dropdownOpen = true;
  document.getElementById('scenario-menu').classList.add('open');
}
function closeDropdown() {
  dropdownOpen = false;
  document.getElementById('scenario-menu').classList.remove('open');
}

function showScenarioModal(idx) {
  pendingScenarioIdx = idx;
  const sc = SCENARIOS[idx];
  const modal = document.getElementById('scenario-modal');
  document.getElementById('modal-name').textContent = sc.name;
  document.getElementById('modal-desc').textContent = sc.description;
  const stepsEl = document.getElementById('modal-steps');
  const phaseColors = { SEE: '#22CC44', DOCUMENT: '#FF7759', PLAN: '#D9A6E5', MEASURE: '#4C6EE6', MANAGE: '#FFA18C' };
  stepsEl.innerHTML = sc.steps.map((s, i) =>
    `<div class="scenario-modal-step"><span class="scenario-modal-step-num">${i + 1}</span><span class="scenario-modal-step-phase" style="color:${phaseColors[s.phase] || '#4C6EE6'}">${s.phase}</span><span class="scenario-modal-step-title">${s.title}</span></div>`
  ).join('');
  modal.classList.add('visible');
}

function hideScenarioModal() {
  document.getElementById('scenario-modal').classList.remove('visible');
  pendingScenarioIdx = -1;
}

function confirmScenario() {
  const idx = pendingScenarioIdx;
  hideScenarioModal();
  if (idx >= 0) startIncident(idx);
}

function onMove(e) {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(clickTargets);
  renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'default';

  // Hover highlighting
  let newHover = -1;
  if (hits.length > 0) {
    const ud = hits[0].object.userData;
    newHover = ud.type === 'north' ? -2 : ud.index;
  }
  if (newHover !== hoveredPlatform && selectedTarget === null && !tourActive && !incidentActive) {
    hoveredPlatform = newHover;
    updateHoverState();
  }
}

function updateHoverState() {
  platformGroups.forEach((pg, i) => {
    const isNorth = i === 0;
    const pgIdx = isNorth ? -2 : (i - 1);
    const isHovered = pgIdx === hoveredPlatform;
    const dimmed = hoveredPlatform !== -1 && !isHovered;
    pg.traverse(child => {
      if (child.material && child.material.opacity !== undefined && child.material.transparent) {
        // Don't mess with invisible click targets
        if (child.material.visible === false) return;
      }
    });
    allLabels.forEach(l => {
      if (l.type === 'agent-sub') return;
      l.element.style.transition = 'opacity 0.3s ease';
      if (l.type === 'north') {
        l.element.style.opacity = hoveredPlatform === -1 || hoveredPlatform === -2 ? '1' : '0.4';
      } else if (l.type === 'area') {
        l.element.style.opacity = hoveredPlatform === -1 || hoveredPlatform === l.index ? '1' : '0.4';
      }
    });
    // Brighten hovered bridge
    bridgeData.forEach(bd => {
      const bright = hoveredPlatform === bd.areaIndex;
      bd.tube.material.opacity = bright ? 0.35 : 0.12;
      bd.tubeWire.material.opacity = bright ? 0.15 : 0.06;
    });
  });
}

function onClick(e) {
  if (pointerDownPos) {
    const dx = e.clientX - pointerDownPos.x, dy = e.clientY - pointerDownPos.y;
    if (dx * dx + dy * dy > 25) { pointerDownPos = null; return; }
  }
  pointerDownPos = null;
  if (tourActive) { stopTour(); return; }
  if (isAnimating || incidentActive) return;
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(clickTargets);
  if (hits.length > 0) {
    const ud = hits[0].object.userData;
    if (ud.type === 'north') zoomTo(new THREE.Vector3(0, CENTER_Y, 0), ud.data, 'north');
    else zoomTo(new THREE.Vector3(ud.data.x, OUTER_Y, ud.data.z), ud.data, 'area', ud.index);
  }
}

function onKey(e) {
  if (tourActive) { stopTour(); return; }
  if (e.key === 'Escape') { if (pendingScenarioIdx >= 0) { hideScenarioModal(); return; } if (dropdownOpen) { closeDropdown(); return; } if (detailModalOpen) { closeDetailModal(); return; } closePanel(); return; }
  if (e.key === 'f' || e.key === 'F') { toggleFS(); return; }
  if (e.key === '0') { zoomTo(new THREE.Vector3(0, CENTER_Y, 0), NORTH_DATA, 'north'); return; }
  const n = parseInt(e.key);
  if (n >= 1 && n <= 5) {
    const a = AREAS[n - 1];
    zoomTo(new THREE.Vector3(a.x, OUTER_Y, a.z), a, 'area', n - 1);
  }
}

function onResize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); cssRenderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}

function toggleFS() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
}

// ─── Camera ──────────────────────────────────────────────────────────────────
function fadeLabels(show, exceptType = null, exceptIdx = -1) {
  allLabels.forEach(l => {
    l.element.style.transition = 'opacity 0.4s ease';
    if (l.type === 'agent-sub') {
      const isZoomedParent = exceptType === 'area' && l.parentIdx === exceptIdx;
      l.element.style.opacity = isZoomedParent && !show ? '1' : '0';
    } else {
      const isException = (l.type === exceptType && (exceptType === 'north' || l.index === exceptIdx));
      l.element.style.opacity = show ? '1' : (isException ? '1' : '0');
    }
  });
}

function zoomTo(center, data, type, idx, autoReturn = false) {
  if (isAnimating) return;
  isAnimating = true;
  selectedTarget = type === 'north' ? 'north' : idx;
  controls.autoRotate = false;
  fadeLabels(false, type, idx ?? -1);

  // Camera approaches from the OUTSIDE (behind the platform, looking toward center)
  // For platforms: the back of the platform is in the direction AWAY from center
  const dir = center.clone(); dir.y = 0;
  if (dir.length() < 0.1) dir.set(1, 0, 1);
  dir.normalize();
  const camPos = new THREE.Vector3(center.x + dir.x * 16, center.y + 8, center.z + dir.z * 16);
  const lookAt = new THREE.Vector3(center.x, center.y + 0.5, center.z);

  gsap.to(camera.position, {
    x: camPos.x, y: camPos.y, z: camPos.z, duration: 1.3, ease: 'power2.inOut',
    onUpdate: () => { camera.lookAt(lookAt); controls.target.copy(lookAt); },
    onComplete: () => {
      isAnimating = false;
      zoomedData = data; zoomedType = type;
      if (tourActive) {
        openDetailModal();
      } else if (!incidentActive) {
        document.getElementById('zoom-actions').classList.remove('hidden');
      }
    }
  });
  document.getElementById('hint-text').classList.add('hidden');
}

function zoomOut(cb) {
  if (isAnimating) return;
  isAnimating = true;
  selectedTarget = null; hoveredPlatform = -1;
  zoomedData = null; zoomedType = null;
  document.getElementById('zoom-actions').classList.add('hidden');
  document.getElementById('detail-modal').classList.remove('visible');
  detailModalOpen = false;
  const lookAt = new THREE.Vector3(CAM_TARGET.x, CAM_TARGET.y, CAM_TARGET.z);
  gsap.to(camera.position, {
    x: CAM_DEFAULT.x, y: CAM_DEFAULT.y, z: CAM_DEFAULT.z, duration: 1.3, ease: 'power2.inOut',
    onUpdate: () => { camera.lookAt(lookAt); controls.target.copy(lookAt); },
    onComplete: () => {
      isAnimating = false; controls.autoRotate = true;
      fadeLabels(true); updateHoverState();
      document.getElementById('hint-text').classList.remove('hidden');
      if (cb) cb();
    }
  });
}

// ─── Detail Modal ────────────────────────────────────────────────────────────
function openDetailModal() {
  if (!zoomedData) return;
  const data = zoomedData, type = zoomedType;
  const content = document.getElementById('panel-content');

  if (type === 'north') {
    content.innerHTML = `
      <div class="panel-eyebrow" style="color:var(--ab-500)">Cohere North</div>
      <div class="panel-title">${data.name}</div>
      <div class="panel-subtitle">${data.subtitle}</div>
      <div class="panel-desc">${data.description}</div>
      <div class="panel-divider"></div>
      <div class="panel-section">Platform Capabilities</div>
      <div class="panel-caps-list">${data.capabilities.map(c => `<div class="panel-cap-item"><div class="panel-cap-dot"></div><span>${c}</span></div>`).join('')}</div>
      <div class="panel-divider"></div>
      <div class="panel-section">Progressive Trust Escalation</div>
      <div class="panel-trust-table">${data.trustLevels.map(t => `<div class="panel-trust-row"><span class="panel-trust-step" style="color:var(--ab-500)">${t.step}</span><span class="panel-trust-role">${t.role}</span><span class="panel-trust-desc">${t.description}</span></div>`).join('')}</div>
      <div class="panel-divider"></div>
      <div class="panel-section">Governance & Security</div>
      <div class="panel-gov-list">${data.governance.map(g => `<div class="panel-gov-item"><span class="panel-gov-icon">◆</span><span>${g}</span></div>`).join('')}</div>`;
  } else {
    const colorHex = data.accentHex;
    content.innerHTML = `
      <div class="panel-eyebrow" style="color:${colorHex}">${data.name}</div>
      <div class="panel-title">${data.shortName}</div>
      <div class="panel-divider"></div>
      <div class="panel-section">Transformation</div>
      <div class="panel-today-with">
        <div class="panel-tw-block today"><div class="panel-tw-badge">Today</div><div class="panel-tw-text">${data.today}</div></div>
        <div class="panel-tw-block with-north"><div class="panel-tw-badge">With North</div><div class="panel-tw-text">${data.withNorth}</div></div>
      </div>
      ${data.kpis ? `<div class="panel-divider"></div><div class="panel-section">Key Metrics</div><div class="panel-kpis">${data.kpis.map(k => `<div class="panel-kpi-row"><span class="panel-kpi-label">${k.label}</span><span class="panel-kpi-before">${k.before}</span><span class="panel-kpi-arrow">→</span><span class="panel-kpi-after">${k.after}</span></div>`).join('')}</div>` : ''}
      <div class="panel-divider"></div>
      <div class="panel-section">Agents</div>
      <div class="panel-agents-list">${data.agents.map(a => `<div class="panel-agent-item" style="border-left-color:${colorHex}"><div class="panel-agent-name">${a.name}</div><div class="panel-agent-desc">${a.desc}</div></div>`).join('')}</div>`;
  }
  document.getElementById('detail-modal').classList.add('visible');
  detailModalOpen = true;
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.remove('visible');
  detailModalOpen = false;
}

function closePanel() {
  closeDetailModal();
  document.getElementById('zoom-actions').classList.add('hidden');
  if (!tourActive) setTimeout(() => zoomOut(), 100);
}

// ─── Intro ───────────────────────────────────────────────────────────────────
function playIntro() {
  isAnimating = true; controls.autoRotate = false;
  camera.position.set(55, 35, 55);
  const lookAt = new THREE.Vector3(0, 2, 0);
  camera.lookAt(lookAt); controls.target.copy(lookAt);

  const container = document.getElementById('scene-container');
  const introEl = document.getElementById('intro-text');
  const lines = [document.getElementById('intro-line-1'), document.getElementById('intro-line-2'), document.getElementById('intro-line-3')];

  introEl.classList.remove('hidden');

  const hideIntro = () => {
    lines.forEach(l => { l.classList.remove('visible'); l.classList.add('fade-out'); });
    setTimeout(() => introEl.classList.add('hidden'), 700);
  };

  const startZoom = () => {
    gsap.to(camera.position, {
      x: CAM_DEFAULT.x, y: CAM_DEFAULT.y, z: CAM_DEFAULT.z, duration: 3.5, ease: 'power2.inOut',
      onUpdate: () => { camera.lookAt(lookAt); controls.target.copy(lookAt); },
      onComplete: () => { isAnimating = false; controls.autoRotate = true; }
    });
  };

  // Phase 1: Show lines sequentially on blurred background
  setTimeout(() => lines[0]?.classList.add('visible'), 600);
  setTimeout(() => lines[1]?.classList.add('visible'), 2200);
  setTimeout(() => lines[2]?.classList.add('visible'), 3800);

  // Phase 2: After lines are visible, hold, then unblur
  setTimeout(() => {
    hideIntro();
    introBlurActive = false;
    container.classList.remove('intro-blur');

    // Phase 3: After unblur transition completes, start zoom + spin
    setTimeout(() => {
      document.getElementById('hint-text').classList.remove('hidden');
      startZoom();
    }, 1300);
  }, 6000);
}

// ─── Auto-Pilot Tour ─────────────────────────────────────────────────────────
function startTour() {
  if (tourActive) return;
  tourActive = true; tourIndex = -1;
  document.getElementById('tour-btn').classList.add('active');
  document.getElementById('tour-dots').classList.remove('hidden');
  tourNext();
}

function stopTour() {
  tourActive = false;
  clearTimeout(tourTimer);
  document.getElementById('tour-btn').classList.remove('active');
  document.getElementById('tour-dots').classList.add('hidden');
  const captionEl = document.getElementById('tour-caption');
  captionEl.classList.remove('visible');
  setTimeout(() => captionEl.classList.add('hidden'), 500);
  closePanel();
}

function toggleTour() {
  if (tourActive) stopTour();
  else {
    closeDetailModal();
    document.getElementById('zoom-actions').classList.add('hidden');
    if (selectedTarget !== null) {
      zoomOut(() => startTour());
    } else {
      startTour();
    }
  }
}

function tourNext() {
  if (!tourActive) return;
  tourIndex = (tourIndex + 1) % TOUR_ORDER.length;
  // Update dots
  document.querySelectorAll('.tour-dot').forEach((d, i) => d.classList.toggle('active', i === tourIndex));
  const target = TOUR_ORDER[tourIndex];
  closeDetailModal();
  document.getElementById('zoom-actions').classList.add('hidden');

  const captionEl = document.getElementById('tour-caption');
  const captionData = target === 'north' ? NORTH_DATA : AREAS[target];
  const doZoom = () => {
    if (!tourActive) return;
    if (target === 'north') {
      zoomTo(new THREE.Vector3(0, CENTER_Y, 0), NORTH_DATA, 'north');
    } else {
      const a = AREAS[target];
      zoomTo(new THREE.Vector3(a.x, OUTER_Y, a.z), a, 'area', target);
    }
    if (captionData.tourCaption) {
      captionEl.textContent = captionData.tourCaption;
      captionEl.classList.remove('hidden');
      requestAnimationFrame(() => captionEl.classList.add('visible'));
    }
    tourTimer = setTimeout(() => {
      if (!tourActive) return;
      captionEl.classList.remove('visible');
      closeDetailModal();
      document.getElementById('zoom-actions').classList.add('hidden');
      isAnimating = false; selectedTarget = null;
      const lookAt = new THREE.Vector3(CAM_TARGET.x, CAM_TARGET.y, CAM_TARGET.z);
      gsap.to(camera.position, {
        x: CAM_DEFAULT.x, y: CAM_DEFAULT.y, z: CAM_DEFAULT.z, duration: 1.6, ease: 'power2.inOut',
        onUpdate: () => { camera.lookAt(lookAt); controls.target.copy(lookAt); },
        onComplete: () => { fadeLabels(true); setTimeout(tourNext, 1200); }
      });
    }, TOUR_INTERVAL - 1600);
  };

  if (selectedTarget !== null) {
    isAnimating = false;
    zoomOut(doZoom);
  } else {
    doZoom();
  }
}

// ─── Live Incident Cascade ───────────────────────────────────────────────────
function startIncident(scenarioIdx = 0) {
  if (incidentActive || isAnimating) return;
  if (tourActive) stopTour();
  closeDetailModal();
  document.getElementById('zoom-actions').classList.add('hidden');
  activeScenarioSteps = SCENARIOS[scenarioIdx].steps;
  incidentActive = true;
  incidentRunId++;
  const thisRunId = incidentRunId;
  controls.autoRotate = false;
  const scenBtn = document.getElementById('scenario-btn');
  scenBtn.classList.add('active');
  scenBtn.textContent = 'Stop Scenario';
  closeDropdown();
  document.querySelectorAll('.scenario-menu-item').forEach((el, i) => el.classList.toggle('playing', i === scenarioIdx));
  trustRings.forEach(r => { r.material.opacity = 0.05; });
  document.getElementById('toast-progress-fill').style.width = '0%';
  activeScenarioIdx = scenarioIdx;

  incidentPacket = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 12),
    new THREE.MeshBasicMaterial({ color: C.sc500, transparent: true, opacity: 0.9 })
  );
  scene.add(incidentPacket);
  const packetGlow = new THREE.PointLight(C.sc500, 2, 8, 2);
  incidentPacket.add(packetGlow);

  runIncidentStep(0, thisRunId);
}

function runIncidentStep(stepIdx, runId) {
  if (runId !== incidentRunId) return;
  if (stepIdx >= activeScenarioSteps.length) {
    endIncident();
    return;
  }
  const step = activeScenarioSteps[stepIdx];
  const toast = document.getElementById('incident-toast');

  // Determine target position
  let targetPos;
  if (step.areaId === 'north') {
    targetPos = new THREE.Vector3(0, CENTER_Y + 2, 0);
  } else {
    const area = AREAS.find(a => a.id === step.areaId);
    targetPos = new THREE.Vector3(area.x, OUTER_Y + 2, area.z);
  }

  const startPos = stepIdx === 0
    ? (() => {
        const firstArea = step.areaId === 'north' ? null : AREAS.find(x => x.id === step.areaId);
        return firstArea ? new THREE.Vector3(firstArea.x, OUTER_Y + 2, firstArea.z) : new THREE.Vector3(0, CENTER_Y + 2, 0);
      })()
    : incidentPacket.position.clone();

  incidentPacket.position.copy(startPos);

  const arcPeak = targetPos.y + 3 + Math.sin(stepIdx * 0.7) * 1.5;
  const travelDuration = 2.5;

  const dir = targetPos.clone(); dir.y = 0;
  if (dir.length() < 0.1) dir.set(1, 0, 1);
  dir.normalize();
  const finalCamPos = new THREE.Vector3(targetPos.x + dir.x * 16, targetPos.y + 8, targetPos.z + dir.z * 16);

  gsap.to(incidentPacket.position, {
    x: targetPos.x, z: targetPos.z,
    duration: travelDuration, ease: 'power2.inOut',
  });
  gsap.to(incidentPacket.position, {
    y: arcPeak, duration: travelDuration * 0.5, ease: 'power2.out',
    onComplete: () => {
      gsap.to(incidentPacket.position, {
        y: targetPos.y, duration: travelDuration * 0.5, ease: 'power2.in',
      });
    }
  });

  const camTrack = { progress: 0 };
  gsap.to(camTrack, {
    progress: 1, duration: travelDuration, ease: 'power2.inOut',
    onUpdate: () => {
      const p = incidentPacket.position;
      camera.position.lerp(finalCamPos, 0.08);
      const lookTarget = new THREE.Vector3(p.x, p.y, p.z);
      controls.target.lerp(lookTarget, 0.12);
      camera.lookAt(controls.target);
    },
    onComplete: () => {
      camera.position.copy(finalCamPos);
      controls.target.set(targetPos.x, targetPos.y + 0.5, targetPos.z);
      camera.lookAt(controls.target);
      if (stepIdx < trustRings.length) {
        gsap.to(trustRings[stepIdx].material, { opacity: 0.5, duration: 0.8 });
      }

      // Platform glow pulse
      const areaIdx = AREAS.findIndex(a => a.id === step.areaId);
      if (areaIdx >= 0 && platformSlabMats[areaIdx]) {
        gsap.fromTo(platformSlabMats[areaIdx], { emissiveIntensity: 0.6 }, { emissiveIntensity: 0.05, duration: 1.5, ease: 'power2.out' });
      }

      // Progress bar
      const pct = ((stepIdx + 1) / activeScenarioSteps.length) * 100;
      document.getElementById('toast-progress-fill').style.width = pct + '%';

      const phaseEl = toast.querySelector('.toast-phase');
      phaseEl.textContent = step.phase;
      const phaseColors = { SEE: '#22CC44', DOCUMENT: '#FF7759', PLAN: '#D9A6E5', MEASURE: '#4C6EE6', MANAGE: '#FFA18C' };
      phaseEl.style.color = phaseColors[step.phase] || '#4C6EE6';
      toast.querySelector('.toast-role').textContent = step.role;
      toast.querySelector('.toast-title').textContent = step.title;
      toast.querySelector('.toast-text').textContent = step.label;
      toast.querySelector('.toast-step').textContent = `${stepIdx + 1} / ${activeScenarioSteps.length}`;
      toast.classList.add('visible');

      setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => runIncidentStep(stepIdx + 1, runId), 800);
      }, 5000);
    }
  });
}

function endIncident(manual = false) {
  const completedNaturally = !manual && activeScenarioIdx >= 0;
  incidentActive = false;
  incidentRunId++;
  const scenBtn = document.getElementById('scenario-btn');
  scenBtn.classList.remove('active');
  scenBtn.textContent = 'Live Scenario \u25BE';
  document.querySelectorAll('.scenario-menu-item').forEach(el => el.classList.remove('playing'));
  document.getElementById('incident-toast').classList.remove('visible');
  if (incidentPacket) {
    gsap.killTweensOf(incidentPacket.position);
    scene.remove(incidentPacket); incidentPacket = null;
  }
  gsap.killTweensOf(camera.position);
  platformSlabMats.forEach(m => gsap.to(m, { emissiveIntensity: 0, duration: 1 }));

  if (completedNaturally) {
    showKpiSummary();
  }
  activeScenarioSteps = null;
  activeScenarioIdx = -1;
  zoomOut();
  setTimeout(() => { trustRings.forEach(r => gsap.to(r.material, { opacity: 0.05, duration: 2 })); }, 3000);
}

function showKpiSummary() {
  const touchedAreaIds = [...new Set(SCENARIOS[activeScenarioIdx].steps.map(s => s.areaId).filter(id => id !== 'north'))];
  const kpis = [];
  touchedAreaIds.forEach(id => {
    const area = AREAS.find(a => a.id === id);
    if (area?.kpis) kpis.push(...area.kpis.slice(0, 1));
  });
  if (kpis.length === 0) return;
  const rowsEl = document.getElementById('kpi-summary-rows');
  rowsEl.innerHTML = kpis.map(k =>
    `<div class="kpi-summary-row"><span class="kpi-summary-label">${k.label}</span><span class="kpi-summary-before">${k.before}</span><span class="kpi-summary-arrow">\u2192</span><span class="kpi-summary-after">${k.after}</span></div>`
  ).join('');
  const el = document.getElementById('kpi-summary');
  el.classList.remove('hidden');
  requestAnimationFrame(() => el.classList.add('visible'));
  setTimeout(() => {
    el.classList.remove('visible');
    setTimeout(() => el.classList.add('hidden'), 500);
  }, 4000);
}

// ─── Animation Loop ──────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.getElapsedTime();
  controls.update();

  if (!introBlurActive) {
  // Compass crystal
  if (compassCrystal) {
    compassCrystal.rotation.y = t * 0.2;
    compassCrystal.rotation.x = Math.sin(t * 0.25) * 0.08;
    compassCrystal.position.y = CENTER_Y + 3.5 + Math.sin(t * 0.6) * 0.1;
    compassWire.position.y = compassCrystal.position.y;
    compassWire.rotation.y = t * 0.18;
  }

  // Compass orbiting rings
  compassRings.forEach((ring, i) => {
    ring.rotation.y = t * (0.12 + i * 0.08);
    ring.rotation.x = Math.PI / 3 + i * 0.4 + Math.sin(t * 0.3 + i) * 0.08;
    ring.position.y = compassCrystal.position.y;
  });

  // Agent crystals on platforms (local coords, so base Y is relative to group)
  const crystalBaseY = OUTER_Y + PLAT_H / 2 + 3.2;
  platformGroups.forEach((pg, i) => {
    if (i === 0) return;
    const ud = pg.userData;
    if (ud.crystal) {
      ud.crystal.rotation.y = t * 0.4 + i;
      ud.crystal.position.y = crystalBaseY + Math.sin(t * 0.7 + i * 0.9) * 0.08;
    }
    if (ud.crystalRing) {
      const pulse = Math.sin(t * 2 + i * 0.8) * 0.5 + 0.5;
      ud.crystalRing.scale.setScalar(1 + pulse * 0.08);
      ud.crystalRing.material.opacity = 0.25 + pulse * 0.2;
      ud.crystalRing.position.y = ud.crystal.position.y;
    }
  });

  // Conduit particles
  conduitParticles.forEach(cp => {
    const pos = cp.points.geometry.attributes.position.array;
    for (let j = 0; j < cp.count; j++) {
      cp.offsets[j] = (cp.offsets[j] + dt * Math.abs(cp.speed)) % 1;
      const tt = cp.speed > 0 ? cp.offsets[j] : 1 - cp.offsets[j];
      const pt = cp.curve.getPoint(tt);
      pos[j * 3] = pt.x; pos[j * 3 + 1] = pt.y; pos[j * 3 + 2] = pt.z;
    }
    cp.points.geometry.attributes.position.needsUpdate = true;
  });

  // Ambient particles drift
  if (ambientPts) {
    const ap = ambientPts.geometry.attributes.position.array;
    for (let i = 0; i < ap.length; i += 3) {
      ap[i + 1] += Math.sin(t * 0.3 + i) * 0.002;
      if (ap[i + 1] > 20) ap[i + 1] = 1;
    }
    ambientPts.geometry.attributes.position.needsUpdate = true;
  }

  // Improvement platform — PDCA rotation + sensor pulse
  if (improvePdcaRing) {
    improvePdcaRing.rotation.z = t * 0.3;
    improvePdcaNodes.forEach(nd => {
      const a = nd.userData.pdcaAngle + t * 0.3;
      const c = nd.userData.pdcaCenter, r = nd.userData.pdcaR;
      nd.position.set(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.35, c.z + Math.sin(a) * r * 0.8);
    });
  }
  for (let si = 0; si < improveSensorNodes.length; si++) {
    const sn = improveSensorNodes[si];
    const pulse = 0.7 + Math.sin(t * 3 + si * 1.5) * 0.3;
    sn.material.opacity = pulse;
  }
  // Conveyor belt cubes
  if (!introBlurActive && conveyorGroup && conveyorCubes.length > 0) {
    const move = dt * BELT_SPEED;
    for (let i = conveyorCubes.length - 1; i >= 0; i--) {
      const cube = conveyorCubes[i];
      cube.position.x += move;
      const edge = BELT_HALF_LEN + 0.5;
      // Fade in at spawn edge
      if (cube.position.x < -BELT_HALF_LEN + 0.5) {
        cube.material.opacity = Math.max(0, (cube.position.x + edge) / 1.0);
      } else if (cube.position.x > BELT_HALF_LEN - 0.5) {
        cube.material.opacity = Math.max(0, (edge - cube.position.x) / 1.0);
      } else {
        cube.material.opacity = 1;
      }
      // Remove when past far edge, spawn new one at near edge
      if (cube.position.x > edge) {
        conveyorGroup.remove(cube);
        cube.geometry.dispose(); cube.material.dispose();
        conveyorCubes.splice(i, 1);
        spawnConveyorCube(-BELT_HALF_LEN - 0.3);
      }
    }
  }

  } // end !introBlurActive

  if (!introBlurActive) {
  // Knowledge Hub — floating docs bob + knowledge graph breathes
  knowledgeDocPanels.forEach(panel => {
    panel.position.y = panel.userData.baseY + Math.sin(t * 0.5 + panel.userData.phaseOffset) * 0.08;
  });
  knowledgeGraphNodes.forEach(nd => {
    const bp = nd.userData.basePos;
    nd.position.y = bp.y + Math.sin(t * 0.6 + nd.userData.phaseOffset) * 0.06;
    nd.material.opacity = 0.6 + Math.sin(t * 2 + nd.userData.phaseOffset) * 0.2;
  });
  knowledgeGraphEdges.forEach(line => {
    const a = knowledgeGraphNodes[line.userData.nodeA];
    const b = knowledgeGraphNodes[line.userData.nodeB];
    const pos = line.geometry.attributes.position.array;
    pos[0] = a.position.x; pos[1] = a.position.y; pos[2] = a.position.z;
    pos[3] = b.position.x; pos[4] = b.position.y; pos[5] = b.position.z;
    line.geometry.attributes.position.needsUpdate = true;
    line.material.opacity = 0.15 + Math.sin(t * 1.5 + line.userData.nodeA) * 0.1;
  });

  // Production Ops — robotic arm sway
  robotArmUppers.forEach((upper, i) => {
    const swing = Math.sin(t * 1.2 + i * Math.PI) * 0.4;
    upper.position.x = upper.userData.baseX + swing * 0.15;
    upper.position.z = upper.userData.baseZ + Math.cos(t * 1.2 + i * Math.PI) * 0.1;
    upper.rotation.z = swing * 0.3;
  });
  robotArmJoints.forEach((joint, i) => {
    joint.material.opacity = 0.6 + Math.sin(t * 3 + i * 2) * 0.3;
  });

  // Analytics — bar chart height animation + scan dot
  analyticsBarSets.forEach(barSet => {
    barSet.forEach(bar => {
      const base = bar.userData.baseHeight;
      const wave = Math.sin(t * 0.8 + bar.userData.barIndex * 0.5 + bar.userData.screenIndex * 2) * 0.15;
      const h = Math.max(0.1, base + wave);
      bar.scale.y = h * 0.6;
      bar.position.y = bar.userData.baseY + h * 0.3;
    });
  });
  if (analyticsScanLine && analyticsScanCurve) {
    const scanT = (t * 0.25) % 1;
    const pt = analyticsScanCurve.getPoint(scanT);
    analyticsScanLine.position.copy(pt);
    analyticsScanLine.material.opacity = 0.5 + Math.sin(t * 4) * 0.4;
  }

  // Supply Chain — traveling package dots along route
  if (supplyRouteCurve) {
    supplyRouteDots.forEach(dot => {
      const prog = ((t * 0.12) + dot.userData.offset) % 1;
      const pt = supplyRouteCurve.getPoint(prog);
      dot.position.copy(pt);
      dot.material.opacity = Math.sin(prog * Math.PI) * 0.85;
    });
  }
  } // end !introBlurActive (platform animations)

  // Incident packet pulse
  if (incidentPacket) {
    const s = 1 + Math.sin(t * 6) * 0.2;
    incidentPacket.scale.setScalar(s);
  }

  composer.render();
  cssRenderer.render(scene, camera);
}

init();
