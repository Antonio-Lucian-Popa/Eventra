'use client';

import { Bell, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PageHeader({ title, subtitle, actionLabel = 'Eveniment nou', actionsClassName = '', children }) {
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
      <div className={`toolbar ${actionsClassName}`}>
        {children !== undefined ? children : (
          <>
            <button className="btn primary" onClick={() => router.push('/events')}>
              <Plus size={16} />
              {actionLabel}
            </button>
            <div className="notification-wrap" ref={bellRef}>
              <button className={`btn icon notification-button ${bell ? 'active' : ''}`} aria-label="Notificări" onClick={() => setBell((b) => !b)}>
                <Bell size={17} />
              </button>
              {bell && (
                <div className="notification-popover">
                  <div className="row-title">Notificări</div>
                  <div className="row-subtitle">Nicio notificare nouă.</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
