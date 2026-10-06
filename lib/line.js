import 'server-only';

// LINE Messaging API รับได้สูงสุด 5 ข้อความต่อครั้ง และข้อความละไม่เกิน 5,000 ตัวอักษร
// เดิมส่งทีละข้อความต่อสินค้า ถ้าบิลมีหลายรายการจะเกิน 5 แล้ว LINE ปฏิเสธทั้งชุด -> รวมเป็นข้อความเดียว
const MAX_TEXT = 4900;

export async function pushLine(text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_USER_ID;
  if (!token || !to) return { skipped: true, reason: 'LINE ยังไม่ได้ตั้งค่า' };
  const body = String(text).length > MAX_TEXT ? String(text).slice(0, MAX_TEXT) + '\n…' : String(text);
  try {
    const base = process.env.LINE_API_BASE || 'https://api.line.me';
    const res = await fetch(`${base}/v2/bot/message/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, messages: [{ type: 'text', text: body }] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('LINE push failed', res.status, detail);
      return { ok: false, status: res.status };
    }
    return { ok: true };
  } catch (e) {
    console.error('LINE push error', e);
    return { ok: false, error: e.message };
  }
}

const LOW_STOCK = 5;

function thaiTime() {
  return new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' });
}

function baht(n) {
  return '฿' + Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

function lowStockLines(lines) {
  const low = lines.filter((l) => Number(l.remaining) <= LOW_STOCK);
  if (!low.length) return '';
  return '\n\n🚨 สต็อกใกล้หมด\n' + low.map((l) => `- ${l.name}: เหลือ ${l.remaining} ${l.unit || ''}`.trim()).join('\n');
}

export function posSaleMessage(result) {
  const lines = result.lines || [];
  return (
    `🛒 ขายหน้าร้าน ${result.bill_no}\n` +
    lines.map((l) => `- ${l.name} × ${l.qty} = ${baht(l.total)}`).join('\n') +
    `\nรวม ${baht(result.total)}\nเวลา ${thaiTime()}` +
    lowStockLines(lines)
  );
}

export function onlineOrderMessage(result) {
  const lines = result.lines || [];
  return (
    `🌸 ออเดอร์ออนไลน์ใหม่ ${result.order_no}\n` +
    `ลูกค้า: ${result.customer_name}\nติดต่อ: ${result.contact}\n` +
    (result.note ? `หมายเหตุ: ${result.note}\n` : '') +
    lines.map((l) => `- ${l.name} × ${l.qty} = ${baht(l.total)}`).join('\n') +
    `\nรวม ${baht(result.total)}\nเวลา ${thaiTime()}` +
    lowStockLines(lines)
  );
}
