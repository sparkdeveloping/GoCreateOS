'use client';
import { useEffect } from 'react';
import { apiFetch } from '@/lib/client-api';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    const pathname = window.location.pathname;
    apiFetch('/api/audit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'client.route.error', source: 'client-error', targetType: 'page', targetId: pathname, details: { message: error?.message || 'Unknown route error', digest: error?.digest || '' } }),
    }).catch(() => {});
    const timer = pathname.startsWith('/kiosk') ? setTimeout(() => { window.location.href = '/kiosk'; }, 12000) : null;
    return () => { if (timer) clearTimeout(timer); };
  }, [error]);
  return <main className="fatal-screen"><section><img src="/GCVertical_ColorAndBlack.svg" alt="GoCreate" /><h1>This screen recovered from an error</h1><p>The event was logged. Kiosk screens automatically return to the scanner after a few seconds.</p><div><button className="btn primary" onClick={() => reset()}>Reload screen</button><a className="btn secondary" href="/kiosk">Return to kiosk</a></div></section></main>;
}
