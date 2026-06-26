// หุ่นตัวละคร + แอนิเมชันโพรซีเดอรัล (Phase 2)
// ใช้ "โครงเดียวกับผู้เล่น" (นางเอกบู๊) เป็นฐาน แล้วแตกเป็นสายพันธุ์ศัตรูที่รูปร่างต่างกัน
// ผ่านพารามิเตอร์ variant: ขนาด/สัดส่วน/ศีรษะ/เครื่องแต่งกายต่างกัน แต่ rig (ข้อต่อ) + แอนิเมชันเดียวกัน
//
// origin ของ root group อยู่กลางลำตัว (y=0) เท้าอยู่ ~ y=-1.0 หัวอยู่ ~ y=+1.0
// ขนาดต่างกันจัดการที่ inner "scaler" group เพื่อให้เท้าแตะพื้นเสมอ (ไม่ชนกับ physics ที่ตั้ง position.y=PLAYER_H)
import * as THREE from 'three';

// ---------- พาเลตต์สี ----------
const PALETTES = {
  heroine:  { skin: 0xf0d2b0, hair: 0x2b2230, top: 0xe8743b, trim: 0xe9c46a, lower: 0xefe3cf, bracer: 0x5b6bd6, boot: 0x4350b0, bootTrim: 0xd98ab0, eye: 0x2a2230 },
  grunt:    { skin: 0xc9a98f, hair: 0x241b14, top: 0x6f5a39, trim: 0x4a3d28, lower: 0x3b3026, bracer: 0x5a4a32, boot: 0x33291f, bootTrim: 0x241b14, eye: 0x1a140f },
  brute:    { skin: 0xb98f74, hair: 0x16110f, top: 0x73433a, trim: 0x4a2620, lower: 0x4a3a30, bracer: 0x5a3a30, boot: 0x33231c, bootTrim: 0x22160f, eye: 0x180f0c },
  assassin: { skin: 0xcab8a6, hair: 0x14110f, top: 0x2b3038, trim: 0x4a5560, lower: 0x23272e, bracer: 0x1c2128, boot: 0x191c22, bootTrim: 0x3a4350, eye: 0x6fd0ff },
  demon:    { skin: 0x9a8a88, hair: 0x120c0e, top: 0x6a1f28, trim: 0x3a1014, lower: 0x2a1418, bracer: 0x4a1820, boot: 0x24121a, bootTrim: 0x5a1018, eye: 0xff4d4d, horn: 0xe6dccb },
  // NPC มนุษย์
  elder:    { skin: 0xddc3a8, hair: 0xe2e2dc, top: 0x6a8f5a, trim: 0xb8a05a, lower: 0xcabfa6, bracer: 0x9a8a6a, boot: 0x6a5a44, bootTrim: 0x4a3d28, eye: 0x2a2230 },
  man:      { skin: 0xe0b896, hair: 0x241a12, top: 0x4a6f8f, trim: 0x8a6a3a, lower: 0x5a5040, bracer: 0x5a4a32, boot: 0x463726, bootTrim: 0x33291f, eye: 0x1a140f },
};

