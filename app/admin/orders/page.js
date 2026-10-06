'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { baht, friendlyError, minutesAgo, thaiDateTime } from '../../../lib/format';
import { AlertIcon, CheckIcon, RefreshIcon } from '../../../components/Icons';

const TABS = [
  { key: 'new', label: 'รอยืนยัน' },
  { key: 'confirmed', label: 'ยืนยันแล้ว' },
  { key: 'shipped', label: 'จัดส่งแล้ว' },
  { key: 'cancelled', label: 'ยกเลิก' },
];
const NEXT = { new: { status: 'confirmed', label: 'ยืนยันออเดอร์' }, confirmed: { status: 'shipped', label: 'จัดส่งแล้ว' } };
const PILL = { new: 'pill-new', confirmed: 'pill-confirmed', shipped: 'pill-shipped', cancelled: 'pill-cancelled' };
const LABEL = Object.fromEntries(TABS.map((t) => [t.key, t.label]));

export default function OrdersPage() {
  const [tab, setTab] = useState('new');
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async (which) => {
    const [list, all] = await Promise.all([
      supabase.from('orders').select('*').eq('status', which).order('created_at', { ascending: which === 'new' }).limit(100),
      supabase.from('orders').select('status'),
    ]);
    if (list.error) setError('โหลดออเดอร์ไม่สำเร็จ: ' + list.error.message);
    else { setOrders(list.data || []); setError((e) => (e.startsWith('โหลด') ? '' : e)); }
    if (!all.error) {
      const c = {};
      (all.data || []).forEach((o) => { c[o.status] = (c[o.status] || 0) + 1; });
      setCounts(c);
    }
    setLoading(false);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    setLoading(true);
    load(tab);
    const t = setInterval(() => load(tab), 15000);
    return () => clearInterval(t);
  }, [tab, load]);

  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(''), 3500);
    return () => clearTimeout(t);
  }, [msg]);

  useEffect(() => {
    if (!cancelTarget) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busyId) setCancelTarget(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancelTarget, busyId]);

  const setStatus = async (order, status) => {
    if (busyId) return;
    setBusyId(order.id);
    setError('');
    const { error: e } = await supabase.rpc('set_order_status', { p_order_id: order.id, p_status: status });
    setBusyId(null);
    setCancelTarget(null);
    if (e) { setError(friendlyError(e)); load(tab); return; }
    setMsg(status === 'cancelled' ? `ยกเลิก ${order.order_no} และคืนสต็อกแล้ว` : `${order.order_no} → ${LABEL[status]}`);
    window.dispatchEvent(new Event('orders-changed'));
    load(tab);
  };

  return (
    <main className="adm-page">
      <div className="adm-head">
        <div>
          <h1>ออเดอร์ออนไลน์</h1>
          <p>คำสั่งซื้อจากหน้าร้านออนไลน์ · อัปเดตอัตโนมัติทุก 15 วินาที</p>
        </div>
        <button type="button" className="btn btn-sm btn-outline" onClick={() => load(tab)}><RefreshIcon /> รีเฟรช</button>
      </div>

      <div role="tablist" aria-label="สถานะออเดอร์" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className="chip" aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}{counts[t.key] ? ` ${counts[t.key]}` : ''}
          </button>
        ))}
      </div>

      <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msg && <div className="alert alert-success" role="status"><CheckIcon size={18} />{msg}</div>}
        {error && <div className="alert alert-error" role="alert"><AlertIcon />{error}</div>}
      </div>

      {loading ? (
        <div className="order-grid">{[0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 260, borderRadius: 14 }} />)}</div>
      ) : orders.length === 0 ? (
        <div className="panel empty-state"><p>ไม่มีออเดอร์ในสถานะ “{LABEL[tab]}”</p></div>
      ) : (
        <div className="order-grid">
          {orders.map((o, i) => {
            const fresh = o.status === 'new' && now - new Date(o.created_at).getTime() < 10 * 60000;
            const items = Array.isArray(o.items) ? o.items : [];
            const next = NEXT[o.status];
            return (
              <article key={o.id} className={`order-card ${fresh ? 'is-new' : ''}`} style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <b>{o.order_no}</b>
                  <span className={`pill ${PILL[o.status]}`}>{LABEL[o.status]} · {minutesAgo(o.created_at, now)}</span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                  <b>{o.customer_name}</b> · {o.contact}
                  {o.note && <div className="muted" style={{ whiteSpace: 'pre-line' }}>{o.note}</div>}
                </div>
                <div className="order-items">
                  {items.map((it, idx) => (
                    <span key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{it.name} × {it.qty}</span><span>{baht(it.total)}</span></span>
                  ))}
                </div>
                <div className="total-row"><span className="muted" style={{ fontSize: 14 }}>ยอดรวม</span><span style={{ fontSize: 22, fontWeight: 700 }}>{baht(o.total)}</span></div>
                <span className="hint">สั่งเมื่อ {thaiDateTime(o.created_at)}</span>
                {o.status !== 'cancelled' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {next && (
                      <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={!!busyId} onClick={() => setStatus(o, next.status)}>
                        {busyId === o.id && <span className="spinner" />}{next.label}
                      </button>
                    )}
                    {o.status !== 'shipped' && (
                      <button type="button" className="btn btn-danger" disabled={!!busyId} onClick={() => setCancelTarget(o)}>ยกเลิก</button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {cancelTarget && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget && !busyId) setCancelTarget(null); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
            <h2 id="cancel-title" style={{ color: 'var(--clay)' }}>ยกเลิก {cancelTarget.order_no}?</h2>
            <p>สินค้าในออเดอร์นี้จะถูกคืนเข้าสต็อก และยอดขายของออเดอร์นี้จะถูกลบออกจากประวัติ ยกเลิกแล้วย้อนกลับไม่ได้</p>
            <div className="dialog-actions">
              <button type="button" className="btn btn-danger-solid btn-lg" disabled={!!busyId} onClick={() => setStatus(cancelTarget, 'cancelled')}>{busyId && <span className="spinner" />}ยืนยันยกเลิก</button>
              <button type="button" className="btn btn-outline" disabled={!!busyId} onClick={() => setCancelTarget(null)}>ไม่ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
