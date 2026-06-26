import * as THREE from 'three';
import { load, save } from './state.js';
import { computeStats, insightFromCombat } from './systems/stats.js';
import { addContribution } from './systems/sect.js';
import { advance, checkStep } from './systems/quest.js';
import { createAvatar } from './systems/avatar.js';
import { useConsumable } from './systems/equipment.js';
import { MANUALS } from './data/manuals.js';
import { SKILLS } from './data/skills.js';
import { SECTS } from './data/sects.js';
import { WORLD } from './data/world.js';
import { CONSUMABLES, EQUIPMENT } from './data/items.js';
import { initUI, updateHud, setRegion, setTarget, drawMinimap, toast, setPrompt, openPanel, closePanel, isPanelOpen } from './ui.js';

// ---------------- สถานะเกม ----------------
const state = load();
const player = { hp: 1, qi: 1 };   // ค่าจริงตั้งหลัง recompute
let stats = computeStats(state);

function onChange() {
  stats = computeStats(state);
  player.hp = Math.min(player.hp, stats.hpMax);
  player.qi = Math.min(player.qi, stats.qiMax);
  save(state);
  updateHud(state, player);
}

// ---------------- Three.js ----------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb8c8);
scene.fog = new THREE.Fog(0x9fb8c8, 70, 200);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);

// แสง
const sun = new THREE.DirectionalLight(0xfff2d8, 1.4);
sun.position.set(40, 70, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -120; sun.shadow.camera.right = 120;
sun.shadow.camera.top = 120; sun.shadow.camera.bottom = -120;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x3a5234, 0.7));

// พื้นฐาน
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ color: 0x55703f })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ภูเขารอบขอบ (open-world feel)
const mtnMat = new THREE.MeshStandardMaterial({ color: 0x4a5a52, flatShading: true });
for (let i = 0; i < 16; i++) {
  const a = (i / 16) * Math.PI * 2;
  const r = 160 + (i % 3) * 14;
  const h = 40 + (i % 5) * 12;
  const m = new THREE.Mesh(new THREE.ConeGeometry(25 + (i % 4) * 6, h, 6), mtnMat);
  m.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r);
  scene.add(m);
}

// ---------------- สร้างย่านพื้นที่ (regions) จาก data ----------------
for (const rg of WORLD.regions) {
  if (rg.id === 'plaza') continue; // ลานกลางใช้สีพื้นฐาน
  const disk = new THREE.Mesh(
    new THREE.CircleGeometry(rg.radius, 40),
    new THREE.MeshStandardMaterial({ color: rg.ground, transparent: true, opacity: 0.55 })
  );
  disk.rotation.x = -Math.PI / 2;
  disk.position.set(rg.center[0], 0.03, rg.center[1]);
  disk.receiveShadow = true;
  scene.add(disk);
}

// ทะเลสาบ (ย่าน misty_lake)
const lakeRegion = WORLD.regions.find((r) => r.id === 'misty_lake');
if (lakeRegion) {
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(22, 48),
    new THREE.MeshStandardMaterial({ color: 0x2f6f86, transparent: true, opacity: 0.8, metalness: 0.3, roughness: 0.4 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(lakeRegion.center[0] - 4, 0.06, lakeRegion.center[1]);
  scene.add(water);
}

// pseudo-random แบบกำหนดได้ (ผังคงที่ทุกครั้ง)
let seed = 1337;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// ต้นไม้
function makeTree(x, z, scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3), new THREE.MeshStandardMaterial({ color: 0x6b4a2b }));
  trunk.position.y = 1.5; trunk.castShadow = true;
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.5, 7), new THREE.MeshStandardMaterial({ color: 0x356b32, flatShading: true }));
  leaf.position.y = 4.5; leaf.castShadow = true;
  g.add(trunk, leaf); g.position.set(x, 0, z); g.scale.setScalar(scale);
  scene.add(g);
}
for (let i = 0; i < 46; i++) {
  const x = (rand() - 0.5) * 240, z = (rand() - 0.5) * 240;
  if (Math.hypot(x, z) > 18 && Math.hypot(x, z) < 132) makeTree(x, z);
}
const forest = WORLD.regions.find((r) => r.id === 'east_forest');
if (forest) for (let i = 0; i < 34; i++) {
  const a = rand() * Math.PI * 2, r = rand() * forest.radius * 0.92;
  makeTree(forest.center[0] + Math.cos(a) * r, forest.center[1] + Math.sin(a) * r, 0.8 + rand() * 0.6);
}

