'use client';

import { Bell, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PageHeader({ title, subtitle, actionLabel = 'Eveniment nou', children }) {
  const router = useRouter();
  const [bell, setBell] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    if (!bell) return undefined;
    function onClickOutside(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBell(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [bell]);

  return (
    <header className="page-header">
      <div>
        <h1 className="title">{title}</h1>
        {subtitle ? <div className="eyebrow">{subtitle}</div> : null}
      </div>
      <div className="toolbar">
        {children !== undefined ? children : (
          <>
            <button className="btn primary" onClick={() => router.push('/events')}>
              <Plus size={16} />
              {actionLabel}
            </button>
            <div style={{ position: 'relative' }} ref={bellRef}>
              <button className="btn icon" aria-label="Notificări" onClick={() => setBell((b) => !b)}>
                <Bell size={17} />
              </button>
              {bell && (
                <div style={{
                  position: 'absolute', right: 0, top: '110%',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '12px 16px', zIndex: 50,
                  minWidth: 220, boxShadow: '0 4px 16px rgba(0,0,0,.15)',
                  fontSize: 13, color: 'var(--muted)',
                }}>
                  Nicio notificare nouă.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
