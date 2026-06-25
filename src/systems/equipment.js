// ระบบอุปกรณ์: สวม/ถอด, รวมโบนัส option + set bonus (Phase 2)
import { EQUIPMENT, SETS, SLOTS, CONSUMABLES, isConsumable } from '../data/items.js';

const STAT_KEYS = ['hp', 'qi', 'atk', 'speed', 'jump', 'dash', 'parry', 'lifesteal'];

// นับจำนวนชิ้นของแต่ละเซ็ตที่สวมอยู่ -> { setId: count }
export function equippedSetCounts(state) {
  const counts = {};
  for (const slot of SLOTS) {
    const id = state.equipped?.[slot.id];
    const def = id && EQUIPMENT[id];
    if (def?.set) counts[def.set] = (counts[def.set] || 0) + 1;
  }
  return counts;
}

// เซ็ตที่ "ทำงานอยู่" พร้อมระดับ (threshold สูงสุดที่ถึง) -> [{ set, count, tier, bonuses }]
export function activeSets(state) {
  const counts = equippedSetCounts(state);
  const out = [];
  for (const [setId, count] of Object.entries(counts)) {
    const set = SETS[setId];
    if (!set) continue;
    let tier = 0, bonuses = {};
    for (const need of Object.keys(set.bonuses).map(Number).sort((a, b) => a - b)) {
      if (count >= need) { tier = need; bonuses = set.bonuses[need]; }
    }
    out.push({ set, count, tier, bonuses });
  }
  return out;
}

// รวมโบนัสสถานะจากอุปกรณ์ + set bonus -> { stat: total }
export function equipmentBonuses(state) {
  const sum = {};
  const add = (g) => { for (const k of STAT_KEYS) if (g?.[k]) sum[k] = (sum[k] || 0) + g[k]; };
  for (const slot of SLOTS) {
    const id = state.equipped?.[slot.id];
    if (id && EQUIPMENT[id]) add(EQUIPMENT[id].bonuses);
  }
  for (const a of activeSets(state)) add(a.bonuses);
  return sum;
}

// สวมอุปกรณ์จากคลัง — คืนชิ้นเดิมกลับเข้าคลัง
export function equip(state, itemId) {
  const def = EQUIPMENT[itemId];
  if (!def) return { ok: false, msg: 'ไม่ใช่อุปกรณ์สวมใส่' };
  if (!hasInInventory(state, itemId)) return { ok: false, msg: 'ไม่มีไอเทมนี้ในคลัง' };
  removeFromInventory(state, itemId, 1);
  const prev = state.equipped[def.slot];
  if (prev) addToInventory(state, prev, 1);
  state.equipped[def.slot] = itemId;
  return { ok: true, msg: `สวม ${def.name}` };
}

export function unequip(state, slotId) {
  const cur = state.equipped?.[slotId];
  if (!cur) return { ok: false, msg: 'ช่องนี้ว่างอยู่' };
  addToInventory(state, cur, 1);
  state.equipped[slotId] = null;
  return { ok: true, msg: `ถอด ${EQUIPMENT[cur]?.name || ''}` };
}

// ---------- คลัง (inventory เป็น { itemId: qty }) ----------
export function addToInventory(state, itemId, qty = 1) {
  state.inventory[itemId] = (state.inventory[itemId] || 0) + qty;
}
export function removeFromInventory(state, itemId, qty = 1) {
  const n = (state.inventory[itemId] || 0) - qty;
  if (n > 0) state.inventory[itemId] = n; else delete state.inventory[itemId];
}
export function hasInInventory(state, itemId) {
  return (state.inventory[itemId] || 0) > 0;
}

// ---------- ของใช้สิ้นเปลือง ----------
// ใช้ไอเทม -> ปรับ live {hp,qi} ตาม effect ; คืน { ok, msg }
export function useConsumable(state, live, stats, itemId) {
  if (!isConsumable(itemId)) return { ok: false, msg: 'ใช้แบบนี้ไม่ได้' };
  if (!hasInInventory(state, itemId)) return { ok: false, msg: 'ไม่มีไอเทมนี้' };
  const def = CONSUMABLES[itemId];
  const e = def.effect;
  let healed = false;
  if (e.hp || e.hpFrac) {
    const amt = (e.hp || 0) + (e.hpFrac || 0) * stats.hpMax;
    if (live.hp < stats.hpMax) { live.hp = Math.min(stats.hpMax, live.hp + amt); healed = true; }
  }
  if (e.qi || e.qiFrac) {
    const amt = (e.qi || 0) + (e.qiFrac || 0) * stats.qiMax;
    if (live.qi < stats.qiMax) { live.qi = Math.min(stats.qiMax, live.qi + amt); healed = true; }
  }
  if (!healed) return { ok: false, msg: 'เลือด/ปราณเต็มแล้ว' };
  removeFromInventory(state, itemId, 1);
  return { ok: true, msg: `ใช้ ${def.name}` };
}
