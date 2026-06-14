'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import PageHeader from '../../components/PageHeader';
import { apiFetch } from '../../lib/api';

const WEEKDAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
const MONTHS_RO = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
const VENUES = ['Salon Imperial', 'Salon Crystal', 'Salon Royal'];

const DEMO_EVENTS = [
  { day: 4, title: 'Nuntă A & M', venue: 'Salon Imperial', type: 'wedding' },
  { day: 5, title: 'Botez David', venue: 'Salon Royal', type: 'baptism' },
  { day: 8, title: 'Corporate', venue: 'Salon Crystal', type: 'corporate' },
  { day: 10, title: 'Majorat Alex', venue: 'Salon Crystal', type: 'birthday' },
  { day: 11, title: 'Nuntă D & R', venue: 'Salon Imperial', type: 'wedding' },
  { day: 15, title: 'Majorat Alex', venue: 'Salon Crystal', type: 'birthday' },
  { day: 18, title: 'Botez Matei', venue: 'Salon Royal', type: 'baptism' },
  { day: 22, title: 'Nuntă G & V', venue: 'Salon Imperial', type: 'wedding' },
  { day: 24, title: 'Majorat David', venue: 'Salon Crystal', type: 'birthday' },
  { day: 26, title: 'Botez Sofia', venue: 'Salon Royal', type: 'baptism' },
  { day: 28, title: 'Corporate', venue: 'Salon Imperial', type: 'corporate' },
  { day: 31, title: 'Nuntă P & A', venue: 'Salon Imperial', type: 'wedding' },
];

function buildCells(year, month) {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0, Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, current: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
  const rem = 7 - (cells.length % 7);
  if (rem < 7) for (let d = 1; d <= rem; d++) cells.push({ day: d, current: false });
  return cells;
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [venueFilter, setVenueFilter] = useState(null);
  const [events, setEvents] = useState(DEMO_EVENTS);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  useEffect(() => {
    const mm = String(month + 1).padStart(2, '0');
    const lastDay = new Date(year, month + 1, 0).getDate();
    apiFetch(`/events/calendar?startDate=${year}-${mm}-01&endDate=${year}-${mm}-${lastDay}`)
      .then((items) => {
        if (items?.length) {
          setEvents(items.map((e) => ({
            day: new Date(e.eventDate).getDate(),
            title: e.title,
            venue: e.venue?.name || 'Locație',
            type: e.eventType,
          })));
        } else {
          setEvents(DEMO_EVENTS);
        }
      })
      .catch(() => setEvents(DEMO_EVENTS));
  }, [year, month]);

  const cells = useMemo(() => buildCells(year, month), [year, month]);
  const filtered = useMemo(
    () => (venueFilter ? events.filter((e) => e.venue === venueFilter) : events),
    [events, venueFilter],
  );

  return (
    <AppShell>
      <PageHeader title="Calendar - Locații" subtitle="Vizualizează evenimentele pe toate locațiile">
        <button className="btn icon" aria-label="Înapoi" onClick={prevMonth}>
          <ChevronLeft size={16} />
        </button>
        <button className="btn" style={{ minWidth: 140 }}>{MONTHS_RO[month]} {year}</button>
        <button className="btn icon" aria-label="Înainte" onClick={nextMonth}>
          <ChevronRight size={16} />
        </button>
      </PageHeader>

      <section className="card calendar-shell" style={{ padding: 18 }}>
        <div className="calendar-toolbar">
          <div className="toolbar">
            <button
              className={`btn ${!venueFilter ? 'primary' : ''}`}
              onClick={() => setVenueFilter(null)}
            >
              Toate locațiile
            </button>
            {VENUES.map((v) => (
              <button
                key={v}
                className={`btn ${venueFilter === v ? 'primary' : ''}`}
                onClick={() => setVenueFilter(venueFilter === v ? null : v)}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="row-subtitle">{filtered.length} evenimente active</div>
        </div>

        <div className="calendar-scroll">
          <div className="calendar-grid">
            {WEEKDAYS.map((day) => (
              <div className="weekday" key={day}>{day}</div>
            ))}
            {cells.map((cell, index) => (
              <div
                className="day-cell"
                key={index}
                style={!cell.current ? { opacity: 0.35 } : undefined}
              >
                <div className="day-num">{cell.day}</div>
                {cell.current && filtered
                  .filter((e) => e.day === cell.day)
                  .map((e) => (
                    <div className={`cal-event ${e.type || ''}`} key={`${cell.day}-${e.title}`}>
                      {e.title}
                      <br />
                      <span>{e.venue}</span>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
