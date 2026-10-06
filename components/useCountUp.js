'use client';

import { useEffect, useRef, useState } from 'react';

// ตัวเลขนับขึ้นอย่างนุ่มนวล (ยอดเงิน / สถิติ)
export function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    const to = Number(target) || 0;
    if (from === to || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      fromRef.current = to;
      setValue(to);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (to - from) * (1 - Math.pow(1 - t, 3));
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    // rAF หยุดเมื่อแท็บอยู่เบื้องหลัง: กันค่าค้างกลางทาง
    const done = setTimeout(() => { fromRef.current = to; setValue(to); }, duration + 80);
    return () => { cancelAnimationFrame(raf); clearTimeout(done); fromRef.current = to; };
  }, [target, duration]);
  return value;
}
