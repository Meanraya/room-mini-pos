'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { baht, friendlyError } from '../../../lib/format';
import { useCart } from '../../../components/CartContext';
import { AlertIcon, BackIcon } from '../../../components/Icons';

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, total, setQty, sync, clear, loaded } = useCart();
  const [form, setForm] = useState({ name: '', contact: '', note: '', website: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notices, setNotices] = useState([]);

  // ตรวจราคา/สต็อกล่าสุดก่อนให้ลูกค้ายืนยัน
  useEffect(() => {
    if (!loaded || lines.length === 0) return;
    let cancelled = false;
    supabase.from('products').select('id, name, price, stock').eq('online', true).in('id', lines.map((l) => l.id))
      .then(({ data, error: e }) => {
        if (cancelled || e || !data) return;
        const changes = sync(data);
        if (changes.length) setNotices(changes);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const nameErr = form.name.trim().length < 2 ? 'กรุณากรอกชื่อ' : '';
  const contactErr = form.contact.trim().length < 3 ? 'กรุณากรอกเบอร์โทรหรือ LINE ID' : '';

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (busy || nameErr || contactErr || lines.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, contact: form.contact, note: form.note, website: form.website,
          items: lines.map((l) => ({ product_id: l.id, qty: l.qty })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'สั่งซื้อไม่สำเร็จ');
      clear();
      router.replace(`/thank-you?no=${encodeURIComponent(data.order_no)}&total=${encodeURIComponent(data.total)}`);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  if (loaded && lines.length === 0 && !busy) {
    return (
      <div className="container checkout">
        <div className="empty-state" style={{ minHeight: '50vh', justifyContent: 'center' }}>
          <h1 className="display" style={{ fontSize: 34 }}>ตะกร้ายังว่างอยู่</h1>
          <p>เลือกกลิ่นที่ชอบก่อน แล้วกลับมาสั่งซื้อได้เลย</p>
          <Link href="/#shop" className="btn btn-primary">เลือกซื้อสินค้า</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container checkout">
      <Link href="/#shop" className="btn btn-sm btn-outline" style={{ border: 'none', paddingLeft: 0, marginBottom: 12 }}><BackIcon size={18} /> เลือกซื้อต่อ</Link>
      <h1 className="display fade-up" style={{ fontSize: 'clamp(32px, 4vw, 42px)', marginBottom: 24 }}>ยืนยันการสั่งซื้อ</h1>
      <div className="checkout-grid">
        <form className="checkout-form fade-up" onSubmit={submit} noValidate>
          <p className="muted">กรอกข้อมูลให้ครบถ้วน ทีมงานจะติดต่อกลับเพื่อยืนยันและแจ้งช่องทางชำระเงิน</p>
          <div className="field">
            <label className="label" htmlFor="name">ชื่อลูกค้า</label>
            <input id="name" className="input" autoComplete="name" placeholder="ชื่อ-นามสกุล" maxLength={100}
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              aria-invalid={touched && !!nameErr} aria-describedby="name-err" />
            {touched && nameErr && <span id="name-err" className="hint" style={{ color: 'var(--clay)' }}>{nameErr}</span>}
          </div>
          <div className="field">
            <label className="label" htmlFor="contact">เบอร์โทร / LINE ID</label>
            <input id="contact" className="input" autoComplete="tel" placeholder="08x-xxx-xxxx หรือ LINE ID" maxLength={100}
              value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}
              aria-invalid={touched && !!contactErr} aria-describedby="contact-err" />
            {touched && contactErr && <span id="contact-err" className="hint" style={{ color: 'var(--clay)' }}>{contactErr}</span>}
          </div>
          <div className="field">
            <label className="label" htmlFor="note">ที่อยู่จัดส่ง / หมายเหตุ</label>
            <textarea id="note" className="input" rows={4} maxLength={1000} placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
              value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          {/* กับดักบอท: คนจริงมองไม่เห็นช่องนี้ */}
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>
          {error && <div className="alert alert-error" role="alert"><AlertIcon />{error}</div>}
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || !loaded}>
            {busy && <span className="spinner" />}
            {busy ? 'กำลังส่งคำสั่งซื้อ...' : `ยืนยันสั่งซื้อ · ${baht(total)}`}
          </button>
        </form>

        <aside className="checkout-summary fade-up" aria-label="สรุปรายการ">
          <h2 className="display" style={{ fontSize: 26, fontWeight: 600 }}>สรุปรายการ</h2>
          {notices.length > 0 && (
            <div className="alert alert-info" role="status"><AlertIcon /><div>อัปเดตตะกร้าตามสต็อกล่าสุด: {notices.join(', ')}</div></div>
          )}
          {lines.map((l) => (
            <div className="cart-line" key={l.id} style={{ borderColor: 'var(--line)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.image} alt="" />
              <div className="cart-line-info">
                <span className="cart-line-name">{l.name}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 8 }}>
                  <div className="qty-box" style={{ background: 'var(--ground)' }}>
                    <button type="button" onClick={() => setQty(l.id, l.qty - 1)} aria-label={`ลด ${l.name}`} disabled={busy}>−</button>
                    <b>{l.qty}</b>
                    <button type="button" onClick={() => setQty(l.id, l.qty + 1)} aria-label={`เพิ่ม ${l.name}`} disabled={busy || l.qty >= Math.min(20, l.stock)}>+</button>
                  </div>
                  <b>{baht(l.price * l.qty)}</b>
                </div>
              </div>
            </div>
          ))}
          <div className="total-row" style={{ paddingTop: 6 }}><span className="muted">ยอดรวม</span><span className="total-amount">{baht(total)}</span></div>
          <p className="hint">ยอดสุดท้ายยืนยันจากระบบตอนกดสั่งซื้อ</p>
        </aside>
      </div>
    </div>
  );
}
