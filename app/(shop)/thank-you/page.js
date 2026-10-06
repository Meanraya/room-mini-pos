'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckIcon } from '../../../components/Icons';
import { baht } from '../../../lib/format';

export default function ThankYouPage() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setInfo({ no: q.get('no'), total: q.get('total') });
  }, []);

  return (
    <div className="container thanks">
      <div className="thanks-icon"><CheckIcon size={38} /></div>
      <h1 className="display" style={{ fontSize: 'clamp(34px, 5vw, 46px)' }}>ขอบคุณสำหรับคำสั่งซื้อ</h1>
      <p className="muted" style={{ maxWidth: 440, lineHeight: 1.8 }}>
        {info && info.no ? <>หมายเลขออเดอร์ <b style={{ color: 'var(--ink)' }}>{info.no}</b>{info.total ? <> · ยอดรวม <b style={{ color: 'var(--ink)' }}>{baht(info.total)}</b></> : null}<br /></> : null}
        ทีมงานจะติดต่อกลับเพื่อยืนยันและแจ้งช่องทางชำระเงินโดยเร็วที่สุด
      </p>
      <Link href="/" className="btn btn-outline btn-lg">กลับไปหน้าร้าน</Link>
    </div>
  );
}