// แลนด์มาร์กเขาเหนือ
const peak = WORLD.regions.find((r) => r.id === 'north_peak');
if (peak) {
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6f7068, flatShading: true });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const h = 10 + rand() * 16;
    const rock = new THREE.Mesh(new THREE.ConeGeometry(7 + rand() * 5, h, 5), rockMat);
    rock.position.set(peak.center[0] + Math.cos(a) * (10 + rand() * 14), h / 2 - 2, peak.center[1] + Math.sin(a) * (10 + rand() * 14));
    rock.rotation.y = rand() * Math.PI; rock.castShadow = true;
    scene.add(rock);
  }
}

// แลนด์มาร์กหุบเหวเลือด
const vale = WORLD.regions.find((r) => r.id === 'blood_vale');
if (vale) {
  const spikeMat = new THREE.MeshStandardMaterial({ color: 0x5a2226, flatShading: true });
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2, r = rand() * vale.radius * 0.8;
    const h = 6 + rand() * 12;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(1.6 + rand() * 2, h, 4), spikeMat);
    sp.position.set(vale.center[0] + Math.cos(a) * r, h / 2, vale.center[1] + Math.sin(a) * r);
    sp.castShadow = true;
    scene.add(sp);
  }
}

// ศาลากลางลาน
const pavilion = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x7a6a4a }));
pavilion.position.y = 0.25; pavilion.receiveShadow = true; scene.add(pavilion);

// ---------------- ผู้เล่น (โมเดลมีแขนขา + แอนิเมชัน) ----------------
const PLAYER_H = 1.0; // ระยะจากพื้นถึง origin ของหุ่น (เท้าแตะพื้นเมื่อ y=PLAYER_H)
const playerAvatar = createAvatar({ weaponColor: 0xdfe6ee });
const playerMesh = playerAvatar.group;
playerMesh.position.set(0, PLAYER_H, 14);
scene.add(playerMesh);

player.hp = stats.hpMax; player.qi = stats.qiMax;

let velY = 0, grounded = true;
let camYaw = 0;

// ---------------- เอนทิตีในโลก (สร้างจาก WORLD) ----------------
const enemies = [];
function spawnEnemy(x, z, power, name, variant) {
  const av = createAvatar({ variant, weaponColor: 0x8a2a22 });
  const mesh = av.group;
  mesh.position.set(x, PLAYER_H, z);
  scene.add(mesh);
  const e = { mesh, avatar: av, power, name, hp: 40 + power * 4, hpMax: 40 + power * 4,
    atk: 5 + power, atkTimer: 1 + power * 0.05, home: new THREE.Vector3(x, PLAYER_H, z),
    fight: null, alive: true, respawn: 0, hitFlash: 0 };
  enemies.push(e);
  return e;
}
WORLD.enemies.forEach((e) => spawnEnemy(e.pos[0], e.pos[1], e.power, e.name, e.variant));

// ชิ้นส่วนคัมภีร์
const fragments = [];
function spawnFragment(x, z, idx) {
  const m = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.6),
    new THREE.MeshStandardMaterial({ color: 0xe9c46a, emissive: 0x8a6a10, emissiveIntensity: 0.6 })
  );
  m.position.set(x, 1.3, z);
  scene.add(m);
  fragments.push({ mesh: m, idx, taken: false });
}
WORLD.fragmentSites.forEach((f, i) => { if (state.fragments <= i) spawnFragment(f.pos[0], f.pos[1], i); });

// NPC (จาก data) — โมเดลมนุษย์ (ใช้ avatar เดียวกับตัวละคร) + วงเรืองแสงบอกว่าโต้ตอบได้
const npcs = [];
for (const def of WORLD.npcs) {
  const av = createAvatar({ variant: def.variant, color: def.color });
  const mesh = av.group;
  mesh.position.set(def.pos[0], PLAYER_H, def.pos[1]);
  mesh.rotation.y = Math.atan2(-def.pos[0], -def.pos[1]); // หันเข้าหาศูนย์กลางลาน
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.06, 8, 24),
    new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.4 })
  );
  ring.rotation.x = Math.PI / 2; ring.position.y = -0.9; mesh.add(ring);
  scene.add(mesh);
  npcs.push({ def, mesh, avatar: av, ring, lineIdx: 0 });
}

