# Qi World — สคีมาข้อมูล (Data-driven, Vanilla JS)

เกมนี้ออกแบบให้ทุกเนื้อหา (วิชา/สำนัก/เคล็ดวิชา/เควส) เป็นไฟล์ JSON
โค้ดเกมแค่ "อ่าน" ข้อมูลแล้วประมวลผล → เพิ่มเนื้อหาใหม่ไม่ต้องแก้โค้ด

---

## 1. วิชา (Skill)

```json
{
  "id": "sword_taichi",
  "name": "กระบี่ไท่จี๋",
  "type": "wushu",                 // neigong | wushu | qinggong
  "category": "sword",             // sword | palm | fist | needle | movement | qi
  "sect": "wudang",                // รหัสสำนัก หรือ null ถ้าเป็นวิชาไร้สำนัก
  "alignment": "righteous",        // righteous | neutral | demonic
  "conflictsWith": ["palm_blood"], // วิชาที่ฝึกพร้อมกันไม่ได้ (ปราณตีกัน)
  "requires": { "skills": [["neigong_pure", 1]], "neigong": 30 },
  "tiers": [
    { "tier": 0, "name": "入門",  "cost": 0,   "grants": { "atk": 8,  "qiCost": 6 } },
    { "tier": 1, "name": "小成", "cost": 120, "grants": { "atk": 16, "qiCost": 6 },
      "unlock": { "useInCombat": 20 } },
    { "tier": 2, "name": "大成", "cost": 400, "grants": { "atk": 30, "qiCost": 5 },
      "unlock": { "neigong": 80 } },
    { "tier": 3, "name": "圓滿", "cost": 1000,"grants": { "atk": 55, "qiCost": 4, "parryBonus": 0.2 } }
  ],
  "moves": ["thrust", "circle_parry", "cloud_slash"]
}
```

- `cost` = ปัญญายุทธ์ที่ต้องจ่ายเพื่อเลื่อนไปtierนั้น
- `unlock` = เงื่อนไขเพิ่มเติมนอกจากจ่ายคะแนน
- `grants` ของทุก tier ที่ฝึกถึง = แต้มที่เอาไป **รวมคำนวณสถานะ**

---

## 2. สำนัก (Sect)

```json
{
  "id": "wudang",
  "name": "สำนักบู๊ตึ้ง",
  "alignment": "righteous",
  "rivalSects": ["blood_cult"],
  "joinRequirement": { "reputation": 20, "quest": "wudang_trial" },
  "ranks": [
    { "rank": 0, "name": "ศิษย์นอก", "needContribution": 0 },
    { "rank": 1, "name": "ศิษย์ใน",  "needContribution": 300 },
    { "rank": 2, "name": "ศิษย์เอก", "needContribution": 1200 },
    { "rank": 3, "name": "ผู้สืบทอด","needContribution": 4000 }
  ],
  "library": [
    { "skill": "neigong_pure", "minRank": 0 },
    { "skill": "sword_taichi", "minRank": 1 },
    { "skill": "sword_two_yi", "minRank": 3 }
  ]
}
```

---

## 3. เคล็ดวิชาไร้สำนัก (Wuji Manual + เควสปลดล็อก)

```json
{
  "id": "manual_nine_yang",
  "name": "คัมภีร์เก้าหยาง",
  "skillId": "neigong_nine_yang",
  "alignment": "neutral",
  "discovery": { "type": "hidden", "location": "shaolin_back_mountain" },
  "learnQuest": {
    "id": "q_nine_yang",
    "steps": [
      { "type": "collect", "item": "manual_fragment", "count": 3,
        "desc": "ตามหาชิ้นส่วนคัมภีร์ที่กระจัดกระจาย 3 ชิ้น" },
      { "type": "decode",  "npc": "old_monk",
        "desc": "นำคัมภีร์ให้พระชราถอดอักขระโบราณ" },
      { "type": "condition", "neigong": 100,
        "desc": "ต้องมีพลังภายในถึงขั้นจึงทนปราณหยางได้" }
    ],
    "reward": { "unlockSkill": "neigong_nine_yang" }
  }
}
```

---

## 4. การคำนวณสถานะ (ไม่มีเลเวล — มาจากวิชาล้วน)

```js
// pseudo / vanilla JS
function computeStats(player, skillDB) {
  const s = { hp: 0, qi: 0, atk: 0, speed: 0, parry: 0 };
  for (const [skillId, tier] of Object.entries(player.skills)) {
    const skill = skillDB[skillId];
    for (let t = 0; t <= tier; t++) {
      const g = skill.tiers[t].grants;
      if (g.hp)    s.hp    += g.hp;
      if (g.qi)    s.qi    += g.qi;
      if (g.atk)   s.atk   += g.atk;
      if (g.speed) s.speed += g.speed;
      if (g.parryBonus) s.parry += g.parryBonus;
    }
  }
  // พลังภายในเป็นตัวคูณให้ทุกอย่าง (สมจริงแบบจอมยุทธ์)
  const neigong = s.qi;
  s.hp  += neigong * 5;
  s.atk *= 1 + neigong / 500;
  return s;
}
```

---

## 5. รางวัลปัญญายุทธ์จากการต่อสู้

```js
function insightFromCombat(result) {
  let pts = result.enemyPower * 0.5;                 // ฐานตามความแกร่งศัตรู
  const gap = result.enemyPower - result.playerPower;
  if (gap > 0) pts *= 1 + gap / 100;                 // ล้มคนแกร่งกว่า = คุ้มกว่า
  if (result.noDamageTaken) pts *= 1.3;              // ไม่โดนตีเลย
  pts += result.perfectParries * 5;                  // สวนกลับสมบูรณ์
  pts += result.uniqueMovesUsed * 3;                 // ใช้ท่าหลากหลาย
  return Math.round(pts);
}
```

---

## 6. โครงไฟล์ที่แนะนำ

```
qi-world/
├─ index.html
├─ src/
│  ├─ main.js            // bootstrap
│  ├─ core/
│  │  ├─ stats.js        // computeStats, insightFromCombat
│  │  ├─ skills.js       // เรียน/เลื่อนระดับวิชา + ตรวจเงื่อนไข
│  │  ├─ sect.js         // เข้าสำนัก, คะแนนคุณงาม, ลำดับชั้น
│  │  ├─ quest.js        // เควสปลดเคล็ดวิชาไร้สำนัก
│  │  └─ reputation.js   // ชื่อเสียง/ศีลธรรม
│  ├─ combat/            // ระบบต่อสู้ real-time
│  └─ world/             // Three.js scene (Phase 2+)
└─ data/
   ├─ skills.json
   ├─ sects.json
   ├─ manuals.json
   └─ quests.json
```
