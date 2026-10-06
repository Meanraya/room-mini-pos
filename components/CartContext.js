'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const KEY = 'room_scent_cart_v1';
export const MAX_QTY_PER_ITEM = 20;
export const MAX_LINES = 20;
const CartCtx = createContext(null);

// ตะกร้าเก็บไว้ในเครื่องลูกค้า ราคาในนี้ใช้แสดงผลเท่านั้น ยอดจริงคำนวณจากฐานข้อมูลตอนสั่งซื้อ
export function CartProvider({ children }) {
  const [lines, setLines] = useState({}); // { [id]: { id, name, price, image, stock, qty, meta } }
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (saved && typeof saved === 'object') setLines(saved);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, loaded]);

  const limitFor = (p) => Math.max(0, Math.min(MAX_QTY_PER_ITEM, Number(p.stock) || 0));

  // ตัดสินผลจาก state ล่าสุดผ่าน ref (updater ของ setState ทำงานทีหลัง จึงอ่านผลจากในนั้นไม่ได้)
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const commit = (next) => {
    linesRef.current = next;
    setLines(next);
  };

  const add = useCallback((p, qty = 1) => {
    const prev = linesRef.current;
    const cur = prev[p.id];
    const limit = limitFor(p);
    if (limit <= 0) return 'out';
    if (!cur && Object.keys(prev).length >= MAX_LINES) return 'too_many_lines';
    const nextQty = Math.min(limit, (cur ? cur.qty : 0) + qty);
    if (cur && nextQty === cur.qty) return 'limit';
    commit({ ...prev, [p.id]: { id: p.id, name: p.name, price: Number(p.price), image: p.image, stock: p.stock, meta: p.meta, qty: nextQty } });
    setBump((b) => b + 1);
    return 'added';
  }, []);

  const setQty = useCallback((id, qty) => {
    const prev = linesRef.current;
    const cur = prev[id];
    if (!cur) return;
    const next = { ...prev };
    if (qty <= 0) delete next[id];
    else next[id] = { ...cur, qty: Math.max(1, Math.min(limitFor(cur), qty)) };
    commit(next);
  }, []);

  // อัปเดตราคา/สต็อกล่าสุดจากฐานข้อมูล และเอาสินค้าที่เลิกขายออก คืนค่ารายการที่ถูกปรับ
  const sync = useCallback((freshProducts) => {
    const map = new Map(freshProducts.map((p) => [p.id, p]));
    const changes = [];
    const next = {};
    for (const [id, l] of Object.entries(linesRef.current)) {
      const p = map.get(id);
      if (!p || Number(p.stock) <= 0) { changes.push(`${l.name} หมดแล้ว`); continue; }
      const limit = Math.min(MAX_QTY_PER_ITEM, Number(p.stock));
      const qty = Math.min(l.qty, limit);
      if (qty < l.qty) changes.push(`${l.name} เหลือ ${p.stock} ชิ้น`);
      if (Number(p.price) !== Number(l.price)) changes.push(`${l.name} ราคาเปลี่ยนเป็น ${p.price} บาท`);
      next[id] = { ...l, name: p.name, price: Number(p.price), stock: p.stock, qty };
    }
    if (changes.length) commit(next);
    return changes;
  }, []);

  const clear = useCallback(() => commit({}), []);

  const value = useMemo(() => {
    const list = Object.values(lines);
    return {
      lines: list,
      count: list.reduce((s, l) => s + l.qty, 0),
      total: list.reduce((s, l) => s + l.qty * l.price, 0),
      loaded, open, setOpen, bump, add, setQty, sync, clear,
    };
  }, [lines, loaded, open, bump, add, setQty, sync, clear]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const v = useContext(CartCtx);
  if (!v) throw new Error('useCart must be used inside CartProvider');
  return v;
}