// ประตูสำนัก (จาก data)
const sectGates = [];
for (const site of WORLD.sectSites) {
  const sect = SECTS[site.sect];
  if (!sect) continue;
  const g = new THREE.Group();
  const pillarMat = new THREE.MeshStandardMaterial({ color: sect.color });
  const beamMat = new THREE.MeshStandardMaterial({ color: sect.color, emissive: sect.color, emissiveIntensity: 0.25 });
  for (const dx of [-2.2, 2.2]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 6), pillarMat);
    p.position.set(dx, 3, 0); p.castShadow = true; g.add(p);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 0.8), beamMat);
  beam.position.y = 6; g.add(beam);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.12, 8, 32),
    new THREE.MeshStandardMaterial({ color: sect.color, emissive: sect.color, emissiveIntensity: 0.5 })
  );
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.1; g.add(ring);
  g.position.set(site.pos[0], 0, site.pos[1]);
  g.rotation.y = Math.atan2(-site.pos[0], -site.pos[1]);
  scene.add(g);
  sectGates.push({ sect, pos: new THREE.Vector3(site.pos[0], 0, site.pos[1]), group: g });
}

// ลานสมาธิ (จาก data)
const medSpots = [];
for (const def of WORLD.meditationSpots) {
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2.2, 0.25, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a4a55 })
  );
  pad.position.set(def.pos[0], 0.12, def.pos[1]); pad.receiveShadow = true;
  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(1.5, 0.08, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0x6fd0ff, emissive: 0x3aa0d0, emissiveIntensity: 0.7 })
  );
  glow.rotation.x = Math.PI / 2; glow.position.set(def.pos[0], 0.4, def.pos[1]);
  scene.add(pad, glow);
  medSpots.push({ def, glow, pos: new THREE.Vector3(def.pos[0], 0, def.pos[1]), cd: 0 });
}

// ---------------- ป้ายชื่อตัวละคร (ฉายจาก 3D เป็น DOM) ----------------
const labelWrap = document.getElementById('labels');
const labels = [];
function makeLabel(obj, name, kind, yOff) {
  const el = document.createElement('div');
  el.className = `name-label ${kind}`;
  el.textContent = name;
  labelWrap.appendChild(el);
  labels.push({ el, obj, kind, yOff, alive: () => true });
}
makeLabel(playerMesh, 'จอมยุทธ์ (เจ้า)', 'self', 1.7);
enemies.forEach((e) => { const L = { el: null }; makeLabel(e.mesh, e.name, 'enemy', 1.7); labels[labels.length - 1].alive = () => e.alive; });
npcs.forEach((n) => makeLabel(n.mesh, n.def.name, 'npc', 1.7));

const projV = new THREE.Vector3();
function updateLabels() {
  const W = window.innerWidth, H = window.innerHeight;
  for (const L of labels) {
    if (!L.alive()) { L.el.style.display = 'none'; continue; }
    projV.copy(L.obj.position); projV.y += L.yOff;
    const dist = camera.position.distanceTo(L.obj.position);
    projV.project(camera);
    if (projV.z > 1 || dist > 75) { L.el.style.display = 'none'; continue; }
    L.el.style.display = '';
    L.el.style.left = `${(projV.x * 0.5 + 0.5) * W}px`;
    L.el.style.top = `${(-projV.y * 0.5 + 0.5) * H}px`;
  }
}

// ---------------- อินพุต (ใช้ event.code กันสลับภาษา) ----------------
const keys = {};
let blocking = false, dragging = false, downX = 0, downY = 0, leftDown = false;
let attackCooldown = 0;

