// คลังวิทยายุทธทั้งหมด (data-driven)
// type: neigong (พลังภายใน) | wushu (ท่วงท่ายุทธ์) | qinggong (วิชาตัวเบา)
// grants ที่สะสมจากทุก tier ที่ฝึกถึง จะถูกนำไปรวมคำนวณสถานะใน systems/stats.js
//   hp, qi, atk, speed, jump, dash, parry, lifesteal

export const SKILLS = {
  // ---------- วิชาพื้นฐานไร้สังกัด (เริ่มเกมมีให้เรียนได้) ----------
  neigong_basic: {
    id: 'neigong_basic', name: 'ลมปราณปฐม', type: 'neigong', category: 'qi',
    sect: null, alignment: 'neutral',
    desc: 'พื้นฐานการสะสมลมปราณ เพิ่มพลังภายในและเลือด',
    tiers: [
      { name: '入門 แรกเริ่ม', cost: 0,   grants: { qi: 10 } },
      { name: '小成 ชำนาญ',  cost: 60,  grants: { qi: 14 } },
      { name: '大成 ลึกซึ้ง', cost: 220, grants: { qi: 20 }, unlock: { useInCombat: 8 } },
    ],
  },
  sword_basic: {
    id: 'sword_basic', name: 'กระบี่สามัญ', type: 'wushu', category: 'sword',
    sect: null, alignment: 'neutral',
    desc: 'ท่ากระบี่พื้นฐาน เพิ่มพลังโจมตี',
    tiers: [
      { name: '入門 แรกเริ่ม', cost: 0,   grants: { atk: 6 } },
      { name: '小成 ชำนาญ',  cost: 80,  grants: { atk: 10 } },
      { name: '大成 ลึกซึ้ง', cost: 260, grants: { atk: 16 }, unlock: { useInCombat: 12 } },
    ],
  },
  step_basic: {
    id: 'step_basic', name: 'ย่างก้าวเบา', type: 'qinggong', category: 'movement',
    sect: null, alignment: 'neutral',
    desc: 'วิชาตัวเบาพื้นฐาน เดินเร็วและกระโดดสูงขึ้น',
    tiers: [
      { name: '入門 แรกเริ่ม', cost: 0,  grants: { speed: 1.2, jump: 0.8 } },
      { name: '小成 ชำนาญ',  cost: 70, grants: { speed: 1.4, jump: 1.0 } },
    ],
  },

  // ---------- สำนักบู๊ตึ้ง (สายธรรม) ----------
  neigong_pure: {
    id: 'neigong_pure', name: 'ลมปราณบริสุทธิ์ไท่จี๋', type: 'neigong', category: 'qi',
    sect: 'wudang', alignment: 'righteous',
    desc: 'ลมปราณสายธรรมที่นุ่มนวลแต่ลึกล้ำ',
    conflictsWith: ['palm_blood'],
    tiers: [
      { name: '入門', cost: 90,  grants: { qi: 22 } },
      { name: '小成', cost: 300, grants: { qi: 30 } },
      { name: '大成', cost: 700, grants: { qi: 45 }, unlock: { useInCombat: 20 } },
    ],
  },
  sword_taichi: {
    id: 'sword_taichi', name: 'กระบี่ไท่จี๋', type: 'wushu', category: 'sword',
    sect: 'wudang', alignment: 'righteous',
    desc: 'ยืมแรงสะท้อนแรง เด่นเรื่องการสวนกลับ (parry)',
    requires: { skills: [['neigong_basic', 1]] },
    tiers: [
      { name: '入門', cost: 120, grants: { atk: 14, parry: 0.08 } },
      { name: '小成', cost: 380, grants: { atk: 22, parry: 0.10 } },
      { name: '大成', cost: 900, grants: { atk: 34, parry: 0.14 }, unlock: { neigong: 80 } },
    ],
  },
  cloud_step: {
    id: 'cloud_step', name: 'เมฆาเหินฟ้า', type: 'qinggong', category: 'movement',
    sect: 'wudang', alignment: 'righteous',
    desc: 'วิชาตัวเบาชั้นสูง ลอยตัวดั่งเมฆ',
    tiers: [
      { name: '入門', cost: 150, grants: { speed: 1.8, jump: 1.6, dash: 4 } },
      { name: '小成', cost: 460, grants: { speed: 2.2, jump: 2.0, dash: 6 } },
    ],
  },

  // ---------- วิหารเส้าหลิน (สายธรรม) ----------
  palm_shaolin: {
    id: 'palm_shaolin', name: 'ฝ่ามือเหล็กเส้าหลิน', type: 'wushu', category: 'palm',
    sect: 'shaolin', alignment: 'righteous',
    desc: 'ฝ่ามือหนักหน่วง ดาเมจสูง',
    tiers: [
      { name: '入門', cost: 130, grants: { atk: 18 } },
      { name: '小成', cost: 400, grants: { atk: 28 } },
      { name: '大成', cost: 950, grants: { atk: 42 }, unlock: { neigong: 70 } },
    ],
  },
  neigong_iron: {
    id: 'neigong_iron', name: 'กายเพชรเส้าหลิน', type: 'neigong', category: 'qi',
    sect: 'shaolin', alignment: 'righteous',
    desc: 'เน่ยกงสายแกร่ง เลือดหนาทนทาน',
    tiers: [
      { name: '入門', cost: 100, grants: { qi: 18, hp: 30 } },
      { name: '小成', cost: 320, grants: { qi: 24, hp: 50 } },
    ],
  },

  // ---------- ลัทธิเลือดบูชา (สายมาร) ----------
  palm_blood: {
    id: 'palm_blood', name: 'ฝ่ามือโลหิตทมิฬ', type: 'wushu', category: 'palm',
    sect: 'blood_cult', alignment: 'demonic',
    desc: 'วิชามาร ดูดเลือดศัตรูแลกพลัง แต่เสียชื่อเสียง',
    conflictsWith: ['neigong_pure'],
    tiers: [
      { name: '入門', cost: 140, grants: { atk: 24, lifesteal: 0.12 } },
      { name: '小成', cost: 420, grants: { atk: 36, lifesteal: 0.18 } },
      { name: '大成', cost: 1000, grants: { atk: 52, lifesteal: 0.25 }, unlock: { neigong: 90 } },
    ],
  },

  // ---------- เคล็ดวิชาไร้สำนัก (ปลดล็อกผ่านเควสเท่านั้น) ----------
  neigong_nine_yang: {
    id: 'neigong_nine_yang', name: 'ลมปราณเก้าหยาง', type: 'neigong', category: 'qi',
    sect: null, alignment: 'neutral', wuji: true,
    desc: 'สุดยอดวิชาภายในไร้สำนัก พลังมหาศาล ฟื้นฟูปราณเร็ว',
    tiers: [
      { name: '入門', cost: 200, grants: { qi: 40, hp: 40 } },
      { name: '小成', cost: 600, grants: { qi: 60, hp: 70 } },
      { name: '大成', cost: 1400, grants: { qi: 90, hp: 120 }, unlock: { useInCombat: 30 } },
    ],
  },
};
