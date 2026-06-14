'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  Home,
  MapPin,
  MenuSquare,
  Package,
  Receipt,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { demoUser } from '../lib/demo-data';
import { useAuth } from '../lib/AuthContext';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/events', label: 'Evenimente', icon: ClipboardList },
  { href: '/clients', label: 'Clienți', icon: Users },
  { href: '/contracts', label: 'Contracte', icon: FileText },
  { href: '/invoices', label: 'Facturi', icon: Receipt },
  { href: '/offers', label: 'Oferte', icon: MenuSquare },
  { href: '/payments', label: 'Plăți', icon: CreditCard },
  { href: '/venues', label: 'Locații', icon: MapPin },
  { href: '/leads', label: 'Lead-uri', icon: Package },
  { href: '/reports', label: 'Rapoarte', icon: BarChart3 },
  { href: '/settings', label: 'Setări', icon: Settings },
];

const mobileItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/events', label: 'Evenimente', icon: ClipboardList },
];

const mobileMoreItems = navItems.filter((item) => !mobileItems.some((mobileItem) => mobileItem.href === item.href));

function isActive(pathname, href, label) {
  if (href === '/') return pathname === '/';
  if (label === 'Evenimente') return pathname.startsWith('/events');
  return pathname.startsWith(href);
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, isAuthenticated, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (ready && !isAuthenticated) router.replace('/login');
  }, [ready, isAuthenticated, router]);

  if (ready && !isAuthenticated) return null;

  const displayUser = user || demoUser;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <div className="brand-mark">EP</div>
          <div>
            <div className="brand-title">EventPro</div>
            <div className="brand-subtitle">Management Evenimente</div>
          </div>
        </Link>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={`${item.label}-${item.href}`} href={item.href} className={`nav-item ${isActive(pathname, item.href, item.label) ? 'active' : ''}`}>
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">A</div>
          <div>
            <div className="brand-title">{displayUser.name}</div>
            <button className="logout-link" onClick={logout} type="button">
              Ieși din cont
            </button>
          </div>
        </div>
      </aside>

      <main className="main-area">{children}</main>

      <nav className="mobile-bar">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className={isActive(pathname, item.href, item.label) ? 'active' : ''}>
              <span className="mobile-nav-item">
                <Icon size={20} />
                <span>{item.label}</span>
              </span>
            </Link>
          );
        })}
        <button className={`mobile-more-trigger ${moreOpen ? 'active' : ''}`} type="button" onClick={() => setMoreOpen(true)}>
          <span className="mobile-nav-item">
            <MenuSquare size={20} />
            <span>Mai multe</span>
          </span>
        </button>
      </nav>

      {moreOpen ? (
        <div className="mobile-drawer-layer" role="presentation" onClick={() => setMoreOpen(false)}>
          <aside className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Navigare rapidă" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div>
                <div className="brand-title">Mai multe</div>
                <div className="brand-subtitle">Navigare EventPro</div>
              </div>
              <button className="btn icon" type="button" aria-label="Închide meniul" onClick={() => setMoreOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="mobile-drawer-grid">
              {mobileMoreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={`mobile-more-${item.label}`}
                    href={item.href}
                    className={`mobile-drawer-link ${isActive(pathname, item.href, item.label) ? 'active' : ''}`}
                    onClick={() => setMoreOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mobile-drawer-user">
              <div className="avatar">A</div>
              <div>
                <div className="brand-title">{displayUser.name}</div>
                <button className="logout-link" onClick={logout} type="button">
                  Ieși din cont
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
