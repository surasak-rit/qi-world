// สถานะเกมกลาง + บันทึกลง localStorage
import { SKILLS } from './data/skills.js';

const SAVE_KEY = 'qi-world-save-v1';

export function defaultState() {
  return {
    insight: 0,            // ปัญญายุทธ์ (คะแนนเล่าเรียน)
    reputation: 0,         // ชื่อเสียง
    morality: 0,           // ศีลธรรม (+ ธรรม / - มาร)
    sect: null,            // id สำนักที่สังกัด
    contribution: 0,       // คะแนนคุณงามในสำนักปัจจุบัน
    skills: {              // { skillId: tierที่ฝึกถึง (0-based) }
      neigong_basic: 0,
      sword_basic: 0,
      step_basic: 0,
    },
    skillUse: {},          // นับจำนวนครั้งใช้ท่าในสนามรบ { skillId: n }
    fragments: 0,          // ชิ้นส่วนคัมภีร์ที่เก็บได้
    quests: {},            // ความคืบหน้าเควสปลดเคล็ดวิชา { manualId: stepIndex }
    unlockedManuals: [],   // คัมภีร์ที่เรียนได้แล้ว
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch (_) { /* ignore */ }
  return defaultState();
}

export function save(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) {}
}

export function reset() {
  localStorage.removeItem(SAVE_KEY);
}

// helper: รวมจำนวนครั้งที่ใช้ "วิชานี้" ในสนามรบ
export function usesOf(state, skillId) {
  return state.skillUse[skillId] || 0;
}

// ใช้สำหรับตรวจเงื่อนไข unlock ที่อ้างอิงพลังภายในรวม
export function totalNeigong(state) {
  let qi = 0;
  for (const [id, tier] of Object.entries(state.skills)) {
    const sk = SKILLS[id];
    if (!sk) continue;
    for (let t = 0; t <= tier; t++) qi += sk.tiers[t].grants.qi || 0;
  }
  return qi;
}
