export const MOODS = [
  { key: 'fresh', label: 'Fresh', th: 'สดชื่น', color: '#a9d4c1', text: 'ปลุกพลังความสดใสให้ห้องโปร่งโล่งสบาย สลัดความง่วงพร้อมเริ่มวันใหม่อย่างกระปรี้กระเปร่า' },
  { key: 'relax', label: 'Relax', th: 'ผ่อนคลาย หลับสบาย', color: '#bfb0dd', text: 'เติมความสงบ คลายความล้า เปลี่ยนห้องนอนให้นุ่มนวล ชวนทิ้งตัวหลับลึกตลอดคืน' },
  { key: 'focus', label: 'Focus', th: 'มีสมาธิ ช่วยอ่านหนังสือ', color: '#a9bccb', text: 'เคลียร์สมองให้ปลอดโปร่ง ลดความวอกแวก ให้คุณพร้อมอ่านหนังสือและปั่นเดดไลน์ได้อย่างลื่นไหล' },
  { key: 'romance', label: 'Romance', th: 'โรแมนติก ช่วงเวลาพิเศษ', color: '#f0c3ae', text: 'สร้างบรรยากาศอบอุ่น ละมุนหัวใจ เติมโมเมนต์พิเศษให้มีความหมาย' },
];

export const MOOD_COLOR = Object.fromEntries(MOODS.map((m) => [m.key, m.color]));

export const PRODUCT_IMAGES = [
  { value: '/images/fresh.jpg', label: 'Fresh' },
  { value: '/images/relax.jpg', label: 'Relax' },
  { value: '/images/focus.jpg', label: 'Focus' },
  { value: '/images/romance.jpg', label: 'Romance' },
  { value: '/images/candle-relax.jpg', label: 'เทียนหอม Relax' },
  { value: '/images/candle-romance.jpg', label: 'เทียนหอม Romance' },
  { value: '/images/hero.jpg', label: 'รวม 4 กลิ่น' },
];

const CANDLE_IMAGES = { relax: '/images/candle-relax.jpg', romance: '/images/candle-romance.jpg' };

export function productImage(p) {
  if (p && p.image_url) return p.image_url;
  if (p && p.type === 'candle' && CANDLE_IMAGES[p.mood]) return CANDLE_IMAGES[p.mood];
  if (p && p.mood) return `/images/${p.mood}.jpg`;
  return '/images/hero.jpg';
}

export function productMeta(p) {
  if (!p) return '';
  if (p.type === 'candle') return 'เทียนหอม';
  return ['สเปรย์', p.size].filter(Boolean).join(' · ');
}
