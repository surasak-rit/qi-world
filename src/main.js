import * as THREE from 'three';
import { load, save } from './state.js';
import { computeStats, insightFromCombat } from './systems/stats.js';
import { addContribution } from './systems/sect.js';
import { advance, checkStep, questStep } from './systems/quest.js';
import { MANUALS } from './data/manuals.js';
import { SKILLS } from './data/skills.js';
import { initUI, updateHud, toast, setPrompt, openPanel, closePanel, isPanelOpen } from './ui.js';

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
scene.fog = new THREE.Fog(0x9fb8c8, 60, 180);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);

// แสง
const sun = new THREE.DirectionalLight(0xfff2d8, 1.4);
sun.position.set(40, 70, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x3a5234, 0.7));

// พื้น
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ color: 0x55703f })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ภูเขารอบขอบ (open-world feel)
const mtnMat = new THREE.MeshStandardMaterial({ color: 0x4a5a52, flatShading: true });
for (let i = 0; i < 14; i++) {
  const a = (i / 14) * Math.PI * 2;
  const r = 150 + Math.random() * 30;
  const h = 40 + Math.random() * 50;
  const m = new THREE.Mesh(new THREE.ConeGeometry(25 + Math.random() * 20, h, 6), mtnMat);
  m.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r);
  scene.add(m);
}

// ต้นไม้กระจาย
function makeTree(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3), new THREE.MeshStandardMaterial({ color: 0x6b4a2b }));
  trunk.position.y = 1.5; trunk.castShadow = true;
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.5, 7), new THREE.MeshStandardMaterial({ color: 0x356b32, flatShading: true }));
  leaf.position.y = 4.5; leaf.castShadow = true;
  g.add(trunk, leaf); g.position.set(x, 0, z);
  scene.add(g);
}
for (let i = 0; i < 40; i++) {
  const x = (Math.random() - 0.5) * 220, z = (Math.random() - 0.5) * 220;
  if (Math.hypot(x, z) > 18) makeTree(x, z);
}

// ศาลากลางลาน (จุดสังเกต)
const pavilion = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x7a6a4a }));
pavilion.position.y = 0.25; pavilion.receiveShadow = true; scene.add(pavilion);

// ---------------- ผู้เล่น ----------------
const PLAYER_H = 1.0; // ครึ่งความสูงแคปซูล
const playerMesh = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.5, 1.0, 6, 12),
  new THREE.MeshStandardMaterial({ color: 0xe8e2d0 })
);
playerMesh.castShadow = true;
playerMesh.position.set(0, PLAYER_H, 8);
scene.add(playerMesh);
// ดาบเล็ก ๆ บอกทิศหันหน้า
const sword = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.4), new THREE.MeshStandardMaterial({ color: 0xc8d0d8 }));
sword.position.set(0.55, 0.2, 0.4);
playerMesh.add(sword);

player.hp = stats.hpMax; player.qi = stats.qiMax;

let velY = 0, grounded = true;
let camYaw = 0;

// ---------------- เอนทิตีในโลก ----------------
const enemies = [];
function spawnEnemy(x, z, power, name) {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.5, 1.0, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0xc0392b })
  );
  mesh.position.set(x, PLAYER_H, z);
  mesh.castShadow = true;
  scene.add(mesh);
  const e = { mesh, power, name, hp: 40 + power * 4, hpMax: 40 + power * 4,
    atk: 5 + power, atkTimer: 1 + Math.random(), home: new THREE.Vector3(x, PLAYER_H, z),
    fight: null, alive: true, respawn: 0 };
  enemies.push(e);
  return e;
}
spawnEnemy(20, -6, 8, 'โจรป่า');
spawnEnemy(-18, -10, 10, 'นักดาบพเนจร');
spawnEnemy(8, -28, 16, 'มารอาวุโส');
spawnEnemy(-30, 14, 12, 'จอมโจรเขาเหนือ');

// ชิ้นส่วนคัมภีร์ (เก็บได้)
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
// วางตามจำนวนที่ยังไม่เก็บ (ถ้าโหลดเซฟมาแล้วเก็บไปบ้าง ก็วางที่เหลือ)
const fragPositions = [[34, 30], [-40, -20], [12, 40]];
fragPositions.forEach((p, i) => { if (state.fragments <= i) spawnFragment(p[0], p[1], i); });

