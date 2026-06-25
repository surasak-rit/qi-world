// เลเยอร์ UI (DOM) — HUD, แผงตัวละคร/ฝึกวิชา/สำนัก/เคล็ดวิชา, toast
import { SKILLS } from './data/skills.js';
import { SECTS } from './data/sects.js';
import { MANUALS } from './data/manuals.js';
import { computeStats } from './systems/stats.js';
import { skillStatus, learn, isAccessible } from './systems/cultivation.js';
import { currentRankName, canJoin, joinSect } from './systems/sect.js';
import { questStep, checkStep, advance } from './systems/quest.js';
import { totalNeigong } from './state.js';
import { SLOTS, RARITY, EQUIPMENT, CONSUMABLES, itemDef, isConsumable } from './data/items.js';
import { equip, unequip, activeSets, equipmentBonuses } from './systems/equipment.js';

let ctx = null;          // { state, onChange }
let openName = null;

const $ = (sel) => document.querySelector(sel);

export function initUI(context) {
  ctx = context;
  $('#panel-close').onclick = closePanel;
  document.querySelectorAll('#hud-menu button').forEach((b) => {
    b.onclick = () => openPanel(b.dataset.panel);
  });
  const auto = $('#chip-auto');
  if (auto) auto.onclick = () => { ctx.state.autoCounter = !ctx.state.autoCounter; ctx.onChange(); };
  renderHotbar(ctx.state);
}

// ป้ายสถานะ (ใช้ทั้งอุปกรณ์/เซ็ต)
const STAT_LABEL = { hp: 'เลือด', qi: 'ปราณ', atk: 'โจมตี', speed: 'ความเร็ว', jump: 'กระโดด', dash: 'พุ่ง', parry: 'สวนกลับ', lifesteal: 'ดูดเลือด' };
function fmtBonus(g) {
  return Object.entries(g).map(([k, v]) => {
    const pct = (k === 'parry' || k === 'lifesteal');
    const val = pct ? `${Math.round(v * 100)}%` : v;
    return `${STAT_LABEL[k] || k} +${val}`;
  }).join(' · ');
}

const ALIGN_LABEL = { righteous: 'ธรรม', demonic: 'มาร', neutral: 'กลาง' };

export function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  $('#toast-wrap').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function setPrompt(html) {
  const p = $('#interact-prompt');
  if (!html) { p.classList.add('hidden'); return; }
  p.innerHTML = html;
  p.classList.remove('hidden');
}

// ชื่อย่านพื้นที่ปัจจุบัน (มุมขวาบน)
export function setRegion(name) {
  const el = $('#chip-region');
  if (el) el.textContent = name;
}

