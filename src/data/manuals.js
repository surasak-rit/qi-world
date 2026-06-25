// เคล็ดวิชาไร้สำนัก + เควสปลดล็อก
// ได้คัมภีร์มาแล้ว "ยังเรียนไม่ได้ทันที" ต้องทำเควสปลดเงื่อนไขครบก่อน
// step.type: collect (เก็บชิ้นส่วน) | decode (ให้ NPC ถอดอักขระ) | condition (เงื่อนไขร่างกาย)

export const MANUALS = {
  manual_nine_yang: {
    id: 'manual_nine_yang',
    name: 'คัมภีร์เก้าหยาง',
    skillId: 'neigong_nine_yang',
    alignment: 'neutral',
    desc: 'ตำนานวิชาภายในไร้สำนัก เล่าว่าซ่อนหลังเขาเส้าหลิน คัมภีร์ขาดเป็นสามท่อน',
    steps: [
      { type: 'collect', item: 'fragment', count: 3,
        desc: 'ตามเก็บชิ้นส่วนคัมภีร์ที่กระจัดกระจายในยุทธภพ (เรืองแสงสีทอง) ให้ครบ 3 ชิ้น' },
      { type: 'decode', npc: 'old_monk',
        desc: 'นำคัมภีร์ที่รวบรวมได้ไปให้ "พระชรา" ถอดอักขระโบราณ' },
      { type: 'condition', stat: 'neigong', value: 60,
        desc: 'ฝึกพลังภายในให้ถึงขั้น 60 จึงจะทนปราณหยางอันรุนแรงได้' },
    ],
    reward: { unlockSkill: 'neigong_nine_yang' },
  },
};
