// ระบบฝึก/เลื่อนระดับวิทยายุทธ ด้วยปัญญายุทธ์
import { SKILLS } from '../data/skills.js';
import { SECTS } from '../data/sects.js';
import { usesOf, totalNeigong } from '../state.js';

// วิชานี้ "เข้าถึงได้ไหม" (สิทธิ์เรียน ยังไม่นับเงินหรือเงื่อนไข tier)
export function isAccessible(state, skill) {
  if (skill.wuji) return state.unlockedManuals.includes(skill.id) ? true : isUnlockedWujiSkill(state, skill.id);
  if (!skill.sect) return true;                       // วิชาไร้สังกัดทั่วไป
  // วิชาสำนัก: ต้องสังกัดสำนักนั้น และถึง rank ขั้นต่ำ
  if (state.sect !== skill.sect) return false;
  const sect = SECTS[skill.sect];
  const entry = sect.library.find((l) => l.skill === skill.id);
  if (!entry) return false;
  return rankIndex(state) >= entry.minRank;
}

function isUnlockedWujiSkill(state, skillId) {
  // ปลดผ่านเควส -> reward.unlockSkill เก็บไว้ใน unlockedManuals เป็น skillId ด้วย
  return state.unlockedManuals.includes(skillId);
}

export function rankIndex(state) {
  if (!state.sect) return -1;
  const sect = SECTS[state.sect];
  let idx = 0;
  for (let i = 0; i < sect.ranks.length; i++) {
    if (state.contribution >= sect.ranks[i].need) idx = i;
  }
  return idx;
}

// ตรวจ prerequisite (ต้องเรียนวิชาอื่นถึง tier ก่อน) และวิชาที่ขัดแย้งกัน
export function prereqOk(state, skill) {
  const req = skill.requires;
  if (req?.skills) {
    for (const [id, tier] of req.skills) {
      if ((state.skills[id] ?? -1) < tier) return { ok: false, reason: `ต้องฝึก "${SKILLS[id].name}" ถึงขั้น ${tier + 1} ก่อน` };
    }
  }
  if (skill.conflictsWith) {
    for (const cid of skill.conflictsWith) {
      if (state.skills[cid] != null) return { ok: false, reason: `ปราณขัดกับ "${SKILLS[cid].name}" — ฝึกพร้อมกันไม่ได้` };
    }
  }
  return { ok: true };
}

// ตรวจ unlock เฉพาะของ tier (เงื่อนไขนอกจากจ่ายแต้ม)
function tierUnlockOk(state, skill, tierIndex) {
  const u = skill.tiers[tierIndex]?.unlock;
  if (!u) return { ok: true };
  if (u.useInCombat != null && usesOf(state, skill.id) < u.useInCombat)
    return { ok: false, reason: `ต้องใช้ท่านี้ในสนามรบ ${u.useInCombat} ครั้ง (ตอนนี้ ${usesOf(state, skill.id)})` };
  if (u.neigong != null && totalNeigong(state) < u.neigong)
    return { ok: false, reason: `ต้องมีพลังภายในรวม ${u.neigong} (ตอนนี้ ${totalNeigong(state)})` };
  return { ok: true };
}

// สรุปสถานะของวิชาหนึ่ง สำหรับแสดงผล + ปุ่มเรียน
export function skillStatus(state, skillId) {
  const skill = SKILLS[skillId];
  const cur = state.skills[skillId];          // undefined = ยังไม่เรียน
  const learned = cur != null;
  const nextTier = learned ? cur + 1 : 0;
  const maxed = learned && cur >= skill.tiers.length - 1;

  const access = isAccessible(state, skill);
  const pre = prereqOk(state, skill);

  let canAct = false, reason = '', cost = 0, label = '';
  if (!access) { reason = skill.wuji ? 'ต้องปลดล็อกผ่านเควสคัมภีร์ก่อน' : 'ยังไม่มีสิทธิ์เข้าถึง (เข้าสำนัก/เลื่อนขั้นก่อน)'; }
  else if (!pre.ok) { reason = pre.reason; }
  else if (maxed) { reason = 'ฝึกถึงขั้นสูงสุดแล้ว'; }
  else {
    const tu = tierUnlockOk(state, skill, nextTier);
    cost = skill.tiers[nextTier].cost;
    label = learned ? `เลื่อนเป็น ${skill.tiers[nextTier].name}` : `เริ่มเรียน (${skill.tiers[0].name})`;
    if (!tu.ok) reason = tu.reason;
    else if (state.insight < cost) reason = `ปัญญายุทธ์ไม่พอ (ต้องการ ${cost})`;
    else canAct = true;
  }
  return { skill, learned, cur, nextTier, maxed, cost, label, canAct, reason };
}

// ดำเนินการเรียน/เลื่อนขั้น — คืน {ok, msg}
export function learn(state, skillId) {
  const st = skillStatus(state, skillId);
  if (!st.canAct) return { ok: false, msg: st.reason || 'เรียนไม่ได้ตอนนี้' };
  state.insight -= st.cost;
  state.skills[skillId] = st.nextTier;
  return { ok: true, msg: `${st.skill.name} → ${st.skill.tiers[st.nextTier].name}` };
}
