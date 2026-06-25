// เลเยอร์ UI (DOM) — HUD, แผงตัวละคร/ฝึกวิชา/สำนัก/เคล็ดวิชา, toast
import { SKILLS } from './data/skills.js';
import { SECTS } from './data/sects.js';
import { MANUALS } from './data/manuals.js';
import { computeStats } from './systems/stats.js';
import { skillStatus, learn, isAccessible } from './systems/cultivation.js';
import { currentRankName, canJoin, joinSect } from './systems/sect.js';
import { questStep, checkStep, advance } from './systems/quest.js';
import { totalNeigong } from './state.js';

let ctx = null;          // { state, onChange }
let openName = null;

const $ = (sel) => document.querySelector(sel);

export function initUI(context) {
  ctx = context;
  $('#panel-close').onclick = closePanel;
  document.querySelectorAll('#hud-menu button').forEach((b) => {
    b.onclick = () => openPanel(b.dataset.panel);
  });
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

export function updateHud(state, live) {
  const stats = computeStats(state);
  $('#chip-insight').innerHTML = `ปัญญายุทธ์ <b>${state.insight}</b>`;
  $('#chip-sect').textContent = currentRankName(state);
  $('#chip-rep').innerHTML = `ชื่อเสียง <b>${state.reputation}</b>`;
  const mEl = $('#chip-morality');
  mEl.textContent = state.morality >= 0 ? `ธรรม +${state.morality}` : `มาร ${state.morality}`;
  mEl.style.color = state.morality >= 0 ? 'var(--jade)' : 'var(--blood)';

  if (live) {
    $('#hp-fill').style.width = `${Math.max(0, (live.hp / stats.hpMax) * 100)}%`;
    $('#qi-fill').style.width = `${Math.max(0, (live.qi / stats.qiMax) * 100)}%`;
  }
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
  const titles = { character: 'ตัวละคร', cultivation: 'ฝึกวิชา', sect: 'สำนักวิทยายุทธ์', manual: 'เคล็ดวิชาไร้สำนัก', help: 'วิธีเล่น' };
  $('#panel-title').textContent = titles[openName] || '';
  const body = $('#panel-body');
  body.innerHTML = '';
  ({ character: renderCharacter, cultivation: renderCultivation, sect: renderSect, manual: renderManual, help: renderHelp }[openName] || (() => {}))(body);
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
      <b>ลากเมาส์</b> — หมุนกล้อง · <b>Q / E</b> — หมุนกล้องซ้าย/ขวา
    </p>
    <div class="section-title">การต่อสู้</div>
    <p style="font-size:14px;line-height:1.9">
      เข้าใกล้ศัตรู (แดง) แล้ว <b>คลิกซ้าย</b> หรือ <b>F</b> — โจมตี (เสียปราณ)<br>
      <b>คลิกขวาค้าง</b> — ตั้งการ์ด/สวนกลับ (parry) ลดดาเมจและได้ปัญญายุทธ์โบนัส<br>
      ชนะแล้วได้ <b>ปัญญายุทธ์</b> ไปฝึกวิชา — สู้สวย (ไม่โดนตี/สวนกลับ/ใช้ท่าหลากหลาย) ได้มากกว่า
    </p>
    <div class="section-title">การเติบโต (ไม่มีเลเวล)</div>
    <p style="font-size:14px;line-height:1.9">
      เปิด <b>ฝึกวิชา (V)</b> ใช้ปัญญายุทธ์เรียน/เลื่อนขั้นวิชา → สถานะเพิ่มทันที<br>
      เปิด <b>สำนัก (B)</b> เข้าสังกัดเพื่อปลดคลังวิชาของสำนัก<br>
      เปิด <b>เคล็ดวิชา (N)</b> ทำเควสเก็บชิ้นส่วน → ถอดอักขระ → ฝึกพลังภายในให้ถึงเกณฑ์ เพื่อปลดวิชาลับไร้สำนัก
    </p>
    <div class="section-title">สิ่งที่อยู่ในโลก</div>
    <p style="font-size:14px;line-height:1.9">
      🟡 จุดเรืองทอง = ชิ้นส่วนคัมภีร์ (เดินทับเพื่อเก็บ) · 🟢 NPC พระชรา = ถอดอักขระ (E) · 🔴 ศัตรู = ต่อสู้
    </p>`;
}