// NPC พระชรา (ถอดอักขระ)
const monk = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.5, 1.0, 6, 12),
  new THREE.MeshStandardMaterial({ color: 0x2ecc71 })
);
monk.position.set(-6, PLAYER_H, -4);
monk.castShadow = true;
scene.add(monk);
const monkRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 8, 24), new THREE.MeshStandardMaterial({ color: 0x2ecc71, emissive: 0x114422 }));
monkRing.rotation.x = Math.PI / 2; monkRing.position.y = 0.05; monk.add(monkRing);

// ---------------- อินพุต ----------------
const keys = {};
let blocking = false, dragging = false, downX = 0, downY = 0, leftDown = false;
let attackCooldown = 0;

addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === 'c') togglePanel('character');
  else if (k === 'v') togglePanel('cultivation');
  else if (k === 'b') togglePanel('sect');
  else if (k === 'n') togglePanel('manual');
  else if (k === 'h') togglePanel('help');
  else if (k === 'escape') closePanel();
  else if (k === 'f') tryAttack();
  else if (k === 'e') tryInteract();
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function togglePanel(name) { if (isPanelOpen()) closePanel(); openPanel(name); }

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

// ---------------- การโต้ตอบ ----------------
let nearTarget = null; // { kind:'monk'|'enemy', dist }

function tryInteract() {
  if (isPanelOpen()) return;
  if (nearTarget?.kind === 'monk') {
    // หาเควสที่ขั้นปัจจุบันเป็น decode ของ npc นี้
    for (const m of Object.values(MANUALS)) {
      const chk = checkStep(state, m.id);
      if (chk.step?.type === 'decode' && chk.step.npc === 'old_monk') {
        const r = advance(state, m.id, { viaNpc: 'old_monk' });
        toast(r.msg, r.ok ? 'good' : 'bad');
        onChange();
        return;
      }
    }
    toast('พระชรา: "เจ้ายังไม่มีคัมภีร์ให้ข้าถอดความ จงไปเก็บชิ้นส่วนให้ครบก่อน"');
  }
}

// ---------------- การต่อสู้ ----------------
function learnedWushuCount() {
  return Object.keys(state.skills).filter((id) => SKILLS[id]?.type === 'wushu').length;
}

function tryAttack() {
  if (isPanelOpen() || attackCooldown > 0) return;
  const target = enemies.find((e) => e.alive && e.mesh.position.distanceTo(playerMesh.position) < 2.6);
  if (!target) return;
  const qiCost = 5;
  if (player.qi < qiCost) { toast('ปราณไม่พอ', 'bad'); return; }
  player.qi -= qiCost;
  attackCooldown = 0.45;

  // เริ่มบันทึกคุณภาพการสู้
  if (!target.fight) target.fight = { damageTaken: false, parries: 0 };

  const dmg = Math.round(stats.atk * (0.9 + Math.random() * 0.2));
  target.hp -= dmg;

  // ฝึกความชำนาญ: นับ "ผ่านสนามรบ" ให้ทุกวิชาที่เรียนอยู่
  for (const id of Object.keys(state.skills)) state.skillUse[id] = (state.skillUse[id] || 0) + 1;

  // ดูดเลือด (วิชามาร)
  if (stats.lifesteal > 0) player.hp = Math.min(stats.hpMax, player.hp + dmg * stats.lifesteal);

  // เด้งตัวให้เห็นว่าโดน
  target.mesh.scale.set(1.15, 0.9, 1.15);

  if (target.hp <= 0) defeatEnemy(target);
  onChange();
}

function defeatEnemy(e) {
  e.alive = false;
  e.mesh.visible = false;
  e.respawn = 12; // วินาที

  const gained = insightFromCombat({
    enemyPower: e.power,
    playerPower: stats.atk + stats.neigong,
    noDamageTaken: !e.fight?.damageTaken,
    perfectParries: e.fight?.parries || 0,
    uniqueMovesUsed: learnedWushuCount(),
  });
  state.insight += gained;

  // ชื่อเสียง/คุณงาม
  state.reputation += 1;
  if (state.sect) addContribution(state, Math.round(e.power * 1.5));

  toast(`พิชิต ${e.name}! ได้ปัญญายุทธ์ +${gained}` + (state.sect ? ` · คุณงาม +${Math.round(e.power*1.5)}` : ''), 'good');
  e.fight = null;
  onChange();
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
  if (player.hp <= 0) respawnPlayer();
  onChange();
}

