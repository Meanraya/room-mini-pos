'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

const LINKS = [
  { href: '/admin', label: 'ภาพรวม' },
  { href: '/admin/pos', label: 'ขายหน้าร้าน' },
  { href: '/admin/orders', label: 'ออเดอร์ออนไลน์', badge: true },
  { href: '/admin/products', label: 'สินค้า' },
  { href: '/admin/history', label: 'ประวัติการขาย' },
];

export default function AdminShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [newOrders, setNewOrders] = useState(0);

  useEffect(() => {
    let active = true;
    const goLogin = () => router.replace('/login?next=' + encodeURIComponent(pathname));
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) setReady(true);
      else goLogin();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      if (!session) {
        setReady(false);
        goLogin();
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router, pathname]);

  // จำนวนออเดอร์ออนไลน์ที่รอยืนยัน (อัปเดตทุก 20 วินาที)
  useEffect(() => {
    if (!ready) return undefined;
    let active = true;
    const load = async () => {
      const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'new');
      if (active && typeof count === 'number') setNewOrders(count);
    };
    load();
    const t = setInterval(load, 20000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    window.addEventListener('orders-changed', onFocus);
    return () => {
      active = false;
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('orders-changed', onFocus);
    };
  }, [ready]);

  if (!ready) {
    return (
      <div className="login-wrap" role="status">
        <span className="spinner spinner-lg" />
        <span className="sr-only">กำลังตรวจสอบสิทธิ์...</span>
      </div>
    );
  }

  return (
    <div className="adm">
      <nav className="adm-nav" aria-label="เมนูหลังร้าน">
        <div className="adm-nav-inner">
          <Link href="/admin" className="adm-brand">Room Scent <small>หลังร้าน</small></Link>
          <div className="adm-links">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="adm-link" aria-current={pathname === l.href ? 'page' : undefined}>
                {l.label}
                {l.badge && newOrders > 0 && <span key={newOrders} className="adm-count">{newOrders}</span>}
              </Link>
            ))}
          </div>
          <div className="adm-nav-right">
            <Link href="/" target="_blank" rel="noopener">ดูหน้าร้าน</Link>
            <button type="button" onClick={() => supabase.auth.signOut()}>ออกจากระบบ</button>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
