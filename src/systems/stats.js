// คำนวณสถานะตัวละครจาก "วิชาที่เรียน" ล้วน — ไม่มีเลเวล ไม่มีค่าฐานจากการเก็บ XP
import { SKILLS } from '../data/skills.js';

// ค่าฐานน้อยมาก แค่ให้ขยับได้ตอนยังไม่มีวิชาอะไรเลย
const BASE = { hp: 50, qi: 0, atk: 4, speed: 4.5, jump: 4.5, dash: 7, parry: 0, lifesteal: 0 };

export function computeStats(state) {
  const s = { ...BASE };
  for (const [id, tier] of Object.entries(state.skills)) {
    const sk = SKILLS[id];
    if (!sk) continue;
    for (let t = 0; t <= tier; t++) {
      const g = sk.tiers[t].grants || {};
      for (const k of Object.keys(g)) s[k] = (s[k] || 0) + g[k];
    }
  }

  // พลังภายใน (เน่ยกง) เป็นตัวคูณให้ทุกอย่าง — สไตล์จอมยุทธ์กึ่งสมจริง
  const neigong = s.qi;
  s.neigong = neigong;
  s.hpMax = Math.round(s.hp + neigong * 4);
  s.qiMax = Math.round(20 + neigong * 2);
  s.atk = Math.round(s.atk * (1 + neigong / 400));
  s.parry = Math.min(0.7, s.parry);           // เพดานโอกาสสวนกลับ
  s.lifesteal = Math.min(0.4, s.lifesteal);
  return s;
}

// รางวัลปัญญายุทธ์จากการต่อสู้ — ให้ค่าตาม "คุณภาพการสู้" ไม่ใช่แค่ฆ่าได้
export function insightFromCombat({ enemyPower, playerPower, noDamageTaken, perfectParries, uniqueMovesUsed }) {
  let pts = enemyPower * 0.6;
  const gap = enemyPower - playerPower;
  if (gap > 0) pts *= 1 + gap / 80;             // ล้มคนแกร่งกว่า = คุ้มกว่า
  if (noDamageTaken) pts *= 1.3;                // ไม่โดนตีเลย
  pts += (perfectParries || 0) * 4;             // สวนกลับสมบูรณ์
  pts += (uniqueMovesUsed || 0) * 3;            // ใช้ท่าหลากหลาย
  return Math.max(1, Math.round(pts));
}
