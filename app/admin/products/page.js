'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { MOODS, MOOD_COLOR, PRODUCT_IMAGES, productImage } from '../../../lib/moods';
import { baht } from '../../../lib/format';
import { AlertIcon, CheckIcon, SearchIcon, TrashIcon } from '../../../components/Icons';

const EMPTY = { sku: '', name: '', price: '', stock: '', unit: 'ชิ้น', mood: '', type: 'spray', size: '', image_url: '', description: '', online: true };

// แปลงค่าจากฐานข้อมูลเป็นค่าในฟอร์ม (เดิมใช้ `|| ""` ทำให้สต็อก 0 กลายเป็นช่องว่าง)
function toForm(p) {
  return {
    sku: p.sku ?? '', name: p.name ?? '', price: p.price ?? '', stock: p.stock ?? '', unit: p.unit ?? 'ชิ้น',
    mood: p.mood ?? '', type: p.type ?? 'spray', size: p.size ?? '', image_url: p.image_url ?? '', description: p.description ?? '', online: !!p.online,
  };
}

function validate(f) {
  const errors = {};
  if (!f.sku.trim()) errors.sku = 'กรุณากรอก SKU';
  if (!f.name.trim()) errors.name = 'กรุณากรอกชื่อสินค้า';
  const price = Number(f.price);
  if (f.price === '' || !Number.isFinite(price) || price < 0) errors.price = 'ราคาต้องเป็นตัวเลข 0 ขึ้นไป';
  const stock = Number(f.stock);
  if (f.stock === '' || !Number.isInteger(stock) || stock < 0) errors.stock = 'สต็อกต้องเป็นจำนวนเต็ม 0 ขึ้นไป';
  if (!f.unit.trim()) errors.unit = 'กรุณากรอกหน่วย';
  if (f.image_url && !/^(\/|https:\/\/)/.test(f.image_url.trim())) errors.image_url = 'ลิงก์รูปต้องขึ้นต้นด้วย / หรือ https://';
  return errors;
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null); // null = ปิดฟอร์ม
  const [editingId, setEditingId] = useState(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [deleting, setDeleting] = useState(null);
  const formTop = useRef(null);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (e) setError('โหลดสินค้าไม่สำเร็จ: ' + e.message);
    else setProducts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  useEffect(() => {
    if (!deleting) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) setDeleting(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleting, busy]);

  const openNew = () => { setEditingId(null); setForm({ ...EMPTY }); setTouched(false); setError(''); setTimeout(() => formTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); };
  const openEdit = (p) => { setEditingId(p.id); setForm(toForm(p)); setTouched(false); setError(''); setTimeout(() => formTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); };
  const closeForm = () => { setForm(null); setEditingId(null); setTouched(false); };

  const errors = form ? validate(form) : {};

  const save = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (busy || Object.keys(errors).length) return;
    setBusy(true);
    setError('');
    const payload = {
      sku: form.sku.trim(), name: form.name.trim(), price: Number(form.price), stock: Number(form.stock), unit: form.unit.trim(),
      mood: form.mood || null, type: form.type || 'spray', size: form.size.trim() || null,
      image_url: form.image_url.trim() || null, description: form.description.trim() || null, online: !!form.online,
    };
    const res = editingId
      ? await supabase.from('products').update(payload).eq('id', editingId).select('id')
      : await supabase.from('products').insert(payload).select('id');
    setBusy(false);
    if (res.error) {
      setError(/duplicate|unique/i.test(res.error.message) ? `SKU "${payload.sku}" มีอยู่แล้ว` : 'บันทึกไม่สำเร็จ: ' + res.error.message);
      return;
    }
    setMsg(editingId ? `บันทึก ${payload.name} แล้ว` : `เพิ่ม ${payload.name} แล้ว`);
    closeForm();
    load();
  };

  const toggleOnline = async (p) => {
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, online: !p.online } : x)));
    const { error: e } = await supabase.from('products').update({ online: !p.online }).eq('id', p.id);
    if (e) { setError('เปลี่ยนสถานะไม่สำเร็จ: ' + e.message); load(); }
  };

  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(true);
    const { error: e } = await supabase.from('products').delete().eq('id', deleting.id);
    setBusy(false);
    if (e) setError('ลบไม่สำเร็จ: ' + e.message);
    else setMsg(`ลบ ${deleting.name} แล้ว (ประวัติการขายยังเก็บไว้)`);
    setDeleting(null);
    load();
  };

  const term = search.trim().toLowerCase();
  const shown = products.filter((p) => !term || (p.name || '').toLowerCase().includes(term) || (p.sku || '').toLowerCase().includes(term));
  const field = (key) => ({
    value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }),
    'aria-invalid': touched && !!errors[key],
  });
  const err = (key) => touched && errors[key] ? <span className="hint" style={{ color: 'var(--clay)' }}>{errors[key]}</span> : null;

  return (
    <main className="adm-page">
      <div className="adm-head" ref={formTop}>
        <div><h1>สินค้า</h1><p>{products.length} รายการ · {products.filter((p) => p.online).length} รายการแสดงในหน้าร้านออนไลน์</p></div>
        {!form && <button type="button" className="btn btn-primary" onClick={openNew}>+ เพิ่มสินค้า</button>}
      </div>

      <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msg && <div className="alert alert-success" role="status"><CheckIcon size={18} />{msg}</div>}
        {error && <div className="alert alert-error" role="alert"><AlertIcon />{error}</div>}
      </div>

      {form && (
        <form className="panel fade-up" onSubmit={save} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2>{editingId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            <div style={{ flex: '0 0 160px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={productImage({ image_url: form.image_url.trim() || null, mood: form.mood })} alt="ตัวอย่างรูปสินค้า" style={{ width: 160, height: 200, objectFit: 'cover', borderRadius: 12, background: 'var(--cream)' }} />
              <span className="hint">ตัวอย่างรูปในหน้าร้าน</span>
            </div>
            <div style={{ flex: '1 1 420px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div className="field"><label className="label" htmlFor="f-sku">SKU</label><input id="f-sku" className="input" placeholder="เช่น RS-FR-30" {...field('sku')} />{err('sku')}</div>
              <div className="field" style={{ gridColumn: 'span 2' }}><label className="label" htmlFor="f-name">ชื่อสินค้า</label><input id="f-name" className="input" {...field('name')} />{err('name')}</div>
              <div className="field"><label className="label" htmlFor="f-price">ราคา (บาท)</label><input id="f-price" className="input" type="number" min="0" step="0.01" inputMode="decimal" {...field('price')} />{err('price')}</div>
              <div className="field"><label className="label" htmlFor="f-stock">สต็อก</label><input id="f-stock" className="input" type="number" min="0" step="1" inputMode="numeric" {...field('stock')} />{err('stock')}</div>
              <div className="field"><label className="label" htmlFor="f-unit">หน่วย</label><input id="f-unit" className="input" placeholder="ขวด, ชิ้น" {...field('unit')} />{err('unit')}</div>
              <div className="field"><label className="label" htmlFor="f-mood">มู้ด</label>
                <select id="f-mood" className="input" {...field('mood')}>
                  <option value="">ไม่ระบุ</option>
                  {MOODS.map((m) => <option key={m.key} value={m.key}>{m.label} · {m.th}</option>)}
                </select>
              </div>
              <div className="field"><label className="label" htmlFor="f-type">ประเภท</label>
                <select id="f-type" className="input" {...field('type')}>
                  <option value="spray">สเปรย์</option>
                  <option value="candle">เทียนหอม</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </div>
              <div className="field"><label className="label" htmlFor="f-size">ขนาด</label><input id="f-size" className="input" placeholder="เช่น 30ml" {...field('size')} /></div>
              <div className="field" style={{ gridColumn: 'span 2' }}><label className="label" htmlFor="f-img">รูปสินค้า</label>
                <select id="f-img-preset" className="input" aria-label="เลือกรูปที่มีอยู่" value={PRODUCT_IMAGES.some((i) => i.value === form.image_url) ? form.image_url : ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })}>
                  <option value="">ตามมู้ด (อัตโนมัติ) / ลิงก์ของคุณเอง</option>
                  {PRODUCT_IMAGES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
                <input id="f-img" className="input" placeholder="หรือวางลิงก์รูป https://..." {...field('image_url')} />{err('image_url')}
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label className="label" htmlFor="f-desc">คำอธิบาย (แสดงในหน้าร้าน)</label><textarea id="f-desc" className="input" rows={3} {...field('description')} /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, gridColumn: '1 / -1', minHeight: 44, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.online} onChange={(e) => setForm({ ...form, online: e.target.checked })} style={{ width: 20, height: 20, accentColor: 'var(--bronze)' }} />
                แสดงสินค้านี้ในหน้าร้านออนไลน์
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <span className="spinner" />}{editingId ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}</button>
            <button type="button" className="btn btn-outline" onClick={closeForm} disabled={busy}>ยกเลิก</button>
          </div>
        </form>
      )}

      <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <label htmlFor="p-search" className="sr-only">ค้นหาสินค้า</label>
          <span style={{ position: 'absolute', left: 14, top: 15, color: 'var(--ink-soft)' }}><SearchIcon /></span>
          <input id="p-search" type="search" className="input" style={{ paddingLeft: 42 }} placeholder="ค้นหาชื่อ หรือ SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? <div className="skeleton" style={{ height: 240, borderRadius: 12 }} /> : shown.length === 0 ? (
          <div className="empty-state"><p>{products.length ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีสินค้า'}</p></div>
        ) : (
          <div className="table-box">
            <table className="tbl">
              <thead><tr><th>สินค้า</th><th>SKU</th><th className="num">ราคา</th><th className="num">สต็อก</th><th>หน้าร้านออนไลน์</th><th style={{ textAlign: 'right' }}>จัดการ</th></tr></thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={productImage(p)} alt="" style={{ width: 40, height: 48, objectFit: 'cover', borderRadius: 6 }} loading="lazy" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <b style={{ fontWeight: 600 }}>{p.name}</b>
                          {p.mood && <span className="hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="dot" style={{ width: 8, height: 8, background: MOOD_COLOR[p.mood] }} />{p.mood}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="muted">{p.sku}</td>
                    <td className="num">{baht(p.price)}</td>
                    <td className="num" style={{ color: Number(p.stock) <= 5 ? 'var(--clay)' : undefined, fontWeight: Number(p.stock) <= 5 ? 700 : 400 }}>{p.stock} {p.unit}</td>
                    <td>
                      <button type="button" className="chip" aria-pressed={!!p.online} onClick={() => toggleOnline(p)} aria-label={`${p.online ? 'ซ่อน' : 'แสดง'} ${p.name} ในหน้าร้าน`}>
                        {p.online ? 'แสดงอยู่' : 'ซ่อน'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => openEdit(p)}>แก้ไข</button>{' '}
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleting(p)} aria-label={`ลบ ${p.name}`}><TrashIcon /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {deleting && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget && !busy) setDeleting(null); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="del-title">
            <h2 id="del-title" style={{ color: 'var(--clay)' }}>ลบ {deleting.name}?</h2>
            <p>ประวัติการขายของสินค้านี้ยังเก็บไว้ ถ้าแค่ไม่อยากให้ลูกค้าเห็น ใช้ปุ่ม “ซ่อน” แทนได้</p>
            <div className="dialog-actions">
              <button type="button" className="btn btn-danger-solid btn-lg" onClick={remove} disabled={busy}>{busy && <span className="spinner" />}ยืนยันลบ</button>
              <button type="button" className="btn btn-outline" onClick={() => setDeleting(null)} disabled={busy}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
