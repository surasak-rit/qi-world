// เควสปลดเคล็ดวิชาไร้สำนัก — ทำทีละขั้นจนครบ จึงปลดสิทธิ์เรียนวิชา
import { MANUALS } from '../data/manuals.js';
import { totalNeigong } from '../state.js';

// ขั้นที่กำลังทำอยู่ของคัมภีร์ (0-based) หรือ steps.length ถ้าจบแล้ว
export function questStep(state, manualId) {
  return state.quests[manualId] ?? 0;
}

export function isManualComplete(state, manualId) {
  return questStep(state, manualId) >= MANUALS[manualId].steps.length;
}

// ตรวจว่าขั้นปัจจุบัน "ทำสำเร็จหรือยัง" (เงื่อนไขอัตโนมัติ เช่น collect/condition)
export function checkStep(state, manualId) {
  const manual = MANUALS[manualId];
  const idx = questStep(state, manualId);
  if (idx >= manual.steps.length) return { done: true };
  const step = manual.steps[idx];

  if (step.type === 'collect')
    return { done: state.fragments >= step.count, step };
  if (step.type === 'condition')
    return { done: totalNeigong(state) >= step.value, step };
  if (step.type === 'decode')
    return { done: false, step, needsNpc: step.npc }; // ต้องไปคุย NPC
  return { done: false, step };
}

// พยายามเดินหน้าเควส 1 ขั้น (เรียกเมื่อเก็บของครบ/เงื่อนไขถึง/คุย NPC แล้ว)
export function advance(state, manualId, { viaNpc = null } = {}) {
  const manual = MANUALS[manualId];
  const idx = questStep(state, manualId);
  if (idx >= manual.steps.length) return { ok: false, msg: 'เควสนี้จบแล้ว' };
  const step = manual.steps[idx];

  if (step.type === 'collect' && state.fragments < step.count)
    return { ok: false, msg: `ยังเก็บชิ้นส่วนไม่ครบ (${state.fragments}/${step.count})` };
  if (step.type === 'condition' && totalNeigong(state) < step.value)
    return { ok: false, msg: `พลังภายในยังไม่ถึง ${step.value}` };
  if (step.type === 'decode' && viaNpc !== step.npc)
    return { ok: false, msg: 'ต้องนำคัมภีร์ไปให้ NPC ที่ถูกต้องถอดอักขระ' };

  state.quests[manualId] = idx + 1;

  // จบเควส -> ปลดล็อกวิชา
  if (state.quests[manualId] >= manual.steps.length) {
    const skillId = manual.reward.unlockSkill;
    if (!state.unlockedManuals.includes(skillId)) state.unlockedManuals.push(skillId);
    return { ok: true, done: true, msg: `ถอดรหัสคัมภีร์สำเร็จ! ปลดล็อก "${manual.name}" — ไปฝึกได้ที่แผงฝึกวิชา` };
  }
  return { ok: true, msg: `คืบหน้าเควส "${manual.name}" ขั้นถัดไป` };
}