addEventListener('keydown', (e) => {
  const c = e.code;
  keys[c] = true;
  if (c === 'Space' || c === 'ArrowLeft' || c === 'ArrowRight') e.preventDefault();
  if (c === 'KeyC') togglePanel('character');
  else if (c === 'KeyV') togglePanel('cultivation');
  else if (c === 'KeyI') togglePanel('inventory');
  else if (c === 'KeyB') togglePanel('sect');
  else if (c === 'KeyN') togglePanel('manual');
  else if (c === 'KeyH') togglePanel('help');
  else if (c === 'Escape') closePanel();
  else if (c === 'KeyF') tryAttack();
  else if (c === 'KeyE') tryInteract();
  else if (c === 'KeyT') toggleAuto();
  else if (c === 'Digit1') useHotbar(0);
  else if (c === 'Digit2') useHotbar(1);
  else if (c === 'Digit3') useHotbar(2);
  else if (c === 'Digit4') useHotbar(3);
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

function togglePanel(name) { if (isPanelOpen()) closePanel(); openPanel(name); }
function toggleAuto() { state.autoCounter = !state.autoCounter; toast(`ตีกลับอัตโนมัติ: ${state.autoCounter ? 'เปิด' : 'ปิด'}`); onChange(); }

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) { leftDown = true; dragging = false; downX = e.clientX; downY = e.clientY; }
  if (e.button === 2) blocking = true;
});
addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    if (leftDown && !dragging) tryAttack();
    leftDown = false;
  }
  if (e.button === 2) blocking = false;
});
addEventListener('mousemove', (e) => {
  if (leftDown) {
    camYaw -= e.movementX * 0.005;
    if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) dragging = true;
  }
});
addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------- ไอเทม hotbar ----------------
function useItem(itemId) {
  const r = useConsumable(state, player, stats, itemId);
  toast(r.msg, r.ok ? 'good' : 'bad');
  if (r.ok) onChange();
  return r.ok;
}
function useHotbar(i) {
  const id = state.hotbar?.[i];
  if (!id) { toast(`ช่อง ${i + 1} ว่าง`, 'bad'); return; }
  useItem(id);
}

// ---------------- การโต้ตอบ ----------------
let nearTarget = null; // { kind:'npc'|'sect'|'meditation', ref, dist }

function interactNpc(npc) {
  if (npc.def.role === 'decode') {
    for (const m of Object.values(MANUALS)) {
      const chk = checkStep(state, m.id);
      if (chk.step?.type === 'decode' && chk.step.npc === npc.def.id) {
        const r = advance(state, m.id, { viaNpc: npc.def.id });
        toast(r.msg, r.ok ? 'good' : 'bad');
        onChange();
        return;
      }
    }
    toast(`${npc.def.name}: "เจ้ายังไม่มีคัมภีร์ให้ข้าถอดความ จงไปเก็บชิ้นส่วนให้ครบก่อน"`);
    return;
  }
  const lines = npc.def.lines || [];
  if (!lines.length) return;
  toast(`${npc.def.name}: ${lines[npc.lineIdx % lines.length]}`);
  npc.lineIdx++;
}

function interactSect(gate) {
  toast(`ถึงประตู ${gate.sect.name}`, 'good');
  openPanel('sect');
}

function interactMeditation(spot) {
  if (spot.cd > 0) { toast('เพิ่งทำสมาธิไป รอสักครู่...', 'bad'); return; }
  state.insight += spot.def.gain;
  spot.cd = spot.def.cooldown;
  toast(`สงบจิต ณ ${spot.def.name} · ได้ปัญญายุทธ์ +${spot.def.gain}`, 'good');
  onChange();
}

function tryInteract() {
  if (isPanelOpen() || !nearTarget) return;
  if (nearTarget.kind === 'npc') interactNpc(nearTarget.ref);
  else if (nearTarget.kind === 'sect') interactSect(nearTarget.ref);
  else if (nearTarget.kind === 'meditation') interactMeditation(nearTarget.ref);
}

// ---------------- ย่านพื้นที่ ----------------
let currentRegionId = null;
function regionAt(x, z) {
  for (const rg of WORLD.regions) {
    if (Math.hypot(x - rg.center[0], z - rg.center[1]) <= rg.radius) return rg;
  }
  return null;
}
function updateRegion() {
  const rg = regionAt(playerMesh.position.x, playerMesh.position.z);
  const id = rg ? rg.id : '__wilds';
  if (id === currentRegionId) return;
  currentRegionId = id;
  const name = rg ? rg.name : WORLD.wildsName;
  setRegion(name);
  toast(`เข้าสู่ ${name}`);
}

// ---------------- การต่อสู้ ----------------
let targetEnemy = null, targetTimer = 0;

function learnedWushuCount() {
  return Object.keys(state.skills).filter((id) => SKILLS[id]?.type === 'wushu').length;
}

