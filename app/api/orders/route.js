import { NextResponse } from 'next/server';
import { serverSupabase } from '../../../lib/supabaseServer';
import { onlineOrderMessage, pushLine } from '../../../lib/line';
import { friendlyError } from '../../../lib/format';

// กันยิงซ้ำจากเครื่องเดียวกัน (ทำงานภายใน instance เดียว เป็นด่านแรกก่อนถึงฐานข้อมูล)
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 5;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  // honeypot: บอทกรอกช่องที่ซ่อนไว้ -> ตอบเหมือนสำเร็จแต่ไม่บันทึก
  if (body && body.website) return NextResponse.json({ order_no: 'RS-0000', total: 0 });

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
  if (limited(ip)) return NextResponse.json({ error: 'ส่งคำสั่งซื้อถี่เกินไป กรุณารอสักครู่' }, { status: 429 });

  const items = Array.isArray(body && body.items)
    ? body.items.map((i) => ({ product_id: String(i.product_id || ''), qty: Number.parseInt(i.qty, 10) }))
    : [];
  if (items.length === 0 || items.length > 20 || items.some((i) => !i.product_id || !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 20)) {
    return NextResponse.json({ error: 'รายการสินค้าไม่ถูกต้อง' }, { status: 400 });
  }

  const supabase = serverSupabase();
  if (!supabase) return NextResponse.json({ error: 'ระบบยังไม่ได้ตั้งค่า Supabase' }, { status: 500 });

  const { data, error } = await supabase.rpc('place_online_order', {
    p_name: String(body.name || ''),
    p_contact: String(body.contact || ''),
    p_note: String(body.note || ''),
    p_items: items,
  });
  if (error) return NextResponse.json({ error: friendlyError(error) }, { status: 400 });

  // แจ้งเตือน LINE (ถ้าส่งไม่สำเร็จ ออเดอร์ยังถูกบันทึกแล้ว)
  await pushLine(onlineOrderMessage(data));

  return NextResponse.json({ order_no: data.order_no, total: data.total }, { status: 201 });
}
