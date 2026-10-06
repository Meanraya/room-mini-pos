'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { baht, bangkokDayStart, thaiDateTime } from '../../../lib/format';
import { AlertIcon, RefreshIcon } from '../../../components/Icons';

const RANGES = [
  { key: 'today', label: 'วันนี้', since: () => bangkokDayStart(0) },
  { key: '7d', label: '7 วัน', since: () => bangkokDayStart(6) },
  { key: '30d', label: '30 วัน', since: () => bangkokDayStart(29) },
  { key: 'all', label: 'ทั้งหมด', since: () => null },
];
const CHANNELS = [{ key: 'all', label: 'ทุกช่องทาง' }, { key: 'pos', label: 'หน้าร้าน' }, { key: 'online', label: 'ออนไลน์' }];
const LIMIT = 500;

export default function HistoryPage() {
  const [range, setRange] = useState('today');
  const [channel, setChannel] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    let q = supabase.from('sales').select('id, product_name, quantity, total_price, sold_at, channel, bill_no').order('sold_at', { ascending: false }).limit(LIMIT);
    const since = RANGES.find((r) => r.key === range).since();
    if (since) q = q.gte('sold_at', since);
    if (channel !== 'all') q = q.eq('channel', channel);
    const { data, error: e } = await q;
    if (e) setError('โหลดประวัติไม่สำเร็จ: ' + e.message);
    else setRows(data || []);
    setLoading(false);
  }, [range, channel]);

  useEffect(() => { load(); }, [load]);

  const total = rows.reduce((s, r) => s + Number(r.total_price), 0);
  const qty = rows.reduce((s, r) => s + Number(r.quantity), 0);

  return (
    <main className="adm-page">
      <div className="adm-head">
        <div><h1>ประวัติการขาย</h1><p>รวมการขายหน้าร้านและออนไลน์ (ออเดอร์ที่ยกเลิกจะไม่นับ)</p></div>
        <button type="button" className="btn btn-sm btn-outline" onClick={load} disabled={loading}><RefreshIcon /> รีเฟรช</button>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div role="group" aria-label="ช่วงเวลา" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {RANGES.map((r) => <button key={r.key} type="button" className="chip" aria-pressed={range === r.key} onClick={() => setRange(r.key)}>{r.label}</button>)}
        </div>
        <div role="group" aria-label="ช่องทาง" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CHANNELS.map((c) => <button key={c.key} type="button" className="chip" aria-pressed={channel === c.key} onClick={() => setChannel(c.key)}>{c.label}</button>)}
        </div>
      </div>
      <div className="stat-grid">
        <div className="stat stat-dark"><span className="stat-label">ยอดขายรวม</span><span className="stat-value">{baht(total)}</span><span className="stat-note">{rows.length} รายการ</span></div>
        <div className="stat"><span className="stat-label">จำนวนชิ้นที่ขาย</span><span className="stat-value">{qty.toLocaleString('th-TH')}</span><span className="stat-note">{RANGES.find((r) => r.key === range).label}</span></div>
      </div>
      {error && <div className="alert alert-error" role="alert"><AlertIcon />{error}</div>}
      <section className="panel">
        {loading ? <div className="skeleton" style={{ height: 240, borderRadius: 12 }} /> : rows.length === 0 ? (
          <div className="empty-state"><p>ไม่มีการขายในช่วงนี้</p></div>
        ) : (
          <div className="table-box">
            <table className="tbl">
              <thead><tr><th>วันเวลา</th><th>สินค้า</th><th>ช่องทาง</th><th>บิล</th><th className="num">จำนวน</th><th className="num">ยอด</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{thaiDateTime(r.sold_at)}</td>
                    <td>{r.product_name}</td>
                    <td><span className={`pill ${r.channel === 'online' ? 'pill-online' : 'pill-pos'}`}>{r.channel === 'online' ? 'ออนไลน์' : 'หน้าร้าน'}</span></td>
                    <td className="muted" style={{ fontSize: 13 }}>{r.bill_no || '–'}</td>
                    <td className="num">{r.quantity}</td>
                    <td className="num">{baht(r.total_price, { decimals: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length >= LIMIT && <p className="hint" style={{ marginTop: 10 }}>แสดง {LIMIT} รายการล่าสุด เลือกช่วงเวลาที่สั้นลงเพื่อดูยอดที่ครบถ้วน</p>}
      </section>
    </main>
  );
}
