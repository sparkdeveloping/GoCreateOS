'use client';
import { useEffect, useState } from 'react';
import { ExternalLink, MonitorSmartphone, QrCode, RefreshCw, RotateCcw, ScreenShare, Wifi, WifiOff } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { EmptyState, LoadingState, StatusPill } from '@/components/AdminUi';
import { apiFetch } from '@/lib/client-api';
import { formatDateTime } from '@/lib/utils';

export default function KiosksPage() {
  const [kiosks, setKiosks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function load(silent = false) {
    if (!silent) setLoading(true);
    const response = await apiFetch('/api/kiosks', { cache: 'no-store' });
    const result = await response.json();
    if (response.ok) setKiosks(result.kiosks || []);
    else setMessage(result.error || 'Kiosk status could not be loaded.');
    setLoading(false);
  }

  async function command(kioskId, commandName) {
    setMessage(`Sending ${commandName.replaceAll('-', ' ')} command…`);
    const response = await apiFetch('/api/kiosks', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kioskId, command: commandName }),
    });
    const result = await response.json();
    setMessage(response.ok ? `Command sent to ${kioskId}.` : result.error || 'Command failed.');
    await load(true);
  }

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 5000);
    return () => clearInterval(timer);
  }, []);

  return <AppShell title="Kiosk control" subtitle="See every front-desk screen and recover it remotely without walking to the kiosk" actions={<button className="btn secondary" onClick={() => load()}><RefreshCw size={18} />Refresh</button>}>
    {message && <div className="inline-alert success">{message}</div>}
    {loading ? <LoadingState label="Finding kiosks…" /> : kiosks.length ? <section className="kiosk-admin-grid">{kiosks.map((kiosk) => <article className="panel kiosk-admin-card" key={kiosk.kioskId}>
      <div className="kiosk-admin-heading"><div className={`icon-tile ${kiosk.online ? 'green' : 'red'}`}><MonitorSmartphone /></div><div><h2>{kiosk.label || kiosk.kioskId}</h2><p>{kiosk.kioskId}</p></div><StatusPill tone={kiosk.online ? 'green' : 'red'}>{kiosk.online ? <><Wifi size={14} />Online</> : <><WifiOff size={14} />Offline</>}</StatusPill></div>
      <dl className="kiosk-status-list"><div><dt>Current screen</dt><dd>{String(kiosk.mode || 'unknown').replaceAll('-', ' ')}</dd></div><div><dt>Last heartbeat</dt><dd>{formatDateTime(kiosk.heartbeatAt)}</dd></div><div><dt>Command status</dt><dd>{kiosk.commandVersion > kiosk.acknowledgedVersion ? `Waiting for command ${kiosk.commandVersion}` : 'Up to date'}</dd></div></dl>
      <div className="kiosk-command-grid">
        <button className="btn primary" onClick={() => command(kiosk.kioskId, 'reset')}><RotateCcw size={18} />Return to scanner</button>
        <button className="btn secondary" onClick={() => command(kiosk.kioskId, 'reload')}><RefreshCw size={18} />Reload browser</button>
        <button className="btn secondary" onClick={() => command(kiosk.kioskId, 'show-membership')}><QrCode size={18} />Show membership QR</button>
        <button className="btn secondary" onClick={() => command(kiosk.kioskId, 'navigate-kiosk')}><ScreenShare size={18} />Open kiosk page</button>
      </div>
    </article>)}</section> : <EmptyState icon={ExternalLink} title="No kiosk has checked in yet" message="Open the public kiosk once. It will appear here within a few seconds and can then receive remote reset commands." />}
  </AppShell>;
}
