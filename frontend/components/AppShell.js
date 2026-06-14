'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
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
  { href: '/settings', label: 'Mai multe', icon: MenuSquare },
];

function isActive(pathname, href, label) {
  if (href === '/') return pathname === '/';
  if (label === 'Evenimente') return pathname.startsWith('/events');
  return pathname.startsWith(href);
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, isAuthenticated, logout } = useAuth();

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
            <Link key={item.label} href={item.href}>
              <span>
                <Icon size={20} />
                <br />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
