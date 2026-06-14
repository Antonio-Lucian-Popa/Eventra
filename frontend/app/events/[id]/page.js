'use client';

import { ArrowLeft, CalendarDays, Clock, CreditCard, Edit3, FileText, MapPin, MoreHorizontal, Trash2 } from 'lucide-react';
import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import PageHeader from '../../../components/PageHeader';
import StatusBadge from '../../../components/StatusBadge';
import Modal from '../../../components/Modal';
import ResourceForm from '../../../components/ResourceForm';
import { demoEvents } from '../../../lib/demo-data';
import { apiFetch, createResource, deleteResource, updateResource } from '../../../lib/api';
import { resourceConfigs } from '../../../lib/resource-configs';

function money(value) {
  return `${Number(value || 0).toLocaleString('ro-RO')} €`;
}

const TABS = ['Detalii', 'Contract & Plăți', 'Meniu & Servicii', 'Organizare', 'Fișiere', 'Note'];

const paymentFields = [
  { name: 'amount', label: 'Suma', type: 'number' },
  {
    name: 'paymentMethod', label: 'Metodă', type: 'select',
    options: ['cash', 'bank_transfer', 'card'].map((v) => ({ value: v, label: v })),
    defaultValue: 'cash',
  },
  {
    name: 'status', label: 'Status', type: 'select',
    options: ['pending', 'succeeded'].map((v) => ({ value: v, label: v })),
    defaultValue: 'succeeded',
  },
  { name: 'paidAt', label: 'Data plății', type: 'date', optional: true },
];

