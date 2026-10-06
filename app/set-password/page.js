'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { AlertIcon } from '../../components/Icons';

export default function SetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState('checking'); // checking | ready | invalid
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get('error')) { setStatus('invalid'); return undefined; }
    const apply = (s) => {
      if (!active || !s) return;
      if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
      setEmail(s.user.email || '');
      setStatus('ready');
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => apply(s));
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) apply(data.session);
      else setTimeout(() => { if (active) setStatus((x) => (x === 'checking' ? 'invalid' : x)); }, 1500);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (pw.length < 8) return setError('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
    if (pw !== pw2) return setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) return setError('ตั้งรหัสผ่านไม่สำเร็จ: ' + err.message);
    router.replace('/admin');
  };

  return (
    <main className="login-wrap">
      <div className="login-card">
        <div style={{ textAlign: 'center' }}>
          <div className="brand-word" style={{ fontSize: 34 }}>Room Scent</div>
          <p className="muted">ตั้งรหัสผ่านใหม่{email ? ` สำหรับ ${email}` : ''}</p>
        </div>
        {status === 'checking' && <div style={{ display: 'flex', justifyContent: 'center' }}><span className="spinner spinner-lg" /></div>}
        {status === 'invalid' && (
          <>
            <div className="alert alert-error" role="alert"><AlertIcon />ลิงก์ใช้ไม่ได้หรือหมดอายุ กรุณาขอลิงก์ใหม่ที่หน้าเข้าสู่ระบบ</div>
            <a href="/login" className="btn btn-outline btn-block">ไปหน้าเข้าสู่ระบบ</a>
          </>
        )}
        {status === 'ready' && (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input type="email" value={email} autoComplete="username" readOnly hidden />
            <div className="field"><label className="label" htmlFor="pw">รหัสผ่านใหม่</label><input id="pw" type="password" className="input" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} /></div>
            <div className="field"><label className="label" htmlFor="pw2">ยืนยันรหัสผ่าน</label><input id="pw2" type="password" className="input" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8} /></div>
            {error && <div className="alert alert-error" role="alert"><AlertIcon />{error}</div>}
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy && <span className="spinner" />}บันทึกรหัสผ่าน</button>
          </form>
        )}
      </div>
    </main>
  );
}
