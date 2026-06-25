// หุ่นตัวละครจอมยุทธ์ (นางเอกบู๊สไตล์เซียนเซีย) + แอนิเมชันโพรซีเดอรัล (Phase 2)
// อ้างอิงดีไซน์: มวยผมจุก+ปิ่นปัก, เสื้อกล้ามขลิบทอง, กระโปรงผ้า, ปลอกแขน, บูตขลิบสี
// สร้างจาก primitive ล้วน ไม่พึ่งไฟล์โมเดลภายนอก
//
// origin ของกลุ่มอยู่กลางลำตัว (y=0) เท้าอยู่ ~ y=-1.0 หัวอยู่ ~ y=+1.0
// ให้เข้ากับ physics เดิม (position.y = PLAYER_H = 1.0, พื้นที่ y=0)
import * as THREE from 'three';

// พาเลตต์
const HEROINE = {
  skin: 0xf0d2b0, hair: 0x2b2230, top: 0xe8743b, trim: 0xe9c46a,
  skirt: 0xefe3cf, bracer: 0x5b6bd6, boot: 0x4350b0, bootTrim: 0xd98ab0,
};
const VILLAIN = {
  skin: 0xb9a9a0, hair: 0x16110f, top: 0x8a2330, trim: 0x5a1a22,
  skirt: 0x3a2226, bracer: 0x66242a, boot: 0x3a1c20, bootTrim: 0x7a2e34,
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

export function createAvatar({ color = null, weapon = true, weaponColor = 0xdfe6ee, villain = false } = {}) {
  const P = { ...(villain ? VILLAIN : HEROINE) };
  if (color != null) P.top = color; // ปรับสีเสื้อหลักได้

  const group = new THREE.Group();  // root — main คุมตำแหน่ง/ทิศในโลก
  const body = new THREE.Group();   // inner — แอนิเมชันเด้ง/เอียงตัว (ไม่ชนกับ physics)
  group.add(body);

  const mat = (c, opts) => new THREE.MeshStandardMaterial({ color: c, ...opts });
  const skinM = mat(P.skin), hairM = mat(P.hair), topM = mat(P.top), trimM = mat(P.trim, { metalness: 0.3, roughness: 0.5 });
  const skirtM = mat(P.skirt), bracerM = mat(P.bracer), bootM = mat(P.boot), bootTrimM = mat(P.bootTrim);

  // ---- ลำตัว (เสื้อกล้าม) ----
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.28), topM);
  torso.position.y = 0.32; torso.castShadow = true; body.add(torso);
  // คอ/ขลิบทอง
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.3), trimM);
  collar.position.y = 0.28; torso.add(collar);
  // สายคาดเฉียง
  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.32), trimM);
  sash.position.y = -0.12; sash.rotation.z = 0.32; torso.add(sash);

  // ---- เอว/กระโปรงผ้า ----
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.32), trimM);
  belt.position.y = 0.02; body.add(belt);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.46, 0.42, 14), skirtM);
  skirt.position.y = -0.16; skirt.castShadow = true; body.add(skirt);
  // ชายผ้าด้านหน้า (สีเสื้อ)
  const apron = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.44, 0.05), topM);
  apron.position.set(0, -0.2, 0.24); body.add(apron);

  // ---- หัว + ผม ----
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 14), skinM);
  head.position.y = 0.85; head.castShadow = true; body.add(head);
  // ผมคลุมท้ายทอย/บน
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.255, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), hairM);
  hairCap.position.y = 0.02; head.add(hairCap);
  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), hairM);
  hairBack.position.set(0, -0.02, -0.08); hairBack.scale.set(1, 1.05, 0.8); head.add(hairBack);
  // มวยผมจุก + ปิ่นปัก
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), hairM);
  bun.position.set(0, 0.22, -0.06); head.add(bun);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32), trimM);
  pin.position.set(0, 0.24, -0.06); pin.rotation.z = Math.PI / 2; head.add(pin);
  // ปอยผมข้างหน้า
  for (const sx of [-1, 1]) {
    const bang = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.14), hairM);
    bang.position.set(sx * 0.2, -0.05, 0.06); bang.rotation.z = sx * 0.1; head.add(bang);
  }
  // ตา (จุดเข้ม)
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshStandardMaterial({ color: 0x2a2230 }));
    eye.position.set(sx * 0.08, 0.0, 0.21); head.add(eye);
  }

  // ---- แขน: ต้นแขนเปลือย (ผิว) → ปลายแขนปลอกแขน ----
  const armL = limb(0.4, 0.12, skinM, 0.5, -0.32);
  const armR = limb(0.4, 0.12, skinM, 0.5, 0.32);
  const foreL = limb(0.4, 0.15, bracerM, -0.4); armL.add(foreL);
  const foreR = limb(0.4, 0.15, bracerM, -0.4); armR.add(foreR);
  // มือ (ผิว) ปลายแขน
  for (const fore of [foreL, foreR]) {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), skinM);
    hand.position.y = -0.42; fore.add(hand);
  }
  body.add(armL, armR);

  // กระบี่ในมือขวา
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

  // ---- ขา: ต้นขา (ผิว) → หน้าแข้งบูต ----
  const legL = limb(0.46, 0.15, skinM, 0.0, -0.14);
  const legR = limb(0.46, 0.15, skinM, 0.0, 0.14);
  const shinL = limb(0.5, 0.18, bootM, -0.46); legL.add(shinL);
  const shinR = limb(0.5, 0.18, bootM, -0.46); legR.add(shinR);
  for (const shin of [shinL, shinR]) {
    // ขลิบบนบูต (ใต้เข่า)
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.2), bootTrimM);
    cuff.position.y = -0.04; shin.add(cuff);
    // เท้า + ปลายเชิดสีขลิบ
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.34), bootM);
    foot.position.set(0, -0.5, 0.06); shin.add(foot);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), bootTrimM);
    toe.position.set(0, -0.47, 0.24); shin.add(toe);
  }
  body.add(legL, legR);

  // ---- เอฟเฟกต์รอยฟัน (โผล่ตอนออกท่า) ----
  const slashMat = new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const slash = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.5, 16, 1, 0, Math.PI * 1.1), slashMat);
  slash.position.set(0.3, 0.4, 0.6);
  body.add(slash);

  const parts = { torso, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR, sword, slash };

  // ---- สถานะแอนิเมชัน ----
  let phase = 0, breath = 0, attackT = 0, attackDur = 0, attackKind = 0, blockA = 0;

  function attack(kind = null) {
    attackKind = kind != null ? kind : (attackKind + 1) % 3;
    attackDur = 0.45;
    attackT = attackDur;
  }
  function isAttacking() { return attackT > 0; }

  // st: { moving, running, grounded, block }
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
      if (attackKind === 0) {        // ฟันบนลงล่าง
        armR.rotation.x = -2.4 + swing * 3.0;
        armR.rotation.z = -0.1;
        foreR.rotation.x = -0.2 - swing * 0.4;
        torso.rotation.x = 0.1 + swing * 0.25;
      } else if (attackKind === 1) { // ฟันขวาง
        armR.rotation.x = -1.0;
        armR.rotation.z = -1.4 + swing * 2.0;
        foreR.rotation.x = -0.6;
        torso.rotation.y = -0.5 + swing * 1.0;
      } else {                       // แทงตรง
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