function attackEnemy(target, isCounter = false) {
  if (attackCooldown > 0) return false;
  const qiCost = 5;
  if (player.qi < qiCost) { if (!isCounter) toast('ปราณไม่พอ', 'bad'); return false; }
  player.qi -= qiCost;
  attackCooldown = 0.45;
  playerAvatar.attack();           // อนิเมชันฟันกระบี่ (สุ่มสลับท่า)
  // หันหน้าเข้าหาเป้า
  const dir = target.mesh.position.clone().sub(playerMesh.position).setY(0);
  if (dir.lengthSq() > 0) playerMesh.rotation.y = Math.atan2(dir.x, dir.z);

  if (!target.fight) target.fight = { damageTaken: false, parries: 0 };
  const dmg = Math.round(stats.atk * (0.9 + Math.random() * 0.2) * (isCounter ? 1.15 : 1));
  target.hp -= dmg;
  target.hitFlash = 0.18;
  targetEnemy = target; targetTimer = 4;

  for (const id of Object.keys(state.skills)) state.skillUse[id] = (state.skillUse[id] || 0) + 1;
  if (stats.lifesteal > 0) player.hp = Math.min(stats.hpMax, player.hp + dmg * stats.lifesteal);
  if (isCounter) toast(`สวนกลับ ${target.name}!`, 'good');

  if (target.hp <= 0) defeatEnemy(target);
  onChange();
  return true;
}

function tryAttack() {
  if (isPanelOpen()) return;
  const target = enemies.find((e) => e.alive && e.mesh.position.distanceTo(playerMesh.position) < 2.6);
  if (!target) return;
  attackEnemy(target, false);
}

function defeatEnemy(e) {
  e.alive = false;
  e.mesh.visible = false;
  e.respawn = 12;

  const gained = insightFromCombat({
    enemyPower: e.power,
    playerPower: stats.atk + stats.neigong,
    noDamageTaken: !e.fight?.damageTaken,
    perfectParries: e.fight?.parries || 0,
    uniqueMovesUsed: learnedWushuCount(),
  });
  state.insight += gained;

  state.reputation += 1;
  if (state.sect) addContribution(state, Math.round(e.power * 1.5));

  // ดรอปไอเทม: ยา/อุปกรณ์ ตามความแข็งแกร่ง
  const drop = rollDrop(e);
  state.inventory[drop.id] = (state.inventory[drop.id] || 0) + 1;

  toast(`พิชิต ${e.name}! ปัญญายุทธ์ +${gained}` + (state.sect ? ` · คุณงาม +${Math.round(e.power*1.5)}` : '') + ` · ได้ ${CONSUMABLES[drop.id]?.name || drop.name}`, 'good');
  e.fight = null;
  if (targetEnemy === e) { targetEnemy = null; targetTimer = 0; }
  onChange();
}

// ตารางดรอปง่าย ๆ
const EQUIP_DROP_POOL = ['sword_iron', 'hat_bamboo', 'ring_power', 'ring_spirit', 'bracer_iron', 'amulet_jade', 'cloak_cloud', 'boots_swift',
  'sword_azure', 'crown_azure', 'robe_azure', 'cloak_azure', 'blade_blood', 'mask_asura', 'armor_blood', 'amulet_blood', 'bracer_wind', 'boots_wind'];
function rollDrop(e) {
  const r = Math.random();
  // ศัตรูยิ่งแกร่ง ยิ่งมีโอกาสดรอปอุปกรณ์
  const equipChance = Math.min(0.6, 0.1 + e.power * 0.02);
  if (r < equipChance) {
    const tier = e.power >= 16 ? 8 : 0; // มารแกร่งดรอปของเซ็ตได้
    const pool = EQUIP_DROP_POOL.slice(tier, tier === 0 ? 8 : EQUIP_DROP_POOL.length);
    const id = pool[Math.floor(Math.random() * pool.length)];
    return EQUIPMENT[id];
  }
  return { id: r < equipChance + 0.45 ? 'potion_hp' : 'potion_qi' };
}

function enemyHit(e, dmg) {
  if (!e.fight) e.fight = { damageTaken: false, parries: 0 };
  if (blocking) {
    const reduce = Math.min(0.9, 0.5 + stats.parry);
    e.fight.parries += 1;
    player.hp -= dmg * (1 - reduce);
  } else {
    e.fight.damageTaken = true;
    player.hp -= dmg;
  }
  targetEnemy = e; targetTimer = 4;
  if (player.hp <= 0) { respawnPlayer(); onChange(); return; }
  onChange();

  // ตีกลับอัตโนมัติ
  if (state.autoCounter && e.alive && e.mesh.position.distanceTo(playerMesh.position) < 2.7) {
    attackEnemy(e, true);
  }
}

