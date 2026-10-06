export function baht(n, { decimals = false } = {}) {
  const v = Number(n) || 0;
  return '฿' + v.toLocaleString('th-TH', decimals ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 2 });
}

export function thaiDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

export function minutesAgo(iso, now = Date.now()) {
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'เมื่อสักครู่';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
}

// แปลง error จากฟังก์ชันในฐานข้อมูลเป็นข้อความภาษาไทย
export function friendlyError(err) {
  const msg = (err && (err.message || err.error || String(err))) || '';
  if (msg.startsWith('insufficient_stock:')) return `สินค้า "${msg.split(':').slice(1).join(':')}" มีไม่พอในสต็อก`;
  const map = {
    not_authorized: 'กรุณาเข้าสู่ระบบใหม่',
    'permission denied': 'กรุณาเข้าสู่ระบบใหม่',
    JWT: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    invalid_items: 'รายการสินค้าไม่ถูกต้อง',
    invalid_qty: 'จำนวนสินค้าไม่ถูกต้อง',
    product_not_found: 'มีสินค้าบางรายการไม่พร้อมขายแล้ว กรุณาตรวจตะกร้าใหม่',
    invalid_name: 'กรุณากรอกชื่อ (2-100 ตัวอักษร)',
    invalid_contact: 'กรุณากรอกเบอร์โทรหรือ LINE ID',
    invalid_note: 'หมายเหตุยาวเกินไป',
    too_many_orders: 'มีคำสั่งซื้อจำนวนมากในขณะนี้ กรุณาลองใหม่ในอีกสักครู่',
    order_already_cancelled: 'ออเดอร์นี้ถูกยกเลิกไปแล้ว',
    order_not_found: 'ไม่พบออเดอร์นี้',
    'invalid input syntax for type uuid': 'มีสินค้าบางรายการไม่พร้อมขายแล้ว กรุณาตรวจตะกร้าใหม่',
  };
  for (const k of Object.keys(map)) if (msg.includes(k)) return map[k];
  return msg || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}

// เวลาเริ่มต้นของวัน (เวลาไทย UTC+7) ย้อนหลัง n วัน คืนค่าเป็น ISO string
export function bangkokDayStart(daysAgo = 0) {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo) - 7 * 3600 * 1000;
  return new Date(start).toISOString();
}