// ---------- มินิแมพ ----------
// วาดแผนที่ย่อมุมขวาบน: ขอบโลก, ย่าน, ผู้เล่น (ลูกศร), ศัตรู/ชิ้นส่วน/สำนัก/NPC/ลานสมาธิ
let mmCtx = null, mmSize = 0;
function ensureMinimap() {
  if (mmCtx) return mmCtx;
  const c = $('#minimap');
  if (!c) return null;
  mmSize = c.width;
  mmCtx = c.getContext('2d');
  return mmCtx;
}
export function drawMinimap(d) {
  const g = ensureMinimap();
  if (!g) return;
  const S = mmSize, R = S / 2, scale = R / d.radius;
  const wx = (x) => R + x * scale;
  const wz = (z) => R + z * scale;
  g.clearRect(0, 0, S, S);

  // พื้นหลัง + ขอบโลก
  g.fillStyle = 'rgba(10,12,16,.72)';
  g.beginPath(); g.arc(R, R, R - 1, 0, Math.PI * 2); g.fill();

  // ย่านพื้นที่
  for (const rg of d.regions) {
    g.fillStyle = `#${rg.ground.toString(16).padStart(6, '0')}55`;
    g.beginPath(); g.arc(wx(rg.center[0]), wz(rg.center[1]), rg.radius * scale, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = 'rgba(233,196,106,.55)'; g.lineWidth = 1.5;
  g.beginPath(); g.arc(R, R, R - 1, 0, Math.PI * 2); g.stroke();

  const dot = (x, z, color, r = 2.4) => {
    g.fillStyle = color;
    g.beginPath(); g.arc(wx(x), wz(z), r, 0, Math.PI * 2); g.fill();
  };
  (d.sects || []).forEach((s) => dot(s.x, s.z, `#${s.color.toString(16).padStart(6, '0')}`, 3.2));
  (d.meditations || []).forEach((m) => dot(m.x, m.z, '#6fd0ff'));
  (d.npcs || []).forEach((n) => dot(n.x, n.z, '#2ecc71'));
  (d.fragments || []).forEach((f) => dot(f.x, f.z, '#e9c46a', 2.8));
  (d.enemies || []).forEach((e) => dot(e.x, e.z, '#ff5b6e'));

  // ผู้เล่น (ลูกศรชี้ทิศกล้อง)
  const px = wx(d.player.x), pz = wz(d.player.z);
  g.save(); g.translate(px, pz); g.rotate(-d.player.yaw);
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(0, -5); g.lineTo(3.5, 4); g.lineTo(0, 2); g.lineTo(-3.5, 4); g.closePath(); g.fill();
  g.restore();
}

export function updateHud(state, live) {
  const stats = computeStats(state);
  $('#chip-insight').innerHTML = `ปัญญายุทธ์ <b>${state.insight}</b>`;
  $('#chip-sect').textContent = currentRankName(state);
  $('#chip-rep').innerHTML = `ชื่อเสียง <b>${state.reputation}</b>`;
  const mEl = $('#chip-morality');
  mEl.textContent = state.morality >= 0 ? `ธรรม +${state.morality}` : `มาร ${state.morality}`;
  mEl.style.color = state.morality >= 0 ? 'var(--jade)' : 'var(--blood)';

  const auto = $('#chip-auto');
  if (auto) auto.textContent = `ตีกลับอัตโนมัติ: ${state.autoCounter ? 'เปิด' : 'ปิด'}`;

  if (live) {
    $('#hp-fill').style.width = `${Math.max(0, (live.hp / stats.hpMax) * 100)}%`;
    $('#qi-fill').style.width = `${Math.max(0, (live.qi / stats.qiMax) * 100)}%`;
  }
  renderHotbar(state);
}

// กรอบเป้าหมาย: ชื่อ + หลอดเลือดมอนสเตอร์ที่กำลังสู้ (null = ซ่อน)
export function setTarget(t) {
  const f = $('#target-frame');
  if (!f) return;
  if (!t) { f.classList.add('hidden'); return; }
  f.classList.remove('hidden');
  $('#target-name').textContent = `${t.name}  ${Math.max(0, Math.ceil(t.hp))}/${t.hpMax}`;
  $('#target-hp').style.width = `${Math.max(0, (t.hp / t.hpMax) * 100)}%`;
}

// hotbar ไอเทม (คีย์ 1-4)
export function renderHotbar(state) {
  const wrap = $('#hotbar');
  if (!wrap) return;
  wrap.innerHTML = (state.hotbar || []).map((id, i) => {
    const def = id ? CONSUMABLES[id] : null;
    const qty = id ? (state.inventory[id] || 0) : 0;
    return `<div class="hot-slot ${def ? '' : 'empty'}" data-hot="${i}" title="${def ? def.name : 'ว่าง'}">
      <span class="key">${i + 1}</span>
      <span class="dot" style="${def ? `background:${def.color}` : ''}"></span>
      ${def ? `<span class="qty">${qty}</span>` : ''}
    </div>`;
  }).join('');
  wrap.querySelectorAll('[data-hot]').forEach((el) => {
    el.onclick = () => ctx?.useHotbar(+el.dataset.hot);
  });
}

export function isPanelOpen() { return openName != null; }

export function closePanel() {
  openName = null;
  $('#panel').classList.add('hidden');
}

export function openPanel(name) {
  openName = name;
  $('#panel').classList.remove('hidden');
  render();
}

function refresh() {
  ctx.onChange();
  if (openName) render();
}

function render() {
  const titles = { character: 'ตัวละคร', cultivation: 'ฝึกวิชา', inventory: 'คลัง / อุปกรณ์', sect: 'สำนักวิทยายุทธ์', manual: 'เคล็ดวิชาไร้สำนัก', help: 'วิธีเล่น' };
  $('#panel-title').textContent = titles[openName] || '';
  const body = $('#panel-body');
  body.innerHTML = '';
  ({ character: renderCharacter, cultivation: renderCultivation, inventory: renderInventory, sect: renderSect, manual: renderManual, help: renderHelp }[openName] || (() => {}))(body);
}

// ---------- คลัง / อุปกรณ์ ----------
function renderInventory(body) {
  const s = ctx.state;
  // ช่องสวมใส่ 8 ช่อง
  let html = '<div class="section-title">ช่องสวมใส่</div><div class="equip-grid">';
  for (const slot of SLOTS) {
    const id = s.equipped[slot.id];
    const def = id && EQUIPMENT[id];
    const col = def ? RARITY[def.rarity].color : 'rgba(255,255,255,.25)';
    html += `<div class="equip-slot" style="border-color:${col}">
      <div class="slot-name">${slot.name}</div>
      <div class="slot-item" style="color:${def ? col : 'inherit'}">${def ? def.name : '— ว่าง —'}</div>
      ${def ? `<div class="slot-bonus">${fmtBonus(def.bonuses)}</div>
        <button class="btn mini" data-unequip="${slot.id}">ถอด</button>` : ''}
    </div>`;
  }
  html += '</div>';

  // set bonus ที่ทำงานอยู่
  const sets = activeSets(s);
  if (sets.length) {
    html += '<div class="section-title">เซ็ตอุปกรณ์</div>';
    for (const a of sets) {
      html += `<div class="card"><div class="row"><div><h3>${a.set.name}</h3>
        <div class="meta">สวม ${a.count} ชิ้น${a.tier ? ` — โบนัสครบ ${a.tier} ชิ้น` : ''}</div></div>
        <span class="tag ${a.set.alignment}">${ALIGN_LABEL[a.set.alignment]}</span></div>
        ${a.tier ? `<div class="meta" style="color:var(--jade)">⚜ ${fmtBonus(a.bonuses)}</div>`
          : '<div class="reason">ยังไม่ถึงเกณฑ์โบนัสเซ็ต</div>'}</div>`;
    }
  }

  // โบนัสรวมจากอุปกรณ์
  const eq = equipmentBonuses(s);
  if (Object.keys(eq).length)
    html += `<div class="section-title">โบนัสรวมจากอุปกรณ์</div><div class="card"><div class="meta" style="color:var(--gold)">${fmtBonus(eq)}</div></div>`;

  // คลังของ
  const ids = Object.keys(s.inventory).filter((id) => (s.inventory[id] || 0) > 0);
  html += `<div class="section-title">คลังของ (${ids.length})</div>`;
  if (!ids.length) html += '<p style="opacity:.6">คลังว่างเปล่า</p>';
  for (const id of ids) {
    const def = itemDef(id); if (!def) continue;
    const qty = s.inventory[id];
    const consumable = isConsumable(id);
    const col = consumable ? def.color : RARITY[def.rarity].color;
    html += `<div class="card"><div class="row"><div>
      <h3 style="color:${col}">${def.name} ${qty > 1 ? `<span class="meta">×${qty}</span>` : ''}</h3>
      <div class="meta">${consumable ? 'ของใช้สิ้นเปลือง' : `อุปกรณ์ · ${SLOTS.find((sl) => sl.id === def.slot)?.name} · ${RARITY[def.rarity].name}`}</div>
      <div class="meta">${consumable ? fmtConsumable(def) : fmtBonus(def.bonuses)}${def.set ? ` · <span class="tag wuji">เซ็ต</span>` : ''}</div>
    </div></div>
    <div class="actions">
      ${consumable
        ? `<button class="btn primary" data-use="${id}">ใช้</button>
           ${[0, 1, 2, 3].map((i) => `<button class="btn mini" data-bind="${id}" data-slot="${i}">ผูก ${i + 1}</button>`).join('')}`
        : `<button class="btn primary" data-equip="${id}">สวม</button>`}
    </div></div>`;
  }
  body.innerHTML = html;

  body.querySelectorAll('[data-equip]').forEach((b) => b.onclick = () => { const r = equip(s, b.dataset.equip); toast(r.msg, r.ok ? 'good' : 'bad'); refresh(); });
  body.querySelectorAll('[data-unequip]').forEach((b) => b.onclick = () => { const r = unequip(s, b.dataset.unequip); toast(r.msg, r.ok ? 'good' : 'bad'); refresh(); });
  body.querySelectorAll('[data-use]').forEach((b) => b.onclick = () => { ctx.useItem(b.dataset.use); refresh(); });
  body.querySelectorAll('[data-bind]').forEach((b) => b.onclick = () => {
    s.hotbar[+b.dataset.slot] = b.dataset.bind;
    toast(`ผูก ${CONSUMABLES[b.dataset.bind].name} เข้าช่อง ${+b.dataset.slot + 1}`, 'good');
    renderHotbar(s); refresh();
  });
}

function fmtConsumable(def) {
  const e = def.effect, parts = [];
  if (e.hp) parts.push(`ฟื้นเลือด +${e.hp}`);
  if (e.hpFrac) parts.push(`ฟื้นเลือด ${Math.round(e.hpFrac * 100)}%`);
  if (e.qi) parts.push(`ฟื้นปราณ +${e.qi}`);
  if (e.qiFrac) parts.push(`ฟื้นปราณ ${Math.round(e.qiFrac * 100)}%`);
  return parts.join(' · ');
}

// ---------- ตัวละคร ----------
function renderCharacter(body) {
  const s = computeStats(ctx.state);
  const boxes = [
    ['เลือดสูงสุด', s.hpMax], ['ปราณสูงสุด', s.qiMax],
    ['พลังโจมตี', s.atk], ['พลังภายใน', s.neigong],
    ['ความเร็ว', s.speed.toFixed(1)], ['โอกาสสวนกลับ', `${Math.round(s.parry * 100)}%`],
  ];
  if (s.lifesteal > 0) boxes.push(['ดูดเลือด', `${Math.round(s.lifesteal * 100)}%`]);
  body.innerHTML = `
    <p style="opacity:.8;font-size:13px;margin-bottom:12px">ไม่มีเลเวล — สถานะทั้งหมดคำนวณจากวิทยายุทธที่เรียนเท่านั้น</p>
    <div class="stat-grid">
      ${boxes.map(([l, v]) => `<div class="stat-box"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('')}
    </div>
    <div class="section-title">วิชาที่ฝึกอยู่</div>
    ${Object.keys(ctx.state.skills).map((id) => {
      const sk = SKILLS[id]; const t = ctx.state.skills[id];
      return `<div class="card"><div class="row"><div><h3>${sk.name}</h3>
        <div class="meta">${sk.tiers[t].name} · ${ALIGN_LABEL[sk.alignment]}</div></div></div></div>`;
    }).join('') || '<p style="opacity:.6">ยังไม่ได้ฝึกวิชาใด</p>'}`;
}

// ---------- ฝึกวิชา ----------
function skillCard(id) {
  const st = skillStatus(ctx.state, id);
  const sk = st.skill;
  const locked = !st.canAct && !st.learned;
  return `<div class="card ${locked ? 'locked' : ''}">
    <div class="row">
      <div>
        <h3>${sk.name} ${sk.wuji ? '<span class="tag wuji">ไร้สำนัก</span>' : ''}</h3>
        <div class="meta">${({ neigong: 'พลังภายใน', wushu: 'ท่วงท่ายุทธ์', qinggong: 'วิชาตัวเบา' })[sk.type]}
          · <span class="tag ${sk.alignment}">${ALIGN_LABEL[sk.alignment]}</span></div>
      </div>
      <span class="tag">${st.learned ? sk.tiers[st.cur].name : 'ยังไม่เรียน'}</span>
    </div>
    <div class="desc">${sk.desc}</div>
    ${st.maxed ? '<div class="meta">ฝึกถึงขั้นสูงสุดแล้ว ✦</div>' :
      `<div class="meta">ขั้นถัดไป: <b>${sk.tiers[st.nextTier].name}</b> · ใช้ปัญญายุทธ์ ${st.cost}</div>`}
    ${st.reason ? `<div class="reason">⚠ ${st.reason}</div>` : ''}
    ${!st.maxed ? `<div class="actions"><button class="btn primary" data-learn="${id}" ${st.canAct ? '' : 'disabled'}>${st.label}</button></div>` : ''}
  </div>`;
}

function renderCultivation(body) {
  // วิชาที่ "เข้าถึงได้/เรียนแล้ว" เท่านั้นที่โชว์
  const visible = Object.keys(SKILLS).filter((id) => {
    const sk = SKILLS[id];
    return ctx.state.skills[id] != null || isAccessible(ctx.state, sk);
  });
  const groups = { neigong: 'พลังภายใน', wushu: 'ท่วงท่ายุทธ์', qinggong: 'วิชาตัวเบา' };
  let html = `<p style="opacity:.8;font-size:13px;margin-bottom:6px">ปัญญายุทธ์คงเหลือ: <b style="color:var(--gold)">${ctx.state.insight}</b> — ได้จากการต่อสู้</p>`;
  for (const [type, label] of Object.entries(groups)) {
    const ids = visible.filter((id) => SKILLS[id].type === type);
    if (!ids.length) continue;
    html += `<div class="section-title">${label}</div>` + ids.map(skillCard).join('');
  }
  body.innerHTML = html;
  body.querySelectorAll('[data-learn]').forEach((b) => {
    b.onclick = () => { const r = learn(ctx.state, b.dataset.learn); toast(r.msg, r.ok ? 'good' : 'bad'); refresh(); };
  });
}

// ---------- สำนัก ----------
function renderSect(body) {
  let html = `<p style="opacity:.8;font-size:13px">สังกัดปัจจุบัน: <b style="color:var(--gold)">${currentRankName(ctx.state)}</b>`;
  if (ctx.state.sect) html += ` · คะแนนคุณงาม <b>${ctx.state.contribution}</b>`;
  html += `</p><p style="opacity:.6;font-size:12px;margin:4px 0 10px">เข้าได้ทีละสำนัก — ออกแล้ววิชาของสำนักเดิมจะถูกล็อกและเสียชื่อเสียง</p>`;

  for (const sect of Object.values(SECTS)) {
    const joined = ctx.state.sect === sect.id;
    const chk = canJoin(ctx.state, sect.id);
    html += `<div class="card">
      <div class="row"><div><h3>${sect.name}</h3>
        <div class="meta"><span class="tag ${sect.alignment}">${ALIGN_LABEL[sect.alignment]}</span>
          · ${sect.ranks.length} ลำดับชั้น</div></div>
        <span class="tag">${joined ? 'สังกัดอยู่' : ''}</span></div>
      <div class="desc">${sect.desc}</div>
      <div class="meta">คลังวิชา: ${sect.library.map((l) => SKILLS[l.skill].name).join(', ')}</div>
      ${sect.moralityOnJoin ? `<div class="reason">⚠ เข้าแล้วศีลธรรม ${sect.moralityOnJoin} (กลายเป็นสายมาร)</div>` : ''}
      ${joined ? '' : `<div class="actions"><button class="btn" data-join="${sect.id}" ${chk.ok ? '' : 'disabled'}>
        ${chk.ok ? 'ขอเข้าสังกัด' : chk.reason}</button></div>`}
    </div>`;
  }
  body.innerHTML = html;
  body.querySelectorAll('[data-join]').forEach((b) => {
    b.onclick = () => { const r = joinSect(ctx.state, b.dataset.join); toast(r.msg, r.ok ? 'good' : 'bad'); refresh(); };
  });
}

// ---------- เคล็ดวิชาไร้สำนัก ----------
function renderManual(body) {
  let html = `<p style="opacity:.8;font-size:13px;margin-bottom:10px">ชิ้นส่วนคัมภีร์ที่เก็บได้: <b style="color:var(--gold)">${ctx.state.fragments}</b> · พลังภายในรวม <b>${totalNeigong(ctx.state)}</b></p>`;
  for (const manual of Object.values(MANUALS)) {
    const cur = questStep(ctx.state, manual.id);
    const done = cur >= manual.steps.length;
    const chk = checkStep(ctx.state, manual.id);
    html += `<div class="card">
      <div class="row"><div><h3>${manual.name} <span class="tag wuji">ไร้สำนัก</span></h3></div>
        <span class="tag">${done ? 'ปลดล็อกแล้ว ✦' : `ขั้น ${Math.min(cur + 1, manual.steps.length)}/${manual.steps.length}`}</span></div>
      <div class="desc">${manual.desc}</div>
      ${manual.steps.map((s, i) => {
        const state = i < cur ? 'done' : 'todo';
        const mark = i < cur ? '✔' : (i === cur ? '➤' : '○');
        return `<div class="quest-step ${state}"><span class="mark">${mark}</span><span>${s.desc}</span></div>`;
      }).join('')}
      ${!done && (chk.step?.type === 'collect' || chk.step?.type === 'condition')
        ? `<div class="actions"><button class="btn primary" data-advance="${manual.id}" ${chk.done ? '' : 'disabled'}>
            ${chk.done ? 'ดำเนินการขั้นนี้' : 'ยังไม่ครบเงื่อนไข'}</button></div>`
        : ''}
      ${!done && chk.step?.type === 'decode'
        ? `<div class="reason">ไปหา NPC "พระชรา" ในโลก แล้วกด E เพื่อถอดอักขระ</div>` : ''}
    </div>`;
  }
  body.innerHTML = html;
  body.querySelectorAll('[data-advance]').forEach((b) => {
    b.onclick = () => { const r = advance(ctx.state, b.dataset.advance); toast(r.msg, r.ok ? 'good' : 'bad'); refresh(); };
  });
}

// ---------- วิธีเล่น ----------
function renderHelp(body) {
  body.innerHTML = `
    <div class="section-title">การเคลื่อนที่</div>
    <p style="font-size:14px;line-height:1.9">
      <b>W A S D</b> — เดิน · <b>Shift</b> — พุ่งตัว (ชิงกง) · <b>Space</b> — กระโดด<br>
      <b>ลากเมาส์</b> — หมุนกล้อง · <b>Q</b> / <b>← →</b> — หมุนกล้อง<br>
      <span style="opacity:.7">* คุมด้วยตำแหน่งปุ่ม (keycode) สลับภาษาไทย/อังกฤษได้โดยปุ่มไม่เพี้ยน</span>
    </p>
    <div class="section-title">การต่อสู้</div>
    <p style="font-size:14px;line-height:1.9">
      เข้าใกล้ศัตรู (แดง) แล้ว <b>คลิกซ้าย</b> หรือ <b>F</b> — ออกท่ากระบี่ (เสียปราณ)<br>
      <b>คลิกขวาค้าง</b> — ตั้งการ์ด/สวนกลับ (parry) ลดดาเมจและได้ปัญญายุทธ์โบนัส<br>
      <b>T</b> — สลับ "ตีกลับอัตโนมัติ" (โดนตีแล้วสวนกลับเองถ้าอยู่ในระยะ)<br>
      มุมบนแสดง <b>ชื่อ + หลอดเลือด</b> ของเป้าหมายที่กำลังสู้
    </p>
    <div class="section-title">การเติบโต (ไม่มีเลเวล)</div>
    <p style="font-size:14px;line-height:1.9">
      <b>ฝึกวิชา (V)</b> ใช้ปัญญายุทธ์เรียน/เลื่อนขั้นวิชา → สถานะเพิ่มทันที<br>
      <b>คลัง (I)</b> สวมอุปกรณ์ 8 ช่อง (อาวุธ/หมวก/เสื้อ/ผ้าคลุม/สร้อย/แหวน/ปลอกแขน/รองเท้า) มีโบนัส + เซ็ตโบนัส · ใช้ของในคลัง<br>
      <b>สำนัก (B)</b> เข้าสังกัดเพื่อปลดคลังวิชา (หรือเดินไปกด E ที่ประตูสำนัก)<br>
      <b>เคล็ดวิชา (N)</b> ทำเควสเก็บชิ้นส่วน → ถอดอักขระ → ฝึกพลังภายในให้ถึงเกณฑ์ เพื่อปลดวิชาลับไร้สำนัก
    </p>
    <div class="section-title">ไอเทม (hotbar)</div>
    <p style="font-size:14px;line-height:1.9">
      กด <b>1–4</b> ใช้ไอเทมที่ผูกไว้ (เช่น ยาเติมเลือด/ปราณ) · ผูกไอเทมได้ในแผง <b>คลัง</b><br>
      ชนะศัตรูมีโอกาสดรอปยาและอุปกรณ์ (ยิ่งแกร่งยิ่งดรอปของดี)
    </p>
    <div class="section-title">ยุทธภพ (5 ย่าน)</div>
    <p style="font-size:14px;line-height:1.9">
      ลานชุมนุม · ป่าตะวันออก · เขาเหนือ · หุบเหวเลือด · ทะเลสาบวารี — มุมขวาบนมี <b>มินิแมพ</b> + ชื่อย่าน<br>
      🟡 ชิ้นส่วนคัมภีร์ · 🟢 NPC (E คุย) · 🔵 ลานสมาธิ (E ทำสมาธิ ได้ปัญญายุทธ์) · ประตูสำนัก · 🔴 ศัตรู
    </p>`;
}
