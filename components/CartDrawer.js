'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useCart } from './CartContext';
import { BagIcon, CloseIcon } from './Icons';
import { baht } from '../lib/format';

export default function CartDrawer() {
  const { open, setOpen, lines, total, setQty } = useCart();
  const [closing, setClosing] = useState(false);
  const closeBtn = useRef(null);
  const timer = useRef(null);

  const close = () => {
    if (closing) return;
    setClosing(true);
    timer.current = setTimeout(() => {
      setClosing(false);
      setOpen(false);
    }, 260);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    setTimeout(() => closeBtn.current && closeBtn.current.focus(), 50);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className={`drawer-overlay ${closing ? 'is-closing' : ''}`} onClick={close} aria-hidden="true" />
      <aside className={`drawer ${closing ? 'is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="drawer-head">
          <h2 id="cart-title">ตะกร้าของคุณ</h2>
          <button ref={closeBtn} type="button" className="icon-btn" onClick={close} aria-label="ปิดตะกร้า"><CloseIcon /></button>
        </div>
        <div className="drawer-body">
          {lines.length === 0 ? (
            <div className="empty-state">
              <BagIcon size={40} w={1.2} />
              <p>ยังไม่มีสินค้าในตะกร้า</p>
              <button type="button" className="btn btn-outline" onClick={close}>เลือกซื้อสินค้า</button>
            </div>
          ) : (
            lines.map((l) => (
              <div className="cart-line" key={l.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.image} alt="" />
                <div className="cart-line-info">
                  <span className="cart-line-name">{l.name}</span>
                  <span className="muted" style={{ fontSize: 13 }}>{baht(l.price)}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <div className="qty-box">
                      <button type="button" onClick={() => setQty(l.id, l.qty - 1)} aria-label={`ลด ${l.name}`}>−</button>
                      <b key={l.qty} className="pop">{l.qty}</b>
                      <button type="button" onClick={() => setQty(l.id, l.qty + 1)} aria-label={`เพิ่ม ${l.name}`} disabled={l.qty >= Math.min(20, l.stock)}>+</button>
                    </div>
                    <b>{baht(l.price * l.qty)}</b>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {lines.length > 0 && (
          <div className="drawer-foot">
            <div className="total-row"><span className="muted">ยอดรวม</span><span className="total-amount">{baht(total)}</span></div>
            <Link href="/checkout" className="btn btn-primary btn-lg btn-block" onClick={() => setOpen(false)}>ไปหน้าสั่งซื้อ</Link>
          </div>
        )}
      </aside>
    </>
  );
}
