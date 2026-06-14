'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, CreditCard, PieChart, WalletCards } from 'lucide-react';
import AppShell from '../components/AppShell';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import EventList from '../components/EventList';
import { EventDonut, RevenueChart } from '../components/Charts';
import { demoStats, demoVenues } from '../lib/demo-data';
import { loadDashboard } from '../lib/api';

function money(value) {
  return `${Number(value || 0).toLocaleString('ro-RO')} €`;
}

export default function DashboardPage() {
  const [data, setData] = useState({ summary: demoStats, events: [], venues: demoVenues });

  useEffect(() => {
    loadDashboard().then(setData);
  }, []);

  const stats = data.summary || demoStats;
  const occupancy = stats.occupancyRate || Math.round((data.venues?.[0]?.occupancyRate || 76));

  return (
    <AppShell>
      <PageHeader title="Dashboard" subtitle="Bună ziua, Andrei! 👋 Iată o privire generală asupra afacerii tale." />

      <div className="grid stats-grid">
        <StatCard label="Evenimente în Mai" value={stats.currentMonthEvents || 18} note="5 confirmate ↑" icon={<CalendarDays size={28} />} />
        <StatCard label="Încasări estimate" value={money(stats.estimatedRevenue)} note="+12.5% față de luna trecută" tone="green" icon={<WalletCards size={28} />} />
        <StatCard label="Avansuri restante" value={money(stats.outstandingDeposits)} note="7 evenimente" tone="orange" icon={<CreditCard size={28} />} />
        <StatCard label="Grad ocupare locații" value={`${occupancy}%`} note="31 din 41 zile ocupate" tone="blue" icon={<PieChart size={28} />} />
      </div>

      <div className="grid content-grid" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="card-header">
            <div className="card-title">Urmează în 7 zile</div>
          </div>
          <EventList events={data.events} />
        </section>

        <section className="card chart-card">
          <div className="card-header">
            <div className="card-title">Încasări (estimat vs încasat)</div>
            <div className="row-subtitle">Estimat &nbsp; Încasat</div>
          </div>
          <RevenueChart />
        </section>
      </div>

      <div className="grid lower-grid" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="card-header">
            <div className="card-title">Avansuri restante</div>
          </div>
          <div className="mini-list">
            {data.events.slice(0, 3).map((event) => (
              <div className="detail-row" key={event.id}>
                <span>{event.title}</span>
                <strong style={{ color: 'var(--red)' }}>{money(event.remainingAmount)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div className="card-title">Top locații după ocupare</div>
          </div>
          <div className="mini-list">
            {(data.venues?.length ? data.venues : demoVenues).slice(0, 4).map((venue) => (
              <div className="progress-row" key={venue.id || venue.venueId}>
                <span>{venue.name || venue.venueName}</span>
                <div className="progress">
                  <span style={{ width: `${venue.occupancyRate || 60}%` }} />
                </div>
                <strong>{venue.occupancyRate || 60}%</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div className="card-title">Evenimente pe tip</div>
          </div>
          <EventDonut />
        </section>
      </div>
    </AppShell>
  );
}
