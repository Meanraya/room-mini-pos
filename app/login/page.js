'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { AlertIcon, CheckIcon } from '../../components/Icons';

function safeNext() {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/admin';
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // login | forgot | sent
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cardRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace(safeNext()); });
  }, [router]);

  const shake = () => {
    const el = cardRef.current;
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  };

  const login = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setBusy(false);
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      shake();
      return;
    }
    router.replace(safeNext());
  };

  const forgot = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('กรุณากรอกอีเมลให้ถูกต้อง'); shake(); return; }
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/set-password` });
    setBusy(false);
    if (err) { setError(/rate|security/i.test(err.message || '') ? 'ขอลิงก์ถี่เกินไป กรุณารอสักครู่' : 'ส่งลิงก์ไม่สำเร็จ'); return; }
    setMode('sent');
  };

  return (
    <main className="login-wrap">
      <div ref={cardRef} className="login-card" onAnimationEnd={(e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('shake'); }}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand-word" style={{ fontSize: 34 }}>Room Scent</div>
          <p className="muted">{mode === 'login' ? 'เข้าสู่ระบบหลังร้าน' : 'รีเซ็ตรหัสผ่าน'}</p>
        </div>
        {mode === 'sent' ? (
          <>
            <div className="alert alert-success" role="status"><CheckIcon size={18} />ถ้าอีเมลนี้เป็นบัญชีพนักงาน ระบบได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว</div>
            <button type="button" className="btn btn-outline btn-block" onClick={() => setMode('login')}>กลับไปหน้าเข้าสู่ระบบ</button>
          </>
        ) : (
          <form onSubmit={mode === 'login' ? login : forgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label className="label" htmlFor="email">อีเมล</label>
              <input id="email" type="email" className="input" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode === 'login' && (
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="label" htmlFor="password">รหัสผ่าน</label>
                  <button type="button" onClick={() => { setMode('forgot'); setError(''); }} style={{ border: 'none', background: 'none', color: 'var(--bronze)', fontSize: 14, cursor: 'pointer', textDecoration: 'underline', minHeight: 32 }}>ลืมรหัสผ่าน?</button>
                </div>
                <input id="password" type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            )}
            {error && <div className="alert alert-error" role="alert"><AlertIcon />{error}</div>}
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy && <span className="spinner" />}
              {mode === 'login' ? (busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ') : (busy ? 'กำลังส่ง...' : 'ส่งลิงก์ตั้งรหัสผ่านใหม่')}
            </button>
            {mode === 'forgot' && <button type="button" className="btn btn-outline btn-block" onClick={() => { setMode('login'); setError(''); }}>กลับ</button>}
          </form>
        )}
        <Link href="/" className="muted" style={{ textAlign: 'center', fontSize: 14 }}>← กลับไปหน้าร้าน</Link>
      </div>
    </main>
  );
}
