// ไอเทม: อุปกรณ์สวมใส่ (มี option bonus + set bonus) และของใช้สิ้นเปลือง (Phase 2)
// data-driven — เพิ่มไอเทม/เซ็ตได้โดยไม่ต้องแก้โค้ดเกม
//
// อุปกรณ์มี 8 ช่อง (slot): weapon อาวุธ, helmet หมวก, shirt เสื้อ, cloak ผ้าคลุม,
//                          necklace สร้อย, ring แหวน, bracer ปลอกแขน, shoes รองเท้า
// bonuses ใช้คีย์เดียวกับ stats: hp, qi, atk, speed, jump, dash, parry, lifesteal

export const SLOTS = [
  { id: 'weapon',   name: 'อาวุธ' },
  { id: 'helmet',   name: 'หมวก' },
  { id: 'shirt',    name: 'เสื้อ' },
  { id: 'cloak',    name: 'ผ้าคลุม' },
  { id: 'necklace', name: 'สร้อย' },
  { id: 'ring',     name: 'แหวน' },
  { id: 'bracer',   name: 'ปลอกแขน' },
  { id: 'shoes',    name: 'รองเท้า' },
];

export const RARITY = {
  common:    { name: 'สามัญ',   color: '#c8cdd6' },
  rare:      { name: 'หายาก',   color: '#6fb1ff' },
  epic:      { name: 'วิเศษ',    color: '#c08bff' },
  legendary: { name: 'ตำนาน',   color: '#e9c46a' },
};

// ---------- เซ็ตอุปกรณ์ (set bonus ตามจำนวนชิ้นที่สวมครบ) ----------
export const SETS = {
  azure_immortal: {
    id: 'azure_immortal', name: 'ชุดเซียนเทพบูรพา', alignment: 'righteous',
    // โบนัสเมื่อสวมครบ 2 / 4 ชิ้นในเซ็ต
    bonuses: {
      2: { qi: 20, parry: 0.05 },
      4: { qi: 45, parry: 0.10, hp: 80 },
    },
  },
  blood_asura: {
    id: 'blood_asura', name: 'ชุดโลหิตอสูร', alignment: 'demonic',
    bonuses: {
      2: { atk: 16, lifesteal: 0.06 },
      4: { atk: 40, lifesteal: 0.15, hp: 60 },
    },
  },
  windwalker: {
    id: 'windwalker', name: 'ชุดเหินลมกระบี่เบา', alignment: 'neutral',
    bonuses: {
      2: { speed: 1.0, dash: 4 },
      3: { speed: 2.0, dash: 8, jump: 1.5 },
    },
  },
};

