import { NextResponse } from 'next/server';
import { serverSupabase } from '../../../../lib/supabaseServer';
import { posSaleMessage, pushLine } from '../../../../lib/line';
import { friendlyError } from '../../../../lib/format';

// ขายหน้าร้าน: ต้องเป็นพนักงานที่ล็อกอินแล้ว (ฟังก์ชันในฐานข้อมูลตรวจ auth.uid() อีกชั้น)
export async function POST(request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }
  const items = Array.isArray(body && body.items)
    ? body.items.map((i) => ({ product_id: String(i.product_id || ''), qty: Number.parseInt(i.qty, 10) }))
    : [];
  if (items.length === 0 || items.length > 50 || items.some((i) => !i.product_id || !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 999)) {
    return NextResponse.json({ error: 'รายการสินค้าไม่ถูกต้อง' }, { status: 400 });
  }

  const supabase = serverSupabase(token);
  if (!supabase) return NextResponse.json({ error: 'ระบบยังไม่ได้ตั้งค่า Supabase' }, { status: 500 });

  const { data, error } = await supabase.rpc('pos_checkout', { p_items: items });
  if (error) {
    const status = /not_authorized|permission denied|JWT/i.test(error.message || '') ? 401 : 400;
    return NextResponse.json({ error: friendlyError(error) }, { status });
  }

  const line = await pushLine(posSaleMessage(data));
  return NextResponse.json({ ...data, line: line.ok ? 'sent' : line.skipped ? 'not_configured' : 'failed' });
}
