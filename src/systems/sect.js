// ระบบสำนัก: เข้า/ออก, คะแนนคุณงาม, ลำดับชั้น
import { SECTS } from '../data/sects.js';
import { SKILLS } from '../data/skills.js';
import { rankIndex } from './cultivation.js';

export function currentRankName(state) {
  if (!state.sect) return 'ไร้สังกัด';
  const sect = SECTS[state.sect];
  const idx = rankIndex(state);
  return `${sect.name} · ${sect.ranks[idx]?.name ?? sect.ranks[0].name}`;
}

export function canJoin(state, sectId) {
  const sect = SECTS[sectId];
  if (state.sect === sectId) return { ok: false, reason: 'สังกัดสำนักนี้อยู่แล้ว' };
  if (state.reputation < sect.join.reputation)
    return { ok: false, reason: `ต้องมีชื่อเสียง ${sect.join.reputation} ขึ้นไป` };
  return { ok: true };
}

export function joinSect(state, sectId) {
  const chk = canJoin(state, sectId);
  if (!chk.ok) return { ok: false, msg: chk.reason };
  const sect = SECTS[sectId];

  // ออกจากสำนักเดิม: ล็อกวิชาของสำนักเดิมที่เรียนไป (ถอดออกจาก skills) + เสียชื่อเสียง
  if (state.sect) {
    for (const id of Object.keys(state.skills)) {
      if (SKILLS[id]?.sect === state.sect) delete state.skills[id];
    }
    state.reputation -= 10;
  }

  state.sect = sectId;
  state.contribution = 0;
  if (sect.moralityOnJoin) state.morality += sect.moralityOnJoin;

  // เข้าสำนักศัตรู -> เสียชื่อเสียงเพิ่ม
  return { ok: true, msg: `เข้าสังกัด ${sect.name} แล้ว` };
}

export function addContribution(state, amount) {
  if (!state.sect) return;
  state.contribution += amount;
}