// ---------- สายพันธุ์ (variant) ----------
// scale = ขนาดรวม, ความกว้างลำตัว/แขน/ขา, ระยะไหล่/สะโพก, ทรงผม, เสื้อท่อนล่าง, แขนเปลือยไหม, ถืออาวุธไหม
const VARIANTS = {
  heroine:  { palette: 'heroine',  scale: 1.00, torsoW: 0.50, torsoH: 0.60, torsoD: 0.28, armW: 0.12, foreW: 0.15, legW: 0.15, shinW: 0.18, shoulder: 0.32, hip: 0.14, head: 0.23, headgear: 'bun',     lower: 'skirt', bareArm: true,  weapon: true },
  grunt:    { palette: 'grunt',    scale: 0.96, torsoW: 0.50, torsoH: 0.62, torsoD: 0.30, armW: 0.14, foreW: 0.16, legW: 0.16, shinW: 0.18, shoulder: 0.32, hip: 0.15, head: 0.24, headgear: 'topknot', lower: 'pants', bareArm: false, weapon: true },
  brute:    { palette: 'brute',    scale: 1.28, torsoW: 0.74, torsoH: 0.66, torsoD: 0.40, armW: 0.22, foreW: 0.24, legW: 0.22, shinW: 0.26, shoulder: 0.46, hip: 0.20, head: 0.26, headgear: 'bald',    lower: 'pants', bareArm: true,  weapon: true },
  assassin: { palette: 'assassin', scale: 1.06, torsoW: 0.42, torsoH: 0.62, torsoD: 0.24, armW: 0.10, foreW: 0.12, legW: 0.12, shinW: 0.15, shoulder: 0.28, hip: 0.12, head: 0.22, headgear: 'hood',    lower: 'robe',  bareArm: false, weapon: true },
  demon:    { palette: 'demon',    scale: 1.18, torsoW: 0.60, torsoH: 0.66, torsoD: 0.34, armW: 0.18, foreW: 0.20, legW: 0.18, shinW: 0.22, shoulder: 0.40, hip: 0.17, head: 0.25, headgear: 'horns',   lower: 'robe',  bareArm: false, weapon: false },
  // NPC: ชายแก่ / นักดาบชาย / ชาวบ้าน (หญิงสาวใช้ variant 'heroine')
  elder:    { palette: 'elder',    scale: 0.97, torsoW: 0.50, torsoH: 0.60, torsoD: 0.30, armW: 0.13, foreW: 0.15, legW: 0.15, shinW: 0.18, shoulder: 0.31, hip: 0.14, head: 0.24, headgear: 'bald',    lower: 'robe',  bareArm: false, weapon: false },
  swordsman:{ palette: 'man',      scale: 1.05, torsoW: 0.54, torsoH: 0.62, torsoD: 0.30, armW: 0.15, foreW: 0.16, legW: 0.16, shinW: 0.19, shoulder: 0.35, hip: 0.15, head: 0.24, headgear: 'topknot', lower: 'robe',  bareArm: false, weapon: true },
  townsman: { palette: 'man',      scale: 1.00, torsoW: 0.56, torsoH: 0.60, torsoD: 0.34, armW: 0.15, foreW: 0.16, legW: 0.16, shinW: 0.19, shoulder: 0.34, hip: 0.16, head: 0.24, headgear: 'topknot', lower: 'robe',  bareArm: false, weapon: false },
};

function limb(len, w, mat, pivotY, pivotX = 0) {
  const joint = new THREE.Group();
  joint.position.set(pivotX, pivotY, 0);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), mat);
  mesh.position.y = -len / 2;
  mesh.castShadow = true;
  joint.add(mesh);
  return joint;
}

