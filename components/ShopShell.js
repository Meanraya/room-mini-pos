'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CartProvider, useCart } from './CartContext';
import CartDrawer from './CartDrawer';
import { BagIcon } from './Icons';

function Header() {
  const { count, setOpen, bump, loaded } = useCart();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`shop-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container shop-header-inner">
        <Link href="/" className="brand-word">Room Scent</Link>
        <nav className="shop-nav" aria-label="เมนูหลัก">
          <Link href="/#moods" className="nav-link">มู้ด</Link>
          <Link href="/#shop" className="nav-link">สินค้า</Link>
          {pathname !== '/checkout' && (
            <button type="button" className="cart-btn" onClick={() => setOpen(true)} aria-label={`เปิดตะกร้า มี ${count} ชิ้น`}>
              <BagIcon />
              ตะกร้า
              <span key={bump} className={`cart-count ${bump ? 'pop' : ''}`}>{loaded ? count : 0}</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function ShopShell({ children }) {
  return (
    <CartProvider>
      <Header />
      <main>{children}</main>
      <footer className="shop-footer">
        <div className="container shop-footer-inner">
          <span className="brand-word" style={{ fontSize: 22 }}>Room Scent</span>
          <span>© {new Date().getFullYear()} Room Scent สงวนลิขสิทธิ์</span>
        </div>
      </footer>
      <CartDrawer />
    </CartProvider>
  );
}
