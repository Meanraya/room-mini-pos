'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { MOODS, MOOD_COLOR, productImage, productMeta } from '../../lib/moods';
import { baht } from '../../lib/format';
import { useCart } from '../../components/CartContext';
import { useReveal } from '../../components/useReveal';
import { AlertIcon, CheckIcon } from '../../components/Icons';

const FILTERS = [{ key: 'all', label: 'ทั้งหมด' }, ...MOODS];

export default function HomePage() {
  const { add, lines } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mood, setMood] = useState('all');
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  useReveal([loading]);

  const load = useCallback(async () => {
    setError('');
    const { data, error: e } = await supabase
      .from('products')
      .select('id, name, price, stock, unit, mood, type, size, image_url, description')
      .eq('online', true)
      .order('mood', { ascending: true })
      .order('price', { ascending: true });
    if (e) setError('โหลดสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    else setProducts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // อ่านมู้ดจากลิงก์ (?mood=relax) เหมือนหน้าเดิมของ room
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('mood');
    if (q && FILTERS.some((f) => f.key === q)) setMood(q);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  };

  const pickMood = (key, scroll = false) => {
    setMood(key);
    const url = new URL(window.location.href);
    if (key === 'all') url.searchParams.delete('mood');
    else url.searchParams.set('mood', key);
    window.history.replaceState(null, '', url.pathname + url.search + (scroll ? '#shop' : url.hash));
    if (scroll) document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onAdd = (p) => {
    const r = add({ ...p, image: productImage(p), meta: productMeta(p) });
    if (r === 'added') showToast(`เพิ่ม ${p.name} ลงตะกร้าแล้ว`);
    else if (r === 'limit') showToast(`${p.name} ใส่ได้สูงสุดตามจำนวนที่มีแล้ว`);
    else if (r === 'too_many_lines') showToast('ตะกร้าเต็มแล้ว (สูงสุด 20 รายการ)');
    else showToast('สินค้านี้หมดแล้ว');
  };

  const inCart = Object.fromEntries(lines.map((l) => [l.id, l.qty]));
  const moodRank = (m) => { const i = MOODS.findIndex((x) => x.key === m); return i < 0 ? 99 : i; };
  const sorted = [...products].sort((a, b) => moodRank(a.mood) - moodRank(b.mood) || (a.type === b.type ? 0 : a.type === 'candle' ? 1 : -1) || Number(a.price) - Number(b.price));
  const shown = mood === 'all' ? sorted : sorted.filter((p) => p.mood === mood);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Room spray &amp; candle</span>
            <h1>เปลี่ยนมู้ดห้องเดิมๆ ให้เป็นเซฟโซนที่ใช่</h1>
            <p className="hero-lead">ด้วยกลิ่นหอมที่ออกแบบมาเพื่อทุกช่วงเวลาของคุณ เลือกจาก 4 มู้ด สดชื่น ผ่อนคลาย มีสมาธิ หรือโรแมนติก</p>
            <div className="hero-actions">
              <a href="#shop" className="btn btn-primary btn-lg">เลือกซื้อสินค้า</a>
              <a href="#moods" className="btn btn-outline btn-lg">หากลิ่นที่ใช่</a>
            </div>
          </div>
          <div className="hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/hero.jpg" alt="สเปรย์ปรับอากาศ Room Scent ทั้ง 4 กลิ่น วางบนผ้าลินิน" width={1400} height={1400} fetchPriority="high" />
          </div>
        </div>
      </section>

      <div className="trust-strip">
        <div className="container trust-inner">
          <span>4 มู้ด สำหรับทุกช่วงเวลา</span>
          <span>สเปรย์ 30ml · 100ml และเทียนหอม</span>
          <span>สั่งง่าย ไม่ต้องสมัครสมาชิก</span>
        </div>
      </div>

      <section id="moods" className="section section-cream">
        <div className="container">
          <div className="section-head center reveal">
            <h2>เลือกกลิ่นตามช่วงเวลาของคุณ</h2>
            <p className="muted">4 มู้ด ให้ห้องของคุณเป็นแบบที่อยากให้เป็นในแต่ละวัน</p>
          </div>
          <div className="mood-grid">
            {MOODS.map((m, i) => (
              <button key={m.key} type="button" className="mood-card reveal" style={{ '--mood': m.color, '--d': `${i * 80}ms` }}
                onClick={() => pickMood(m.key, true)}>
                <span className="mood-swatch" aria-hidden="true" />
                <h3>{m.label}</h3>
                <span className="mood-sub">{m.th}</span>
                <span className="mood-text">{m.text}</span>
                <span className="mood-more">ดูสินค้า {m.label} <span aria-hidden="true">→</span></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section story">
        <div className="container story-grid">
          <div className="story-media reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/room.jpg" alt="มุมห้องนอนโทนครีม มีสเปรย์และเทียนหอมวางบนโต๊ะข้างเตียง" loading="lazy" width={1264} height={848} />
          </div>
          <div className="story-copy reveal" style={{ '--d': '120ms' }}>
            <span className="eyebrow">Our story</span>
            <h2>ห้องที่ใช่ เริ่มจากกลิ่นที่ใช่</h2>
            <p>Room Scent ออกแบบกลิ่นตามช่วงเวลาในหนึ่งวัน ตั้งแต่เช้าที่อยากสดชื่น ช่วงอ่านหนังสือที่ต้องการสมาธิ ไปจนถึงค่ำคืนที่อยากผ่อนคลายหรือมีโมเมนต์พิเศษ</p>
            <p>ฉีดสเปรย์ 2–3 ครั้งให้ห้องหอมทันที หรือจุดเทียนหอมเพื่อให้กลิ่นค่อยๆ อบอวลพร้อมแสงไฟอุ่นๆ</p>
            <a href="#shop" className="btn btn-outline">ดูสินค้าทั้งหมด</a>
          </div>
        </div>
      </section>

      <section id="shop" className="section">
        <div className="container">
          <div className="shop-toolbar">
            <div className="section-head" style={{ margin: 0 }}>
              <h2>สินค้าทั้งหมด</h2>
              <p className="muted">{loading ? 'กำลังโหลด...' : `${shown.length} รายการ`}</p>
            </div>
            <div className="filter-group" role="group" aria-label="กรองตามมู้ด">
              {FILTERS.map((f) => (
                <button key={f.key} type="button" className="filter-btn" aria-pressed={mood === f.key} onClick={() => pickMood(f.key)}>
                  {f.key !== 'all' && <span className="dot" style={{ background: MOOD_COLOR[f.key] }} />}
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: 20 }}>
              <AlertIcon />{error}
              <button type="button" className="btn btn-sm btn-outline" style={{ marginLeft: 'auto' }} onClick={() => { setLoading(true); load(); }}>ลองใหม่</button>
            </div>
          )}

          {loading ? (
            <div className="product-grid">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}><div className="skeleton" style={{ aspectRatio: '4 / 5' }} /><div className="skeleton" style={{ height: 18, marginTop: 14, width: '70%' }} /></div>
              ))}
            </div>
          ) : shown.length === 0 && !error ? (
            <div className="empty-state"><p>ยังไม่มีสินค้าในหมวดนี้</p></div>
          ) : (
            <div key={mood} className="product-grid stagger">
              {shown.map((p) => {
                const out = Number(p.stock) <= 0;
                const qty = inCart[p.id] || 0;
                return (
                  <article key={p.id} className="product-card">
                    <div className="product-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={productImage(p)} alt={p.name} loading="lazy" width={1000} height={1250} />
                      {out && <span className="badge-corner badge-out">สินค้าหมด</span>}
                      {!out && Number(p.stock) <= 5 && <span className="badge-corner badge-low">เหลือ {p.stock} ชิ้น</span>}
                    </div>
                    <div className="product-body">
                      <span className="product-meta"><span className="dot" style={{ width: 8, height: 8, background: MOOD_COLOR[p.mood] || 'var(--line-strong)' }} />{productMeta(p)}</span>
                      <h3 className="product-name">{p.name}</h3>
                      {p.description && <p className="product-desc">{p.description}</p>}
                      <div className="product-foot">
                        <span className="price">{baht(p.price)}</span>
                        <button type="button" className={`btn btn-sm ${qty ? 'btn-ghost' : 'btn-primary'}`} disabled={out}
                          onClick={() => onAdd(p)} aria-label={out ? `${p.name} สินค้าหมด` : `ใส่ ${p.name} ลงตะกร้า`}>
                          {out ? 'สินค้าหมด' : qty ? `ในตะกร้า ${qty}` : 'ใส่ตะกร้า'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>


      <section className="section section-cream" id="how">
        <div className="container">
          <div className="section-head center reveal">
            <h2>สั่งซื้อง่ายใน 3 ขั้นตอน</h2>
            <p className="muted">ไม่ต้องสมัครสมาชิก ทีมงานติดต่อกลับเพื่อยืนยันทุกออเดอร์</p>
          </div>
          <ol className="steps">
            {[
              ['เลือกกลิ่นที่ชอบ', 'กรองตามมู้ด แล้วกด “ใส่ตะกร้า” ได้หลายรายการ'],
              ['กรอกข้อมูลติดต่อ', 'ชื่อ เบอร์โทรหรือ LINE ID และที่อยู่จัดส่ง'],
              ['รอทีมงานติดต่อกลับ', 'ยืนยันออเดอร์และแจ้งช่องทางชำระเงินให้คุณ'],
            ].map(([t, d], i) => (
              <li key={t} className="step reveal" style={{ '--d': `${i * 100}ms` }}>
                <span className="step-no">{i + 1}</span>
                <h3>{t}</h3>
                <p className="muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="container faq">
          <div className="section-head reveal"><h2>คำถามที่พบบ่อย</h2></div>
          <div className="faq-list">
            {[
              ['ชำระเงินอย่างไร?', 'หลังสั่งซื้อ ทีมงานจะติดต่อกลับทางเบอร์โทรหรือ LINE ที่คุณให้ไว้ เพื่อยืนยันรายการและแจ้งช่องทางชำระเงิน'],
              ['สเปรย์กับเทียนหอมต่างกันอย่างไร?', 'สเปรย์ให้กลิ่นทันทีหลังฉีด เหมาะกับการเปลี่ยนบรรยากาศเร็วๆ ส่วนเทียนหอมให้กลิ่นค่อยๆ อบอวลพร้อมแสงเทียน เหมาะกับช่วงพักผ่อน'],
              ['ไม่แน่ใจว่าจะเลือกมู้ดไหนดี?', 'เริ่มจากช่วงเวลาที่ใช้ห้องบ่อยที่สุด เช่น อ่านหนังสือเลือก Focus ก่อนนอนเลือก Relax หรือเลือกขนาด 30ml เพื่อลองหลายกลิ่นก่อน'],
              ['ยกเลิกหรือแก้ไขออเดอร์ได้ไหม?', 'ได้ แจ้งทีมงานตอนที่ติดต่อกลับเพื่อยืนยันออเดอร์ได้เลย'],
            ].map(([q, a]) => (
              <details key={q} className="faq-item reveal">
                <summary>{q}<span className="faq-icon" aria-hidden="true" /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {toast && <div className="toast" role="status"><CheckIcon size={18} />{toast}</div>}
    </>
  );
}