// ---------- อุปกรณ์ ----------
export const EQUIPMENT = {
  // อาวุธ
  sword_iron:   { id: 'sword_iron',   name: 'กระบี่เหล็กกล้า', slot: 'weapon', rarity: 'common', bonuses: { atk: 8 } },
  sword_azure:  { id: 'sword_azure',  name: 'กระบี่ฟ้าคราม', slot: 'weapon', rarity: 'epic', set: 'azure_immortal', bonuses: { atk: 18, parry: 0.04 } },
  blade_blood:  { id: 'blade_blood',  name: 'ดาบโลหิต', slot: 'weapon', rarity: 'epic', set: 'blood_asura', bonuses: { atk: 24, lifesteal: 0.05 } },
  // หมวก
  hat_bamboo:   { id: 'hat_bamboo',   name: 'งอบไผ่พเนจร', slot: 'helmet', rarity: 'common', bonuses: { qi: 6 } },
  crown_azure:  { id: 'crown_azure',  name: 'มงกุฎเซียนบูรพา', slot: 'helmet', rarity: 'epic', set: 'azure_immortal', bonuses: { qi: 14, hp: 30 } },
  mask_asura:   { id: 'mask_asura',   name: 'หน้ากากอสูร', slot: 'helmet', rarity: 'epic', set: 'blood_asura', bonuses: { atk: 10, hp: 20 } },
  // เสื้อ
  robe_cloth:   { id: 'robe_cloth',   name: 'เสื้อผ้าฝ้าย', slot: 'shirt', rarity: 'common', bonuses: { hp: 30 } },
  robe_azure:   { id: 'robe_azure',   name: 'อาภรณ์เซียนบูรพา', slot: 'shirt', rarity: 'epic', set: 'azure_immortal', bonuses: { hp: 60, qi: 10 } },
  armor_blood:  { id: 'armor_blood',  name: 'เกราะโลหิต', slot: 'shirt', rarity: 'epic', set: 'blood_asura', bonuses: { hp: 70, atk: 8 } },
  // ผ้าคลุม
  cloak_cloud:  { id: 'cloak_cloud',  name: 'ผ้าคลุมเมฆา', slot: 'cloak', rarity: 'rare', set: 'windwalker', bonuses: { speed: 0.6, dash: 3 } },
  cloak_azure:  { id: 'cloak_azure',  name: 'ผ้าคลุมเซียนบูรพา', slot: 'cloak', rarity: 'epic', set: 'azure_immortal', bonuses: { qi: 12, parry: 0.03 } },
  // สร้อย
  amulet_jade:  { id: 'amulet_jade',  name: 'สร้อยหยกเขียว', slot: 'necklace', rarity: 'rare', bonuses: { qi: 12, hp: 20 } },
  amulet_blood: { id: 'amulet_blood', name: 'สร้อยเลือดมาร', slot: 'necklace', rarity: 'epic', set: 'blood_asura', bonuses: { lifesteal: 0.05, atk: 8 } },
  // แหวน
  ring_power:   { id: 'ring_power',   name: 'แหวนพลังหมัด', slot: 'ring', rarity: 'rare', bonuses: { atk: 10 } },
  ring_spirit:  { id: 'ring_spirit',  name: 'แหวนปราณวิญญาณ', slot: 'ring', rarity: 'rare', bonuses: { qi: 14 } },
  // ปลอกแขน
  bracer_iron:  { id: 'bracer_iron',  name: 'ปลอกแขนเหล็ก', slot: 'bracer', rarity: 'common', bonuses: { atk: 6, parry: 0.03 } },
  bracer_wind:  { id: 'bracer_wind',  name: 'ปลอกแขนลมกรด', slot: 'bracer', rarity: 'rare', set: 'windwalker', bonuses: { speed: 0.5, atk: 6 } },
  // รองเท้า
  boots_swift:  { id: 'boots_swift',  name: 'รองเท้าวิ่งไว', slot: 'shoes', rarity: 'common', bonuses: { speed: 0.8 } },
  boots_wind:   { id: 'boots_wind',   name: 'รองเท้าเหินลม', slot: 'shoes', rarity: 'rare', set: 'windwalker', bonuses: { speed: 1.0, jump: 1.0 } },
};

// ---------- ของใช้สิ้นเปลือง (consumable) — ใส่ hotbar ใช้ด้วยคีย์ 1-4 ----------
// effect: heal เลือด/ปราณ ทันที (ค่าเป็นจำนวนหรือสัดส่วน frac ของค่าสูงสุด)
export const CONSUMABLES = {
  potion_hp:    { id: 'potion_hp',    name: 'ยาเติมเลือด',   color: '#ff5b6e', effect: { hp: 80 } },
  potion_hp_big:{ id: 'potion_hp_big',name: 'ยาเติมเลือดใหญ่', color: '#ff8b9e', effect: { hpFrac: 0.6 } },
  potion_qi:    { id: 'potion_qi',    name: 'ยาเติมปราณ',     color: '#6fd0ff', effect: { qi: 60 } },
  pill_vitality:{ id: 'pill_vitality',name: 'ยาบำรุงปราณกาย', color: '#9be9b0', effect: { hpFrac: 0.4, qiFrac: 0.4 } },
};

export function itemDef(id) {
  return EQUIPMENT[id] || CONSUMABLES[id] || null;
}
export function isConsumable(id) { return !!CONSUMABLES[id]; }
