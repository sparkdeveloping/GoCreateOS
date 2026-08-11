'use client';
import { useEffect } from 'react';
import { apiFetch } from '@/lib/client-api';

function send(action, details = {}) {
  const kioskId = process.env.NEXT_PUBLIC_KIOSK_ID || '';
  apiFetch('/api/audit', {
    method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action,
      source: 'client-error',
      targetType: 'client',
      targetId: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      kioskId: typeof window !== 'undefined' && window.location.pathname.startsWith('/kiosk') ? kioskId : '',
      details,
    }),
  }).catch(() => {});
}

export default function ClientTelemetry() {
  useEffect(() => {
    const onError = (event) => send('client.javascript.error', {
      message: event.message || 'Unknown browser error',
      filename: event.filename || '',
      line: event.lineno || 0,
      column: event.colno || 0,
    });
    const onRejection = (event) => send('client.promise.rejection', {
      message: event.reason instanceof Error ? event.reason.message : String(event.reason || 'Unhandled promise rejection'),
    });
    const onOnline = () => send('client.network.online', { online: true });
    const onOffline = () => send('client.network.offline', { online: false });
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);
  return null;
}
