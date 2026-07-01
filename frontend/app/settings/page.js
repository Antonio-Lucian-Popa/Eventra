'use client';

import { useEffect, useState } from 'react';
import { Send, Save } from 'lucide-react';
import AppShell from '../../components/AppShell';
import PageHeader from '../../components/PageHeader';
import { apiFetch, createResource, updateResource } from '../../lib/api';

export default function SettingsPage() {
  const [organization, setOrganization] = useState({ name: 'Eveniment Demo', slug: 'eveniment-demo' });
  const [invite, setInvite] = useState({ email: '', role: 'worker' });
  const [resetEmail, setResetEmail] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    apiFetch('/organization/me').then(setOrganization).catch(() => null);
  }, []);

  async function saveOrganization(event) {
    event.preventDefault();
    setNotice('');
    try {
      const updated = await updateResource('/organization', 'me', organization);
      setOrganization(updated);
      setNotice('Organizația a fost salvată.');
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function sendInvite(event) {
    event.preventDefault();
    setNotice('');
    try {
      const result = await createResource('/auth/invitations', invite);
      setInvite({ email: '', role: 'worker' });
      setNotice(`Invitație creată.${result.invitationToken ? ` Token demo: ${result.invitationToken}` : ''}`);
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function requestReset(event) {
    event.preventDefault();
    setNotice('');
    try {
      const result = await createResource('/auth/password-reset/request', { email: resetEmail });
      setNotice(`Reset creat.${result.resetToken ? ` Token demo: ${result.resetToken}` : ''}`);
    } catch (err) {
      setNotice(err.message);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Setări" subtitle="Organizație, useri și securitate">{null}</PageHeader>

      {notice ? <div className="notice" style={{ marginBottom: 18 }}>{notice}</div> : null}

      <div className="grid content-grid">
        <section className="card detail-card">
          <div className="card-title">Organizație</div>
          <form className="form-grid" onSubmit={saveOrganization} style={{ marginTop: 18 }}>
            <div className="field">
              <label>Nume</label>
              <input value={organization.name || ''} onChange={(event) => setOrganization((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="field">
              <label>Slug</label>
              <input value={organization.slug || ''} onChange={(event) => setOrganization((current) => ({ ...current, slug: event.target.value }))} />
            </div>
            <div className="field full">
              <button className="btn primary" type="submit">
                <Save size={16} />
                Salvează organizația
              </button>
            </div>
          </form>
        </section>

        <section className="card detail-card">
          <div className="card-title">Invită user</div>
          <form className="form-grid" onSubmit={sendInvite} style={{ marginTop: 18 }}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={invite.email} onChange={(event) => setInvite((current) => ({ ...current, email: event.target.value }))} />
            </div>
            <div className="field">
              <label>Rol</label>
              <select value={invite.role} onChange={(event) => setInvite((current) => ({ ...current, role: event.target.value }))}>
                <option value="worker">Lucrător</option>
                <option value="sales">Vânzări</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="field full">
              <button className="btn primary" type="submit">
                <Send size={16} />
                Trimite invitația
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="card detail-card" style={{ marginTop: 18 }}>
        <div className="card-title">Resetare parolă</div>
        <form className="toolbar" onSubmit={requestReset} style={{ marginTop: 18 }}>
          <input className="input" type="email" placeholder="email@firma.ro" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} />
          <button className="btn" type="submit">Generează reset</button>
        </form>
      </section>
    </AppShell>
  );
}
