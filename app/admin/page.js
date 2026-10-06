'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { baht, bangkokDayStart, minutesAgo, thaiDateTime } from '../../lib/format';
import { useCountUp } from '../../components/useCountUp';
import { AlertIcon, RefreshIcon } from '../../components/Icons';

function Money({ value }) {
  const v = useCountUp(value);
  return <>{baht(Math.round(v))}</>;
}
function Count({ value }) {
  const v = useCountUp(value);
  return <>{Math.round(v)}</>;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const since = bangkokDayStart(0);
    const [salesRes, ordersRes, lowRes, recentRes] = await Promise.all([
      supabase.from('sales').select('total_price, channel, bill_no').gte('sold_at', since),
      supabase.from('orders').select('id, created_at').eq('status', 'new').order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, stock, unit').lte('stock', 5).order('stock', { ascending: true }).limit(8),
      supabase.from('sales').select('id, product_name, quantity, total_price, channel, sold_at').order('sold_at', { ascending: false }).limit(8),
    ]);
    const err = salesRes.error || ordersRes.error || lowRes.error || recentRes.error;
    if (err) {
      setError('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
      setLoading(false);
      return;
    }
    const sales = salesRes.data || [];
    const sum = (ch) => sales.filter((s) => !ch || s.channel === ch).reduce((t, s) => t + Number(s.total_price), 0);
    const bills = new Set(sales.filter((s) => s.channel === 'pos').map((s) => s.bill_no || s.id));
    setData({
      total: sum(), pos: sum('pos'), online: sum('online'), bills: bills.size,
      newOrders: ordersRes.data || [], low: lowRes.data || [], recent: recentRes.data || [],
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="adm-page">
      <div className="adm-head">
        <div>
          <h1>ภาพรวมวันนี้</h1>
          <p>{new Date().toLocaleDateString('th-TH', { dateStyle: 'full' })}</p>
        </div>
        <button type="button" className="btn btn-sm btn-outline" onClick={load} disabled={loading}><RefreshIcon /> รีเฟรช</button>
      </div>

      {error && <div className="alert alert-error" role="alert"><AlertIcon />{error}</div>}

      <div className="stat-grid stagger">
        <div className="stat stat-dark">
          <span className="stat-label">ยอดขายวันนี้</span>
          <span className="stat-value">{data ? <Money value={data.total} /> : '–'}</span>
          <span className="stat-note">หน้าร้าน {data ? baht(data.pos) : '–'} · ออนไลน์ {data ? baht(data.online) : '–'}</span>
        </div>
        <div className="stat">
          <span className="stat-label">บิลหน้าร้าน</span>
          <span className="stat-value">{data ? <Count value={data.bills} /> : '–'}</span>
          <span className="stat-note">{data && data.bills ? `เฉลี่ย ${baht(data.pos / data.bills)} ต่อบิล` : 'ยังไม่มีบิลวันนี้'}</span>
        </div>
        <Link href="/admin/orders" className="stat" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="stat-label">ออเดอร์ออนไลน์รอยืนยัน</span>
          <span className="stat-value" style={{ color: data && data.newOrders.length ? 'var(--clay)' : undefined }}>{data ? <Count value={data.newOrders.length} /> : '–'}</span>
          <span className="stat-note">{data && data.newOrders[0] ? `ล่าสุด ${minutesAgo(data.newOrders[0].created_at)}` : 'ไม่มีออเดอร์ค้าง'}</span>
        </Link>
        <Link href="/admin/products" className="stat" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="stat-label">สต็อกใกล้หมด (≤ 5)</span>
          <span className="stat-value">{data ? <Count value={data.low.length} /> : '–'}</span>
          <span className="stat-note">{data && data.low.length ? data.low.slice(0, 2).map((p) => p.name).join(', ') : 'สต็อกปกติทุกรายการ'}</span>
        </Link>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <section className="panel" style={{ flex: '999 1 480px', minWidth: 0 }}>
          <h2 style={{ marginBottom: 12 }}>การขายล่าสุด</h2>
          {loading && !data ? <div className="skeleton" style={{ height: 200, borderRadius: 12 }} /> : data && data.recent.length === 0 ? (
            <p className="muted">ยังไม่มีการขาย <Link href="/admin/pos">เริ่มขายหน้าร้าน</Link></p>
          ) : data && (
            <div className="table-box">
              <table className="tbl">
                <thead><tr><th>เวลา</th><th>สินค้า</th><th>ช่องทาง</th><th className="num">จำนวน</th><th className="num">ยอด</th></tr></thead>
                <tbody>
                  {data.recent.map((s) => (
                    <tr key={s.id}>
                      <td className="muted">{thaiDateTime(s.sold_at)}</td>
                      <td>{s.product_name}</td>
                      <td><span className={`pill ${s.channel === 'online' ? 'pill-online' : 'pill-pos'}`}>{s.channel === 'online' ? 'ออนไลน์' : 'หน้าร้าน'}</span></td>
                      <td className="num">{s.quantity}</td>
                      <td className="num">{baht(s.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="panel" style={{ flex: '1 1 300px' }}>
          <h2 style={{ marginBottom: 12 }}>ต้องเติมสต็อก</h2>
          {data && data.low.length === 0 && <p className="muted">ไม่มีสินค้าใกล้หมด</p>}
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column' }}>
            {data && data.low.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <span>{p.name}</span>
                <b style={{ color: p.stock <= 0 ? 'var(--clay)' : 'var(--ink)' }}>{p.stock <= 0 ? 'หมด' : `${p.stock} ${p.unit || ''}`}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
