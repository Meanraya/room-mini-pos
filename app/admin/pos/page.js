'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { MOODS, MOOD_COLOR } from '../../../lib/moods';
import { baht, friendlyError } from '../../../lib/format';
import { useCountUp } from '../../../components/useCountUp';
import { AlertIcon, BagIcon, CheckIcon, SearchIcon } from '../../../components/Icons';

const CHIPS = [{ key: 'all', label: 'ทั้งหมด' }, ...MOODS, { key: 'other', label: 'อื่นๆ' }];

export default function PosPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState('all');
  const [cart, setCart] = useState({}); // { [id]: qty }
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const searchRef = useRef(null);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('products').select('id, sku, name, price, stock, unit, mood').order('name', { ascending: true });
    if (e) setError('โหลดสินค้าไม่สำเร็จ: ' + e.message);
    else setProducts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // หลังโหลดสต็อกใหม่ ปรับจำนวนในบิลไม่ให้เกินของที่มีจริง (เช่น อีกเครื่องขายไปแล้ว)
  useEffect(() => {
    setCart((prev) => {
      let changed = false;
      const next = {};
      for (const [id, q] of Object.entries(prev)) {
        const p = products.find((x) => x.id === id);
        const max = p ? Number(p.stock) : 0;
        const v = Math.min(q, max);
        if (v !== q) changed = true;
        if (v > 0) next[id] = v;
      }
      return changed ? next : prev;
    });
  }, [products]);

  useEffect(() => {
    if (!confirming && !receipt) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' || busy) return;
      setConfirming(false);
      setReceipt(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirming, receipt, busy]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const term = search.trim().toLowerCase();
  const shown = products.filter((p) => {
    if (chip === 'other' ? p.mood : chip !== 'all' && p.mood !== chip) return false;
    return !term || (p.name || '').toLowerCase().includes(term) || (p.sku || '').toLowerCase().includes(term);
  });

  const lines = Object.entries(cart).map(([id, qty]) => ({ p: byId.get(id), qty })).filter((l) => l.p);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + Number(l.p.price) * l.qty, 0);
  const shownTotal = useCountUp(total, 350);

  const setQty = (id, q) => {
    setError('');
    const p = byId.get(id);
    setCart((prev) => {
      const next = { ...prev };
      if (q <= 0) delete next[id];
      else next[id] = Math.min(Number(p.stock), q);
      return next;
    });
  };

  const addFromSearch = (e) => {
    // กด Enter ในช่องค้นหา (เช่นยิงบาร์โค้ด SKU) -> ใส่สินค้าที่ SKU ตรงลงบิล
    e.preventDefault();
    const exact = products.find((p) => (p.sku || '').toLowerCase() === term) || (shown.length === 1 ? shown[0] : null);
    if (exact && Number(exact.stock) > 0) {
      setQty(exact.id, (cart[exact.id] || 0) + 1);
      setSearch('');
    }
  };

  const pay = async () => {
    if (busy || lines.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session ? s.session.access_token : ''}` },
        body: JSON.stringify({ items: lines.map((l) => ({ product_id: l.p.id, qty: l.qty })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'บันทึกการขายไม่สำเร็จ');
      setConfirming(false);
      setReceipt(data);
      setCart({});
      load();
    } catch (err) {
      setConfirming(false);
      setError(friendlyError(err));
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="adm-page">
      <div className="pos">
        <section className="pos-catalog panel">
          <div className="pos-toolbar">
            <form onSubmit={addFromSearch} style={{ flex: '1 1 240px', position: 'relative' }}>
              <label htmlFor="pos-search" className="sr-only">ค้นหาสินค้า</label>
              <span style={{ position: 'absolute', left: 14, top: 15, color: 'var(--ink-soft)' }}><SearchIcon /></span>
              <input id="pos-search" ref={searchRef} type="search" className="input" style={{ paddingLeft: 42 }}
                placeholder="ค้นหาชื่อ หรือพิมพ์ SKU แล้วกด Enter" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
            </form>
            <div role="group" aria-label="กรองตามมู้ด" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CHIPS.map((c) => (
                <button key={c.key} type="button" className="chip" aria-pressed={chip === c.key} onClick={() => setChip(c.key)}>
                  {MOOD_COLOR[c.key] && <span className="dot" style={{ width: 9, height: 9, background: MOOD_COLOR[c.key] }} />}{c.label}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="alert alert-error" role="alert"><AlertIcon />{error}</div>}
          {loading ? (
            <div className="pos-grid">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 14 }} />)}</div>
          ) : shown.length === 0 ? (
            <div className="empty-state"><p>{products.length === 0 ? 'ยังไม่มีสินค้า เพิ่มได้ที่เมนู "สินค้า"' : 'ไม่พบสินค้าที่ค้นหา'}</p></div>
          ) : (
            <div key={chip} className="pos-grid stagger">
              {shown.map((p) => {
                const out = Number(p.stock) <= 0;
                const inCart = cart[p.id] || 0;
                const atMax = inCart >= Number(p.stock);
                return (
                  <button key={p.id} type="button" className={`pos-item ${inCart ? 'in-cart' : ''}`} disabled={out || atMax}
                    onClick={() => setQty(p.id, inCart + 1)} aria-label={`เพิ่ม ${p.name} ราคา ${p.price} บาท`}>
                    <span className="pos-item-bar" style={{ background: MOOD_COLOR[p.mood] || 'var(--line)' }} />
                    <span className="muted" style={{ fontSize: 12 }}>{p.sku}</span>
                    <span className="pos-item-name">{p.name}</span>
                    <span className="pos-item-foot">
                      <span className="pos-price">{baht(p.price)}</span>
                      <span style={{ fontSize: 12, color: out || Number(p.stock) <= 5 ? 'var(--clay)' : 'var(--ink-soft)' }}>
                        {out ? 'หมด' : `เหลือ ${p.stock}`}{inCart ? ` · ในบิล ${inCart}` : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="pos-bill" aria-label="บิลปัจจุบัน">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>บิลปัจจุบัน</h2>
            <button type="button" onClick={() => setCart({})} disabled={lines.length === 0 || busy}
              style={{ minHeight: 36, padding: '0 12px', borderRadius: 999, border: '1px solid rgba(253,251,248,0.3)', background: 'transparent', color: 'var(--sand)', fontSize: 13, cursor: 'pointer', opacity: lines.length ? 1 : 0.4 }}>
              ล้างบิล
            </button>
          </div>
          <div className="pos-bill-lines">
            {lines.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--bronze-mist)', textAlign: 'center', padding: '32px 0' }}>
                <BagIcon size={40} w={1.3} />แตะสินค้าทางซ้ายเพื่อเริ่มขาย
              </div>
            ) : lines.map(({ p, qty }) => (
              <div key={p.id} className="pos-line">
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--bronze-mist)' }}>{baht(p.price)} × {qty}</span>
                </div>
                <div className="pos-qty">
                  <button type="button" onClick={() => setQty(p.id, qty - 1)} aria-label={`ลด ${p.name}`} disabled={busy}>−</button>
                  <b key={qty} className="pop" style={{ minWidth: 20, textAlign: 'center', display: 'inline-block' }}>{qty}</b>
                  <button type="button" className="plus" onClick={() => setQty(p.id, qty + 1)} aria-label={`เพิ่ม ${p.name}`} disabled={busy || qty >= Number(p.stock)}>+</button>
                </div>
                <span style={{ minWidth: 70, textAlign: 'right', fontWeight: 600 }}>{baht(Number(p.price) * qty)}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(253,251,248,0.2)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--sand)' }}><span>จำนวน</span><span>{count} ชิ้น · {lines.length} รายการ</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}><span>ยอดชำระ</span><span className="pos-total">{baht(Math.round(shownTotal * 100) / 100)}</span></div>
          </div>
          <button type="button" className="pos-pay" onClick={() => setConfirming(true)} disabled={lines.length === 0 || busy}>ชำระเงิน</button>
        </aside>
      </div>

      {confirming && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) setConfirming(false); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="pay-title">
            <h2 id="pay-title">ยืนยันรับชำระ</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, background: 'var(--cream)', borderRadius: 12, padding: '12px 14px', maxHeight: 220, overflowY: 'auto' }}>
              {lines.map(({ p, qty }) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span>{p.name} × {qty}</span><b>{baht(Number(p.price) * qty)}</b></div>
              ))}
            </div>
            <div className="total-row"><span>ยอดรวม</span><span className="total-amount">{baht(total)}</span></div>
            <div className="dialog-actions">
              <button type="button" className="btn btn-primary btn-lg" onClick={pay} disabled={busy}>{busy && <span className="spinner" />}{busy ? 'กำลังบันทึก...' : 'รับเงินแล้ว บันทึกการขาย'}</button>
              <button type="button" className="btn btn-outline" onClick={() => setConfirming(false)} disabled={busy}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setReceipt(null); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="ok-title" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div className="thanks-icon" style={{ width: 72, height: 72 }}><CheckIcon size={34} /></div>
            <h2 id="ok-title">บันทึกการขายแล้ว</h2>
            <p className="muted">บิล {receipt.bill_no}</p>
            <span className="total-amount">{baht(receipt.total)}</span>
            {receipt.line === 'failed' && <div className="alert alert-error" role="alert"><AlertIcon />ส่งแจ้งเตือน LINE ไม่สำเร็จ (การขายบันทึกแล้ว)</div>}
            <button type="button" className="btn btn-primary btn-lg btn-block" autoFocus onClick={() => { setReceipt(null); setTimeout(() => searchRef.current && searchRef.current.focus(), 50); }}>ขายบิลถัดไป</button>
          </div>
        </div>
      )}
    </main>
  );
}
