// นิยามโลก 3D แบบ data-driven (Phase 2)
// แยกผังยุทธภพออกจากโค้ดเกม — เพิ่ม/ย้ายย่าน, สำนัก, NPC, จุดเก็บคัมภีร์ ได้โดยไม่ต้องแก้ main.js
//
// พิกัดทั้งหมดเป็น [x, z] บนระนาบพื้น (y ขึ้นบน) หน่วยเดียวกับ Three.js scene

export const WORLD = {
  radius: 130, // รัศมีขอบโลกที่ผู้เล่นเดินได้

  // ---------- ย่านพื้นที่ (regions) ----------
  // ใช้บอกผู้เล่นว่ากำลังอยู่ที่ไหน + แต้มสีพื้นให้แต่ละย่านมีบรรยากาศต่างกัน
  // เรียงจาก "เล็ก/เฉพาะเจาะจง" ไป "ใหญ่" — region แรกที่ผู้เล่นอยู่ในรัศมีถือว่าใช่
  regions: [
    { id: 'plaza',       name: 'ลานชุมนุมยุทธภพ', center: [0, 8],    radius: 26, ground: 0x6f7f48 },
    { id: 'east_forest', name: 'ป่าตะวันออก',       center: [58, 40],  radius: 58, ground: 0x375e33 },
    { id: 'north_peak',  name: 'เขาเหนือคำราม',     center: [-42, -58], radius: 56, ground: 0x6a6c58 },
    { id: 'blood_vale',  name: 'หุบเหวเลือด',        center: [48, -56], radius: 52, ground: 0x6e3636 },
    { id: 'misty_lake',  name: 'ทะเลสาบวารีรำพึง',   center: [-58, 48], radius: 52, ground: 0x3c5d63 },
  ],
  wildsName: 'ยุทธภพกว้างใหญ่', // ชื่อย่านเมื่ออยู่นอกทุก region

  // ---------- ที่ตั้งสำนัก ----------
  // เดินไปใกล้ประตูสำนักแล้วกด E เพื่อเปิดแผงสำนัก (เชื่อมโลก 3D กับระบบ sect)
  // sect อ้างอิง id ใน data/sects.js (ใช้ชื่อ/สี/สายจากที่นั่น)
  sectSites: [
    { sect: 'wudang',     pos: [-60, 52] },
    { sect: 'shaolin',    pos: [-46, -60] },
    { sect: 'blood_cult', pos: [52, -60] },
  ],

  // ---------- ลานสมาธิ (แหล่งปัญญายุทธ์รอง) ----------
  // ยืนบนลานแล้วกด E เพื่อทำสมาธิ ได้ปัญญายุทธ์ทีละน้อย (มีคูลดาวน์กันฟาร์มรัว)
  meditationSpots: [
    { id: 'plaza_stone', name: 'แผ่นศิลาจารึกโบราณ', pos: [10, -6],   gain: 3, cooldown: 6 },
    { id: 'peak_shrine', name: 'ศาลเจ้ายอดเขาเหนือ',  pos: [-34, -50], gain: 6, cooldown: 9 },
    { id: 'lake_seat',   name: 'แท่นวารีรำพึง',        pos: [-52, 42],  gain: 5, cooldown: 9 },
  ],

  // ---------- NPC พูดคุย ----------
  // role: 'decode' = พระชราถอดอักขระเควสคัมภีร์ (กลไกเดิม) | 'lore' = ให้เบาะแส/เรื่องราว
  // variant: รูปทรง NPC (avatar.js) — elder ชายแก่ · swordsman นักดาบชาย · townsman ชาวบ้าน · heroine หญิงสาว
  npcs: [
    { id: 'old_monk', name: 'พระชรา', pos: [-6, -4], color: 0x6a8f5a, variant: 'elder', role: 'decode',
      lines: ['พระชรา: "ยุทธภพกว้างใหญ่ จงสงบจิตแล้วแสวงหาเคล็ดวิชาด้วยใจมั่น"'] },
    { id: 'wanderer', name: 'จอมยุทธ์เร้นกาย', pos: [46, 30], color: 0x3a5a7a, variant: 'swordsman', role: 'lore',
      lines: [
        '"ว่ากันว่าคัมภีร์เก้าหยางขาดเป็นสามท่อน กระจัดกระจายทั่วยุทธภพ"',
        '"ลองหาในป่าตะวันออก บนเขาเหนือ และริมทะเลสาบวารีดูสิ"',
      ] },
    { id: 'merchant', name: 'พ่อค้าเร่', pos: [14, 4], color: 0x8a6a3a, variant: 'townsman', role: 'lore',
      lines: [
        '"ลานสมาธิช่วยสงบจิต ยืนทำสมาธิที่นั่นได้ปัญญายุทธ์เพิ่มนะ (กด E)"',
        '"แต่ละสำนักมีประตูของตน เดินไปกด E ที่ประตูก็เข้าสังกัดได้เลย"',
      ] },
    { id: 'hermit', name: 'นางพรายวารี', pos: [-50, 38], color: 0x9b6cc0, variant: 'heroine', role: 'lore',
      lines: [
        '"สำนักวารีรำพึงเน้นวิชาตัวเบา เร็วดั่งสายลม"',
        '"ระวังหุบเหวเลือดทางทิศใต้ พวกลัทธิมารโหดเหี้ยมนัก"',
      ] },
  ],

  // ---------- จุดเก็บชิ้นส่วนคัมภีร์ ----------
  // จำนวนต้องตรงกับเควส collect ใน data/manuals.js (ปัจจุบัน 3 ชิ้น)
  // hint ใช้แสดงในแผงเคล็ดวิชา/บอกทิศ
  fragmentSites: [
    { pos: [66, 44],  hint: 'กลางป่าตะวันออก' },
    { pos: [-44, -64], hint: 'บนเขาเหนือคำราม' },
    { pos: [-64, 56],  hint: 'ริมทะเลสาบวารีรำพึง' },
  ],

  // ---------- ศัตรู ----------
  // กระจายตามย่าน: ใกล้ลานกลางอ่อน ไกลออกไปแกร่งขึ้น
  // variant กำหนดรูปร่าง (ดู systems/avatar.js): grunt ลูกสมุน · brute ยักษ์กำยำ · assassin นักฆ่าเพรียว · demon มารมีเขา
  enemies: [
    // รอบลานชุมนุม (อ่อน — ฝึกมือ)
    { pos: [18, -4],   power: 7,  name: 'โจรป่า',          variant: 'grunt' },
    { pos: [-16, -2],  power: 8,  name: 'โจรป่า',          variant: 'grunt' },
    { pos: [24, 12],   power: 9,  name: 'อันธพาลเร่ร่อน',   variant: 'grunt' },

    // ป่าตะวันออก
    { pos: [40, 28],   power: 11, name: 'นักดาบพเนจร',     variant: 'grunt' },
    { pos: [62, 30],   power: 12, name: 'มือกระบี่ป่า',     variant: 'assassin' },
    { pos: [70, 50],   power: 13, name: 'เสือสมิงเฒ่า',     variant: 'brute' },
    { pos: [50, 55],   power: 11, name: 'นักดาบพเนจร',     variant: 'grunt' },

    // เขาเหนือ
    { pos: [-30, -40], power: 14, name: 'จอมโจรเขาเหนือ',  variant: 'brute' },
    { pos: [-48, -50], power: 16, name: 'นักรบเขาเหนือ',    variant: 'brute' },
    { pos: [-38, -68], power: 18, name: 'ขุนพลโจร',         variant: 'brute' },

    // ทะเลสาบวารี
    { pos: [-46, 36],  power: 12, name: 'นักฆ่าเงาวารี',    variant: 'assassin' },
    { pos: [-66, 50],  power: 15, name: 'มือเข็มพิษ',        variant: 'assassin' },

    // หุบเหวเลือด (แกร่งสุด — สายมาร)
    { pos: [44, -48],  power: 18, name: 'มารอาวุโส',        variant: 'demon' },
    { pos: [56, -62],  power: 22, name: 'ทูตเลือด',          variant: 'demon' },
    { pos: [38, -66],  power: 24, name: 'สาวกเลือดบูชา',     variant: 'demon' },
    { pos: [60, -50],  power: 28, name: 'มารหัตถ์โลหิต',     variant: 'demon' },
  ],
};