function respawnPlayer() {
  toast('คุณบาดเจ็บสาหัส... ถูกนำตัวกลับลาน', 'bad');
  playerMesh.position.set(0, PLAYER_H, 14);
  player.hp = stats.hpMax; player.qi = stats.qiMax;
  enemies.forEach((e) => { e.fight = null; });
}

// ---------------- ลูปเกม ----------------
const clock = new THREE.Clock();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const tmpV = new THREE.Vector3();

function update(dt) {
  if (keys['KeyQ']) camYaw += dt * 1.6;
  if (keys['ArrowLeft']) camYaw += dt * 1.6;
  if (keys['ArrowRight']) camYaw -= dt * 1.6;

  forward.set(Math.sin(camYaw), 0, Math.cos(camYaw));
  right.set(forward.z, 0, -forward.x);

  const move = new THREE.Vector3();
  if (!isPanelOpen()) {
    if (keys['KeyW']) move.sub(forward);
    if (keys['KeyS']) move.add(forward);
    if (keys['KeyA']) move.sub(right);
    if (keys['KeyD']) move.add(right);
  }
  const running = keys['ShiftLeft'] || keys['ShiftRight'];
  const speed = stats.speed * 1.7 * (running ? 1 + stats.dash / 20 : 1);
  const moving = move.lengthSq() > 0;
  if (moving) {
    move.normalize();
    playerMesh.position.addScaledVector(move, speed * dt);
    if (!playerAvatar.isAttacking()) playerMesh.rotation.y = Math.atan2(move.x, move.z);
  }

  // กระโดด/แรงโน้มถ่วง
  if (keys['Space'] && grounded && !isPanelOpen()) { velY = stats.jump; grounded = false; }
  velY -= 22 * dt;
  playerMesh.position.y += velY * dt;
  if (playerMesh.position.y <= PLAYER_H) { playerMesh.position.y = PLAYER_H; velY = 0; grounded = true; }

  // ขอบโลก
  const maxR = WORLD.radius;
  const pr = Math.hypot(playerMesh.position.x, playerMesh.position.z);
  if (pr > maxR) { playerMesh.position.x *= maxR / pr; playerMesh.position.z *= maxR / pr; }

  updateRegion();

  // อนิเมชันผู้เล่น
  playerAvatar.update(dt, { moving, running, grounded, block: blocking && !isPanelOpen() });

  // ฟื้นปราณ/เลือด
  player.qi = Math.min(stats.qiMax, player.qi + stats.qiMax * 0.12 * dt);
  player.hp = Math.min(stats.hpMax, player.hp + stats.hpMax * 0.02 * dt);

  if (attackCooldown > 0) attackCooldown -= dt;

  // ศัตรู
  let enemyNear = null;
  for (const e of enemies) {
    if (!e.alive) {
      e.respawn -= dt;
      if (e.respawn <= 0) { e.alive = true; e.hp = e.hpMax; e.mesh.visible = true; e.mesh.position.copy(e.home); }
      continue;
    }
    const d = e.mesh.position.distanceTo(playerMesh.position);
    let eMoving = false;
    if (d < 13 && d > 2.2) {
      const dir = tmpV.copy(playerMesh.position).sub(e.mesh.position).setY(0).normalize();
      e.mesh.position.addScaledVector(dir, (3 + e.power * 0.1) * dt);
      e.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      eMoving = true;
    }
    // hit flash (เรืองแสงตอนโดนตี)
    if (e.hitFlash > 0) {
      e.hitFlash -= dt;
      e.avatar.parts.torso.material.emissive.setHex(0xffffff);
      e.avatar.parts.torso.material.emissiveIntensity = e.hitFlash * 3;
    } else e.avatar.parts.torso.material.emissiveIntensity = 0;
    e.avatar.update(dt, { moving: eMoving, grounded: true });
    if (d < 3) {
      e.mesh.rotation.y = Math.atan2(playerMesh.position.x - e.mesh.position.x, playerMesh.position.z - e.mesh.position.z);
      e.atkTimer -= dt;
      if (e.atkTimer <= 0) { e.avatar.attack(); enemyHit(e, e.atk); e.atkTimer = 1.6; }
      if (!enemyNear || d < enemyNear.dist) enemyNear = { e, dist: d };
    }
  }

  // เป้าหมาย (target HP bar)
  if (enemyNear) { targetEnemy = enemyNear.e; targetTimer = 4; }
  if (targetTimer > 0) targetTimer -= dt;
  if (targetEnemy && targetEnemy.alive && targetTimer > 0)
    setTarget({ name: targetEnemy.name, hp: targetEnemy.hp, hpMax: targetEnemy.hpMax });
  else setTarget(null);

  // ชิ้นส่วนคัมภีร์
  for (const f of fragments) {
    if (f.taken) continue;
    f.mesh.rotation.y += dt * 1.5;
    f.mesh.position.y = 1.3 + Math.sin(performance.now() / 400 + f.idx) * 0.2;
    if (f.mesh.position.distanceTo(playerMesh.position) < 1.6) {
      f.taken = true; f.mesh.visible = false;
      state.fragments += 1;
      toast(`เก็บชิ้นส่วนคัมภีร์ได้ (${state.fragments})`, 'good');
      onChange();
    }
  }

  // เป้าโต้ตอบใกล้สุด
  nearTarget = null;
  const consider = (kind, ref, pos, range) => {
    const d = pos.distanceTo(playerMesh.position);
    if (d < range && (!nearTarget || d < nearTarget.dist)) nearTarget = { kind, ref, dist: d };
  };
  for (const npc of npcs) {
    npc.ring.rotation.z += dt;
    npc.avatar.update(dt, { moving: false, grounded: true });
    // หันหน้าเข้าหาผู้เล่นเมื่ออยู่ใกล้
    if (npc.mesh.position.distanceTo(playerMesh.position) < 6)
      npc.mesh.rotation.y = Math.atan2(playerMesh.position.x - npc.mesh.position.x, playerMesh.position.z - npc.mesh.position.z);
    consider('npc', npc, npc.mesh.position, 3);
  }
  for (const gate of sectGates) consider('sect', gate, gate.pos, 4.5);
  for (const spot of medSpots) {
    if (spot.cd > 0) spot.cd -= dt;
    spot.glow.rotation.z += dt * 0.6;
    spot.glow.position.y = 0.4 + Math.sin(performance.now() / 500 + spot.pos.x) * 0.12;
    consider('meditation', spot, spot.pos, 3.2);
  }

  // prompt
  if (isPanelOpen()) setPrompt(null);
  else if (nearTarget?.kind === 'npc') setPrompt(`กด <b>E</b> คุยกับ ${nearTarget.ref.def.name}`);
  else if (nearTarget?.kind === 'sect') setPrompt(`กด <b>E</b> เข้าประตู ${nearTarget.ref.sect.name}`);
  else if (nearTarget?.kind === 'meditation') setPrompt(nearTarget.ref.cd > 0
    ? `${nearTarget.ref.def.name} — รอสงบจิต ${Math.ceil(nearTarget.ref.cd)}s`
    : `กด <b>E</b> ทำสมาธิ ณ ${nearTarget.ref.def.name} (+${nearTarget.ref.def.gain} ปัญญายุทธ์)`);
  else if (enemyNear) setPrompt(`<b>${enemyNear.e.name}</b> · คลิกซ้าย/<b>F</b> โจมตี · คลิกขวาค้าง ตั้งการ์ด`);
  else setPrompt(null);

  // กล้องตาม
  const camOffset = new THREE.Vector3(Math.sin(camYaw) * 11, 7, Math.cos(camYaw) * 11);
  const desired = playerMesh.position.clone().add(camOffset);
  camera.position.lerp(desired, Math.min(1, dt * 6));
  camera.lookAt(playerMesh.position.x, playerMesh.position.y + 1.2, playerMesh.position.z);

  updateLabels();

  // มินิแมพ
  drawMinimap({
    radius: WORLD.radius,
    player: { x: playerMesh.position.x, z: playerMesh.position.z, yaw: camYaw },
    regions: WORLD.regions,
    enemies: enemies.filter((e) => e.alive).map((e) => ({ x: e.mesh.position.x, z: e.mesh.position.z })),
    fragments: fragments.filter((f) => !f.taken).map((f) => ({ x: f.mesh.position.x, z: f.mesh.position.z })),
    sects: sectGates.map((g) => ({ x: g.pos.x, z: g.pos.z, color: g.sect.color })),
    npcs: npcs.map((n) => ({ x: n.mesh.position.x, z: n.mesh.position.z })),
    meditations: medSpots.map((m) => ({ x: m.pos.x, z: m.pos.z })),
  });
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// ---------------- เริ่ม ----------------
initUI({ state, onChange, useItem, useHotbar });
onChange();
openPanel('help');
loop();