export default function EventDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState(demoEvents.find((item) => item.id === id) || demoEvents[0]);
  const [activeTab, setActiveTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!id.startsWith('event-')) {
      apiFetch(`/events/${id}`).then(setEvent).catch(() => null);
      apiFetch(`/payments?eventId=${id}&pageSize=50`)
        .then((p) => setPayments(Array.isArray(p) ? p : p?.data || []))
        .catch(() => null);
      apiFetch(`/contracts?eventId=${id}&pageSize=50`)
        .then((c) => setContracts(Array.isArray(c) ? c : c?.data || []))
        .catch(() => null);
    }
  }, [id]);

  useEffect(() => {
    if (!moreOpen) return undefined;
    function onClickOutside(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [moreOpen]);

  async function saveEvent(body) {
    setSubmitting(true);
    setError('');
    try {
      if (id.startsWith('event-')) {
        setEvent((c) => ({ ...c, ...body }));
      } else {
        const updated = await updateResource('/events', id, body);
        setEvent(updated);
      }
      setEditOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function savePayment(body) {
    setSubmitting(true);
    setError('');
    try {
      if (!id.startsWith('event-')) {
        const created = await createResource('/payments', { ...body, eventId: id });
        setPayments((p) => [created, ...p]);
        const updated = await apiFetch(`/events/${id}`);
        setEvent(updated);
      } else {
        setEvent((c) => ({
          ...c,
          paidAmount: (c.paidAmount || 0) + Number(body.amount),
          remainingAmount: Math.max(0, (c.remainingAmount || 0) - Number(body.amount)),
        }));
        setPayments((p) => [{ id: Date.now(), ...body, paidAt: body.paidAt || new Date().toISOString() }, ...p]);
      }
      setPaymentOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEvent() {
    if (!window.confirm('Ștergi acest eveniment? Acțiunea este ireversibilă.')) return;
    setMoreOpen(false);
    try {
      if (!id.startsWith('event-')) await deleteResource('/events', id);
      router.push('/events');
    } catch (err) {
      setError(err.message);
    }
  }

  const eventDate = event.eventDate ? new Date(event.eventDate).toLocaleDateString('ro-RO') : '';

  return (
    <AppShell>
      <PageHeader title={event.title} subtitle="">
        <Link href="/events" className="btn">
          <ArrowLeft size={16} />
          Înapoi la evenimente
        </Link>
        <button className="btn primary" onClick={() => setEditOpen(true)}>
          <Edit3 size={16} />
          Editează evenimentul
        </button>
        <div style={{ position: 'relative' }} ref={moreRef}>
          <button className="btn icon" aria-label="Mai multe" onClick={() => setMoreOpen((o) => !o)}>
            <MoreHorizontal size={18} />
          </button>
          {moreOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '110%',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, padding: 4, zIndex: 50, minWidth: 180,
              boxShadow: '0 4px 16px rgba(0,0,0,.18)',
            }}>
              <button
                className="btn" type="button"
                style={{ width: '100%', justifyContent: 'flex-start', gap: 8, color: 'var(--red)' }}
                onClick={deleteEvent}
              >
                <Trash2 size={14} /> Șterge evenimentul
              </button>
            </div>
          )}
        </div>
      </PageHeader>

      {error ? <div className="notice error" style={{ marginBottom: 16 }}>{error}</div> : null}

      <div className="toolbar" style={{ margin: '-12px 0 20px' }}>
        <StatusBadge status={event.status} />
        <span className="row-subtitle"><CalendarDays size={14} /> {eventDate}</span>
        <span className="row-subtitle"><Clock size={14} /> {event.startTime}</span>
        <span className="row-subtitle"><MapPin size={14} /> {event.venue?.name}</span>
      </div>

      <div className="tabs">
        {TABS.map((tab, index) => (
          <div
            key={tab}
            className={`tab ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
            style={{ cursor: 'pointer' }}
          >
            {tab}
          </div>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="grid detail-grid">
          <section className="card detail-card">
            <div className="card-title">Informații generale</div>
            <div className="detail-row"><span>Tip eveniment</span><strong>{event.eventType || 'Nuntă'}</strong></div>
            <div className="detail-row"><span>Data eveniment</span><strong>{eventDate}</strong></div>
            <div className="detail-row"><span>Ora începerii</span><strong>{event.startTime}</strong></div>
            <div className="detail-row"><span>Locație</span><strong>{event.venue?.name}</strong></div>
            <div className="detail-row"><span>Număr invitați</span><strong>{event.guestsCount} persoane</strong></div>
            <div className="detail-row"><span>Status</span><StatusBadge status={event.status} /></div>
            <div className="detail-row"><span>Sales Manager</span><strong>Andrei Popescu</strong></div>
          </section>

          <section className="card detail-card">
            <div className="card-title">Pachet & Meniu</div>
            <div className="detail-row"><span>Pachet</span><strong>Gold</strong></div>
            <div className="detail-row"><span>Meniu</span><strong>Meniu Gold</strong></div>
            <div className="detail-row"><span>Open Bar</span><strong>Da</strong></div>
            <div className="detail-row"><span>Candy Bar</span><strong>Da</strong></div>
            <div className="detail-row"><span>Tort</span><strong>Inclus</strong></div>
            <div className="detail-row"><span>DJ</span><strong>Inclus</strong></div>
            <div className="detail-row"><span>Decor floral</span><strong>Premium</strong></div>
            <button className="btn" style={{ marginTop: 8 }} onClick={() => setActiveTab(1)}>
              Vezi detalii pachet →
            </button>
          </section>

          <section className="card detail-card">
            <div className="card-title">Plăți</div>
            <div className="detail-row"><span>Valoare totală</span><strong>{money(event.totalAmount)}</strong></div>
            <div className="detail-row"><span>Avans plătit</span><strong>{money(event.depositAmount)}</strong></div>
            <div className="detail-row"><span>Rest de plată</span><strong style={{ color: 'var(--red)' }}>{money(event.remainingAmount)}</strong></div>
            <button className="btn primary" style={{ width: '100%', marginTop: 12 }} onClick={() => setPaymentOpen(true)}>
              <CreditCard size={16} /> Înregistrează plată
            </button>
          </section>
        </div>
      )}

      {activeTab === 1 && (
        <div className="grid content-grid">
          <section className="card detail-card">
            <div className="card-title">Sumar financiar</div>
            <div className="detail-row"><span>Valoare totală</span><strong>{money(event.totalAmount)}</strong></div>
            <div className="detail-row"><span>Avans plătit</span><strong>{money(event.depositAmount)}</strong></div>
            <div className="detail-row"><span>Total plătit</span><strong>{money(event.paidAmount)}</strong></div>
            <div className="detail-row"><span>Rest de plată</span><strong style={{ color: 'var(--red)' }}>{money(event.remainingAmount)}</strong></div>
            <button className="btn primary" style={{ marginTop: 12 }} onClick={() => setPaymentOpen(true)}>
              <CreditCard size={16} /> Înregistrează plată
            </button>
          </section>

          <section className="card detail-card">
            <div className="card-title">Contracte</div>
            {contracts.length ? contracts.map((c) => (
              <div className="detail-row" key={c.id}>
                <span>{c.contractNumber || 'Contract'}</span>
                <StatusBadge status={c.status} />
              </div>
            )) : (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                Niciun contract.{' '}
                <Link href="/contracts" style={{ color: 'var(--purple)' }}>Adaugă contract →</Link>
              </div>
            )}
          </section>

          <section className="card detail-card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <div className="card-title">Istoric plăți</div>
            </div>
            {payments.length ? (
              <div className="mini-list">
                {payments.map((p) => (
                  <div className="detail-row" key={p.id}>
                    <span>{p.paidAt ? new Date(p.paidAt).toLocaleDateString('ro-RO') : '-'}</span>
                    <span>{p.paymentMethod}</span>
                    <strong style={{ color: 'var(--green)' }}>{money(p.amount)}</strong>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '20px 0' }}>Nicio plată înregistrată.</div>
            )}
          </section>
        </div>
      )}

      {activeTab === 2 && (
        <div className="grid detail-grid">
          <section className="card detail-card">
            <div className="card-title">Meniu</div>
            <div className="detail-row"><span>Pachet</span><strong>Gold</strong></div>
            <div className="detail-row"><span>Tip meniu</span><strong>Meniu Gold — 5 feluri</strong></div>
            <div className="detail-row"><span>Mâncare aperitiv</span><strong>Platouri asortate</strong></div>
            <div className="detail-row"><span>Fel principal</span><strong>Friptură & garnitură</strong></div>
            <div className="detail-row"><span>Desert</span><strong>Tort nuntă + prăjituri</strong></div>
            <div className="detail-row"><span>Candy Bar</span><strong>Da</strong></div>
          </section>

          <section className="card detail-card">
            <div className="card-title">Băuturi & Extras</div>
            <div className="detail-row"><span>Open Bar</span><strong>Da</strong></div>
            <div className="detail-row"><span>Răcoritoare</span><strong>Incluse</strong></div>
            <div className="detail-row"><span>Șampanie</span><strong>1 sticlă / masă</strong></div>
            <div className="detail-row"><span>Cafea & ceai</span><strong>Incluse</strong></div>
          </section>

          <section className="card detail-card">
            <div className="card-title">Servicii suplimentare</div>
            <div className="detail-row"><span>DJ</span><strong>Inclus</strong></div>
            <div className="detail-row"><span>Decor floral</span><strong>Premium</strong></div>
            <div className="detail-row"><span>Tort</span><strong>Inclus (5 etaje)</strong></div>
            <div className="detail-row"><span>Foto-video</span><strong>Partener recomandat</strong></div>
          </section>
        </div>
      )}

      {activeTab === 3 && (
        <section className="card detail-card">
          <div className="card-header">
            <div className="card-title">Checklist organizare</div>
            <div className="row-subtitle">60% completat</div>
          </div>
          <div className="progress" style={{ margin: '16px 0' }}><span style={{ width: '60%' }} /></div>
          {[
            { label: 'Confirmare număr invitați', done: false, deadline: '10 Mai 2024' },
            { label: 'Plata finală', done: false, deadline: '10 Mai 2024' },
            { label: 'Degustare meniu', done: true },
            { label: 'Ședință organizare', done: true },
            { label: 'Confirmare aranjamente florale', done: true },
            { label: 'Confirmare DJ', done: true },
            { label: 'Semnat contract', done: true },
          ].map((item) => (
            <div className="detail-row" key={item.label}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 4, border: '2px solid',
                  borderColor: item.done ? 'var(--purple)' : 'var(--border)',
                  background: item.done ? 'var(--purple)' : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  color: '#fff', fontSize: 10,
                }}>
                  {item.done ? '✓' : ''}
                </span>
                {item.label}
              </span>
              <strong style={{ color: item.done ? 'var(--muted)' : 'var(--orange)' }}>
                {item.done ? 'Completat' : `Scadență: ${item.deadline}`}
              </strong>
            </div>
          ))}
        </section>
      )}

      {activeTab === 4 && (
        <section className="card detail-card">
          <div className="card-title">Fișiere atașate</div>
          <div className="empty-state" style={{ padding: '40px 0', flexDirection: 'column', gap: 12 }}>
            <FileText size={32} color="var(--muted)" />
            <span>Niciun fișier atașat.</span>
            <Link href="/contracts" className="btn">
              Mergi la contracte →
            </Link>
          </div>
        </section>
      )}

      {activeTab === 5 && (
        <section className="card detail-card">
          <div className="card-title">Note</div>
          <p className="row-subtitle" style={{ lineHeight: 1.8, marginTop: 12, whiteSpace: 'pre-wrap' }}>
            {event.notes || 'Nicio notă adăugată.'}
          </p>
          {!id.startsWith('event-') && (
            <button className="btn" style={{ marginTop: 16 }} onClick={() => setEditOpen(true)}>
              Editează notele →
            </button>
          )}
        </section>
      )}

      {editOpen && (
        <Modal
          title="Editează evenimentul"
          onClose={() => setEditOpen(false)}
          footer={
            <>
              <button className="btn" type="button" onClick={() => setEditOpen(false)}>Renunță</button>
              <button className="btn primary" type="submit" form="resource-form" disabled={submitting}>
                {submitting ? 'Se salvează...' : 'Salvează'}
              </button>
            </>
          }
        >
          <ResourceForm fields={resourceConfigs.events.fields} item={event} onSubmit={saveEvent} submitting={submitting} />
        </Modal>
      )}

      {paymentOpen && (
        <Modal
          title="Înregistrează plată"
          onClose={() => setPaymentOpen(false)}
          footer={
            <>
              <button className="btn" type="button" onClick={() => setPaymentOpen(false)}>Renunță</button>
              <button className="btn primary" type="submit" form="resource-form" disabled={submitting}>
                {submitting ? 'Se salvează...' : 'Salvează'}
              </button>
            </>
          }
        >
          <ResourceForm
            fields={paymentFields}
            item={{ amount: event.remainingAmount, paymentMethod: 'cash', status: 'succeeded' }}
            onSubmit={savePayment}
            submitting={submitting}
          />
        </Modal>
      )}
    </AppShell>
  );
}
