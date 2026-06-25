// สำนักวิทยายุทธ์
// เข้าได้ทีละสำนัก, มีคะแนนคุณงาม (contribution) + ลำดับชั้น (rank) ปลดคลังวิชาที่ลึกขึ้น

export const SECTS = {
  wudang: {
    id: 'wudang', name: 'สำนักบู๊ตึ้ง', alignment: 'righteous',
    color: 0x6fb1ff,
    desc: 'สำนักสายธรรมบนเขาบูรพา เด่นกระบี่และลมปราณนุ่มนวล',
    rivalSects: ['blood_cult'],
    join: { reputation: 0, fee: 0 }, // ทดลองเล่น: เข้าได้ฟรี
    ranks: [
      { name: 'ศิษย์นอก', need: 0 },
      { name: 'ศิษย์ใน', need: 200 },
      { name: 'ศิษย์เอก', need: 700 },
      { name: 'ผู้สืบทอด', need: 1800 },
    ],
    library: [
      { skill: 'neigong_pure', minRank: 0 },
      { skill: 'cloud_step', minRank: 1 },
      { skill: 'sword_taichi', minRank: 1 },
    ],
  },
  shaolin: {
    id: 'shaolin', name: 'วิหารเส้าหลิน', alignment: 'righteous',
    color: 0xffc46f,
    desc: 'สำนักสายธรรม เด่นฝ่ามือหนักและกายอันแกร่ง',
    rivalSects: ['blood_cult'],
    join: { reputation: 0, fee: 0 },
    ranks: [
      { name: 'ศิษย์นอก', need: 0 },
      { name: 'ศิษย์ใน', need: 200 },
      { name: 'อาจารย์', need: 800 },
    ],
    library: [
      { skill: 'neigong_iron', minRank: 0 },
      { skill: 'palm_shaolin', minRank: 1 },
    ],
  },
  blood_cult: {
    id: 'blood_cult', name: 'ลัทธิเลือดบูชา', alignment: 'demonic',
    color: 0xff5b6e,
    desc: 'สำนักสายมาร วิชาดูดเลือดทรงพลัง แต่เป็นที่รังเกียจของยุทธภพ',
    rivalSects: ['wudang', 'shaolin'],
    join: { reputation: -999, fee: 0 }, // ใครก็เข้าได้ แต่กลายเป็นสายมาร
    moralityOnJoin: -30,
    ranks: [
      { name: 'สาวก', need: 0 },
      { name: 'ทูตเลือด', need: 250 },
      { name: 'เจ้าลัทธิรอง', need: 900 },
    ],
    library: [
      { skill: 'palm_blood', minRank: 0 },
    ],
  },
};
