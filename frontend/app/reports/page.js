'use client';

import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useState } from 'react';
import AppShell from '../../components/AppShell';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import { EventDonut, RevenueChart } from '../../components/Charts';
import { demoVenues } from '../../lib/demo-data';

const MONTHS_RO = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  return (
    <AppShell>
      <PageHeader title="Rapoarte" subtitle="Analizează performanța afacerii">
        <button className="btn icon" aria-label="Luna anterioară" onClick={prevMonth}>
          <ChevronLeft size={16} />
        </button>
        <button className="btn" style={{ minWidth: 140 }}>{MONTHS_RO[month]} {year}</button>
        <button className="btn icon" aria-label="Luna următoare" onClick={nextMonth}>
          <ChevronRight size={16} />
        </button>
        <button className="btn primary" onClick={() => window.print()}>
          <Download size={16} />
          Exportă
        </button>
      </PageHeader>

      <div className="grid stats-grid">
        <StatCard label="Încasări totale" value="62.300 €" note="+10%" tone="green" />
        <StatCard label="Evenimente" value="18" note="+5" />
        <StatCard label="Valoare medie / eveniment" value="3.461 €" note="+12%" tone="orange" />
        <StatCard label="Rata de ocupare" value="76%" note="+8%" tone="blue" />
      </div>

      <div className="grid content-grid" style={{ marginTop: 18 }}>
        <section className="card chart-card">
          <div className="card-header">
            <div className="card-title">Încasări pe săptămâni</div>
          </div>
          <RevenueChart />
        </section>
        <section className="card">
          <div className="card-header">
            <div className="card-title">Evenimente pe tip</div>
          </div>
          <EventDonut />
        </section>
      </div>

      <section className="card table-card" style={{ marginTop: 18 }}>
        <div className="card-header">
          <div className="card-title">Top locații</div>
        </div>
        <div className="mini-list">
          {demoVenues.map((venue) => (
            <div className="progress-row" key={venue.id}>
              <span>{venue.name}</span>
              <div className="progress"><span style={{ width: `${venue.occupancyRate}%` }} /></div>
              <strong>{venue.occupancyRate}%</strong>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
