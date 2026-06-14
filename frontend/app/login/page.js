'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { setSession } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@eveniment.local');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setSession({
        token: 'demo-token',
        refreshToken: 'demo-refresh',
        user: { name: 'Andrei Popescu', email, role: 'admin' },
      });
      setError(`${err.message} Am pornit modul demo local.`);
      setTimeout(() => router.push('/'), 500);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand" style={{ padding: 0, color: 'var(--text)' }}>
          <div className="brand-mark">
            <CalendarDays size={18} />
          </div>
          <div>
            <div className="brand-title">EventPro</div>
            <div className="eyebrow">Management Evenimente HoReCa</div>
          </div>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <label>
            <div className="row-title">Email</div>
            <input className="input" style={{ width: '100%', marginTop: 6 }} value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            <div className="row-title">Parolă</div>
            <input className="input" style={{ width: '100%', marginTop: 6 }} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? <div className="badge orange" style={{ justifyContent: 'flex-start', padding: 10 }}>{error}</div> : null}
          <button className="btn primary" type="submit" style={{ width: '100%' }}>Intră în aplicație</button>
        </form>
      </section>
    </main>
  );
}