export function createAvatar(opts = {}) {
  const cfg = VARIANTS[opts.variant] || VARIANTS.heroine;
  const P = { ...PALETTES[cfg.palette] };
  if (opts.color != null) P.top = opts.color;       // ปรับสีเสื้อหลัก (ใช้กับ NPC)
  const weapon = opts.weapon !== undefined ? opts.weapon : cfg.weapon;
  const weaponColor = opts.weaponColor ?? 0xdfe6ee;

  const group = new THREE.Group();                  // root — main คุมตำแหน่ง/ทิศในโลก
  const scaler = new THREE.Group();                 // คุมขนาด + ยกเท้าให้แตะพื้น
  scaler.scale.setScalar(cfg.scale);
  scaler.position.y = cfg.scale - 1;                // feet local ~ -1.0 → ชดเชยเมื่อ scale ต่างจาก 1
  group.add(scaler);
  const body = new THREE.Group();                   // inner — แอนิเมชันเด้ง/เอียงตัว
  scaler.add(body);

  const mat = (c, o) => new THREE.MeshStandardMaterial({ color: c, ...o });
  const skinM = mat(P.skin), hairM = mat(P.hair), topM = mat(P.top);
  const trimM = mat(P.trim, { metalness: 0.3, roughness: 0.5 });
  const lowerM = mat(P.lower), bracerM = mat(P.bracer), bootM = mat(P.boot), bootTrimM = mat(P.bootTrim);

  // ---- ลำตัว ----
  const torso = new THREE.Mesh(new THREE.BoxGeometry(cfg.torsoW, cfg.torsoH, cfg.torsoD), topM);
  torso.position.y = 0.32; torso.castShadow = true; body.add(torso);
  const collar = new THREE.Mesh(new THREE.BoxGeometry(cfg.torsoW + 0.02, 0.1, cfg.torsoD + 0.02), trimM);
  collar.position.y = cfg.torsoH / 2 - 0.02; torso.add(collar);
  const sash = new THREE.Mesh(new THREE.BoxGeometry(cfg.torsoW + 0.06, 0.12, cfg.torsoD + 0.04), trimM);
  sash.position.y = -0.12; sash.rotation.z = 0.32; torso.add(sash);

  // ---- ท่อนล่าง ----
  const belt = new THREE.Mesh(new THREE.BoxGeometry(cfg.torsoW, 0.12, cfg.torsoD + 0.04), trimM);
  belt.position.y = 0.02; body.add(belt);
  if (cfg.lower === 'skirt') {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.46, 0.42, 14), lowerM);
    skirt.position.y = -0.16; skirt.castShadow = true; body.add(skirt);
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.44, 0.05), topM);
    apron.position.set(0, -0.2, 0.24); body.add(apron);
  } else if (cfg.lower === 'robe') {
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 0.7, 14), lowerM);
    robe.position.y = -0.3; robe.castShadow = true; body.add(robe);
  } // 'pants' = ไม่มีอะไรคลุม โชว์ขา

  // ---- หัว ----
  const head = new THREE.Mesh(new THREE.SphereGeometry(cfg.head, 18, 14), skinM);
  head.position.y = 0.85; head.castShadow = true; body.add(head);
  buildHeadgear(cfg.headgear, head, { hairM, trimM, topM, P, mat });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8),
      new THREE.MeshStandardMaterial({ color: P.eye, emissive: P.eye, emissiveIntensity: cfg.palette === 'demon' || cfg.palette === 'assassin' ? 0.6 : 0 }));
    eye.position.set(sx * 0.085, 0.0, cfg.head - 0.02); head.add(eye);
  }

  // ---- แขน ----
  const upperMat = cfg.bareArm ? skinM : topM;
  const armL = limb(0.4, cfg.armW, upperMat, 0.5, -cfg.shoulder);
  const armR = limb(0.4, cfg.armW, upperMat, 0.5, cfg.shoulder);
  const foreL = limb(0.4, cfg.foreW, bracerM, -0.4); armL.add(foreL);
  const foreR = limb(0.4, cfg.foreW, bracerM, -0.4); armR.add(foreR);
  for (const fore of [foreL, foreR]) {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), skinM);
    hand.position.y = -0.42; fore.add(hand);
  }
  body.add(armL, armR);

  let sword = null;
  if (weapon) {
    sword = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1.5),
      new THREE.MeshStandardMaterial({ color: weaponColor, metalness: 0.5, roughness: 0.25 }));
    blade.position.z = 0.7; blade.castShadow = true;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.09), trimM);
    sword.add(blade, guard);
    sword.position.y = -0.42; sword.rotation.x = Math.PI / 2;
    foreR.add(sword);
  }

  // ---- ขา ----
  const legL = limb(0.46, cfg.legW, skinM, 0.0, -cfg.hip);
  const legR = limb(0.46, cfg.legW, skinM, 0.0, cfg.hip);
  const shinL = limb(0.5, cfg.shinW, bootM, -0.46); legL.add(shinL);
  const shinR = limb(0.5, cfg.shinW, bootM, -0.46); legR.add(shinR);
  for (const shin of [shinL, shinR]) {
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(cfg.shinW + 0.02, 0.08, cfg.shinW + 0.02), bootTrimM);
    cuff.position.y = -0.04; shin.add(cuff);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(cfg.shinW, 0.12, 0.34), bootM);
    foot.position.set(0, -0.5, 0.06); shin.add(foot);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), bootTrimM);
    toe.position.set(0, -0.47, 0.24); shin.add(toe);
  }
  body.add(legL, legR);

  // ---- เอฟเฟกต์รอยฟัน ----
  const slashMat = new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const slash = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.5, 16, 1, 0, Math.PI * 1.1), slashMat);
  slash.position.set(0.3, 0.4, 0.6);
  body.add(slash);

  const parts = { torso, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR, sword, slash };

  // ---- แอนิเมชัน ----
  let phase = 0, breath = 0, attackT = 0, attackDur = 0, attackKind = 0, blockA = 0;

  function attack(kind = null) {
    attackKind = kind != null ? kind : (attackKind + 1) % 3;
    attackDur = 0.45;
    attackT = attackDur;
  }
  function isAttacking() { return attackT > 0; }

  function update(dt, st = {}) {
    const moving = !!st.moving, running = !!st.running, grounded = st.grounded !== false;
    breath += dt;

    if (moving && grounded) {
      const freq = running ? 11 : 7;
      const amp = running ? 0.9 : 0.6;
      phase += dt * freq;
      const s = Math.sin(phase);
      legL.rotation.x = s * amp;
      legR.rotation.x = -s * amp;
      shinL.rotation.x = Math.max(0, -Math.cos(phase)) * 0.7;
      shinR.rotation.x = Math.max(0, Math.cos(phase)) * 0.7;
      body.position.y = Math.abs(Math.sin(phase)) * (running ? 0.12 : 0.07);
      torso.rotation.x = 0.12 + (running ? 0.12 : 0);
    } else if (!grounded) {
      legL.rotation.x = -0.5; legR.rotation.x = 0.3;
      shinL.rotation.x = 0.8; shinR.rotation.x = 0.5;
      body.position.y = 0; torso.rotation.x = 0.05;
    } else {
      const b = Math.sin(breath * 2) * 0.04;
      legL.rotation.x *= 0.8; legR.rotation.x *= 0.8;
      shinL.rotation.x *= 0.8; shinR.rotation.x *= 0.8;
      body.position.y = b * 0.3; torso.rotation.x = 0.02 + b;
    }
    head.position.y = 0.85 + Math.sin(breath * 2) * 0.01;

    blockA += ((st.block ? 1 : 0) - blockA) * Math.min(1, dt * 10);

    if (attackT <= 0) {
      if (moving && grounded) {
        const s = Math.sin(phase);
        armL.rotation.x = -s * 0.5; armR.rotation.x = s * 0.5;
      } else {
        armL.rotation.x *= 0.85; armR.rotation.x *= 0.85;
      }
      armL.rotation.z = 0.12; armR.rotation.z = -0.12;
      foreL.rotation.x = -0.3; foreR.rotation.x = -0.3;

      if (blockA > 0.01) {
        armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, -1.1, blockA);
        foreR.rotation.x = THREE.MathUtils.lerp(foreR.rotation.x, -1.2, blockA);
        armR.rotation.z = THREE.MathUtils.lerp(armR.rotation.z, -0.6, blockA);
        torso.rotation.y = THREE.MathUtils.lerp(0, -0.25, blockA);
      } else torso.rotation.y *= 0.85;
    }

    if (attackT > 0) {
      attackT -= dt;
      const t = 1 - attackT / attackDur;
      const swing = Math.sin(Math.min(1, t) * Math.PI);
      torso.rotation.y = 0;
      if (attackKind === 0) {
        armR.rotation.x = -2.4 + swing * 3.0;
        armR.rotation.z = -0.1;
        foreR.rotation.x = -0.2 - swing * 0.4;
        torso.rotation.x = 0.1 + swing * 0.25;
      } else if (attackKind === 1) {
        armR.rotation.x = -1.0;
        armR.rotation.z = -1.4 + swing * 2.0;
        foreR.rotation.x = -0.6;
        torso.rotation.y = -0.5 + swing * 1.0;
      } else {
        armR.rotation.x = -1.4 - swing * 0.2;
        armR.rotation.z = -0.05;
        foreR.rotation.x = -1.3 + swing * 1.2;
        torso.rotation.x = 0.1 + swing * 0.15;
      }
      armL.rotation.x = -0.3 - swing * 0.3;
      slash.material.opacity = swing * 0.7;
      slash.rotation.z = (attackKind === 1 ? -1 : 0) + t * 2.2;
    } else {
      slash.material.opacity *= 0.8;
    }
  }

  return { group, parts, update, attack, isAttacking };
}