function respawnPlayer() {
  toast('คุณบาดเจ็บสาหัส... ถูกนำตัวกลับลาน', 'bad');
  playerMesh.position.set(0, PLAYER_H, 8);
  player.hp = stats.hpMax; player.qi = stats.qiMax;
  enemies.forEach((e) => { e.fight = null; });
}

// ---------------- ลูปเกม ----------------
const clock = new THREE.Clock();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

function update(dt) {
  if (keys['q']) camYaw += dt * 1.6;
  if (keys['e'] && false) {} // e สงวนไว้ interact
  if (keys['arrowleft']) camYaw += dt * 1.6;
  if (keys['arrowright']) camYaw -= dt * 1.6;

  // ทิศจากกล้อง
  forward.set(Math.sin(camYaw), 0, Math.cos(camYaw));
  right.set(forward.z, 0, -forward.x);

  const move = new THREE.Vector3();
  if (!isPanelOpen()) {
    if (keys['w']) move.sub(forward);
    if (keys['s']) move.add(forward);
    if (keys['a']) move.sub(right);
    if (keys['d']) move.add(right);
  }
  const running = keys['shift'];
  const speed = stats.speed * 1.7 * (running ? 1 + stats.dash / 20 : 1);
  if (move.lengthSq() > 0) {
    move.normalize();
    playerMesh.position.addScaledVector(move, speed * dt);
    // หันหน้าไปทางที่เดิน
    playerMesh.rotation.y = Math.atan2(move.x, move.z);
  }

  // กระโดด/แรงโน้มถ่วง
  if (keys[' '] && grounded && !isPanelOpen()) { velY = stats.jump; grounded = false; }
  velY -= 22 * dt;
  playerMesh.position.y += velY * dt;
  if (playerMesh.position.y <= PLAYER_H) { playerMesh.position.y = PLAYER_H; velY = 0; grounded = true; }

  // จำกัดขอบโลก
  const maxR = 130;
  const pr = Math.hypot(playerMesh.position.x, playerMesh.position.z);
  if (pr > maxR) {
    playerMesh.position.x *= maxR / pr;
    playerMesh.position.z *= maxR / pr;
  }

  // ฟื้นปราณ/เลือดเล็กน้อย
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
    // ฟื้นสเกลที่เด้งตอนโดนตี
    e.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), dt * 8);
    if (d < 12 && d > 2.2) {
      // ไล่เข้าหาผู้เล่น
      const dir = playerMesh.position.clone().sub(e.mesh.position).setY(0).normalize();
      e.mesh.position.addScaledVector(dir, (3 + e.power * 0.1) * dt);
    }
    if (d < 3) {
      e.atkTimer -= dt;
      if (e.atkTimer <= 0) { enemyHit(e, e.atk); e.atkTimer = 1.6; }
      if (!enemyNear || d < enemyNear.dist) enemyNear = { e, dist: d };
    }
  }

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

  // NPC พระชรา หมุนวง + ตรวจระยะ
  monkRing.rotation.z += dt;
  nearTarget = null;
  const dMonk = monk.position.distanceTo(playerMesh.position);
  if (dMonk < 3) nearTarget = { kind: 'monk', dist: dMonk };

  // prompt โต้ตอบ
  if (isPanelOpen()) setPrompt(null);
  else if (nearTarget?.kind === 'monk') setPrompt('กด <b>E</b> คุยกับพระชรา (ถอดอักขระคัมภีร์)');
  else if (enemyNear) setPrompt(`<b>${enemyNear.e.name}</b> · คลิกซ้าย/<b>F</b> โจมตี · คลิกขวาค้าง ตั้งการ์ด`);
  else setPrompt(null);

  // กล้องตาม
  const camOffset = new THREE.Vector3(Math.sin(camYaw) * 11, 7, Math.cos(camYaw) * 11);
  const desired = playerMesh.position.clone().add(camOffset);
  camera.position.lerp(desired, Math.min(1, dt * 6));
  camera.lookAt(playerMesh.position.x, playerMesh.position.y + 1.2, playerMesh.position.z);
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// ---------------- เริ่ม ----------------
initUI({ state, onChange });
onChange();
openPanel('help');
loop();