// ---------- ทรงศีรษะตามสายพันธุ์ ----------
function buildHeadgear(kind, head, { hairM, trimM, topM, P, mat }) {
  if (kind === 'bun') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.255, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), hairM);
    cap.position.y = 0.02; head.add(cap);
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), hairM);
    back.position.set(0, -0.02, -0.08); back.scale.set(1, 1.05, 0.8); head.add(back);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), hairM);
    bun.position.set(0, 0.22, -0.06); head.add(bun);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32), trimM);
    pin.position.set(0, 0.24, -0.06); pin.rotation.z = Math.PI / 2; head.add(pin);
    for (const sx of [-1, 1]) {
      const bang = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.14), hairM);
      bang.position.set(sx * 0.2, -0.05, 0.06); bang.rotation.z = sx * 0.1; head.add(bang);
    }
  } else if (kind === 'topknot') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.255, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7), hairM);
    cap.position.y = 0.0; head.add(cap);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), hairM);
    knot.position.set(0, 0.26, 0); head.add(knot);
  } else if (kind === 'bald') {
    // หัวโล้น + ผ้าคาดหน้าผาก
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.035, 8, 20), trimM);
    band.rotation.x = Math.PI / 2; band.position.y = 0.08; head.add(band);
    // เคราหนา
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.12), hairM);
    beard.position.set(0, -0.2, 0.12); head.add(beard);
  } else if (kind === 'hood') {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.6, 14), topM);
    hood.position.y = 0.18; head.add(hood);
    // เงาในฮู้ด
    const shadow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x0a0c10 }));
    shadow.position.set(0, 0.02, 0.06); shadow.scale.set(1, 1, 0.6); head.add(shadow);
  } else if (kind === 'horns') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.255, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7), hairM);
    cap.position.y = 0.0; head.add(cap);
    const hornM = mat(P.horn || 0xe6dccb, { roughness: 0.6 });
    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.34, 8), hornM);
      horn.position.set(sx * 0.16, 0.28, -0.04);
      horn.rotation.set(-0.5, 0, sx * 0.5);
      head.add(horn);
    }
  }
}
