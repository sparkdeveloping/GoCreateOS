'use client';
import { useEffect, useState } from 'react';
import { Activity, BadgeCheck, Clock3, DoorOpen, RefreshCw, ShieldCheck, UserRoundCheck, Users } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { EmptyState, LoadingState, MetricCard, SimpleBars, StatusPill } from '@/components/AdminUi';
import { formatDateTime } from '@/lib/utils';
import { apiFetch } from '@/lib/client-api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [cacheRefreshing, setCacheRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const [syncProgress, setSyncProgress] = useState(null);
  async function load() {
    setError('');
    const response = await apiFetch('/api/summary');
    const result = await response.json();
    if (!response.ok) setError(result.error || 'Dashboard data could not be loaded.');
    else setData(result);
  }
  async function pollSync() {
    try {
      const response = await apiFetch('/api/sync', { cache: 'no-store' });
      const result = await response.json();
      if (response.ok) {
        setSyncing(Boolean(result.running));
        setSyncProgress(result.progress || null);
        if (!result.running && result.progress?.phase === 'complete') {
          setNotice(result.progress.message || 'Directory refresh complete.');
        }
      }
    } catch {}
  }
  async function syncDirectory() {
    setSyncing(true);
    setNotice('');
    setError('');
    const response = await apiFetch('/api/sync', { method: 'POST' });
    const result = await response.json();
    if (!response.ok) {
      setSyncing(false);
      setError(result.error || 'Directory sync could not be started.');
    } else {
      setNotice(result.alreadyRunning ? 'A directory refresh is already running.' : 'Directory refresh started. Live progress is shown below.');
      await pollSync();
    }
  }
  async function refreshCache() {
    setCacheRefreshing(true);
    setNotice('');
    const response = await apiFetch('/api/cache', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'incremental' }),
    });
    const result = await response.json();
    setCacheRefreshing(false);
    if (!response.ok) setError(result.error || 'Local cache refresh could not be requested.');
    else setNotice('Local cache refresh requested. Reload the dashboard in a few seconds to see cloud changes.');
  }
  useEffect(() => { load(); pollSync(); const timer = setInterval(pollSync, 2500); return () => clearInterval(timer); }, []);
  return <AppShell title="Operations dashboard" subtitle="Live occupancy, activity, staffing, guests, and directory health" actions={<><button className="btn secondary" onClick={syncDirectory} disabled={syncing}><RefreshCw className={syncing ? 'spin' : ''} size={18} />{syncing ? 'Starting…' : 'Sync GoCreate'}</button><button className="btn secondary" onClick={refreshCache} disabled={cacheRefreshing}><RefreshCw className={cacheRefreshing ? 'spin' : ''} size={18} />{cacheRefreshing ? 'Requesting…' : 'Refresh cloud cache'}</button><button className="btn secondary" onClick={load}><RefreshCw size={18} />Reload screen</button></>}>
    {error && <div className="inline-alert error">{error}</div>}
    {notice && <div className="inline-alert success">{notice}</div>}
    {syncProgress && (syncing || syncProgress.phase === 'failed') && <section className={`sync-progress-panel ${syncProgress.phase === 'failed' ? 'failed' : ''}`}><div><strong>{syncProgress.message || 'Working…'}</strong><span>{syncProgress.phase ? String(syncProgress.phase).replaceAll('-', ' ') : 'sync'} · {syncProgress.percent || 0}%</span></div><div className="sync-progress-track"><i style={{ width: `${syncProgress.percent || 0}%` }} /></div>{syncProgress.details?.records ? <small>{syncProgress.details.records} records read so far</small> : null}</section>}
    {!data ? <LoadingState /> : <>
      <section className="metric-grid">
        <MetricCard icon={DoorOpen} label="Inside now" value={data.cards.currentOccupancy} detail="Current member occupancy" tone="green" />
        <MetricCard icon={UserRoundCheck} label="Guests inside" value={data.cards.guestsInside} detail="Open guest visits" tone="yellow" />
        <MetricCard icon={Clock3} label="Employee hours" value={data.cards.employeeHours} detail="Last 14 days" tone="purple" />
        <MetricCard icon={BadgeCheck} label="Linked badges" value={data.cards.badges} detail={`${data.cards.accessEnabled} requested enabled`} tone="blue" />
      </section>
      <section className="dashboard-grid">
        <article className="panel card-section span-2"><div className="section-heading"><div><p className="eyebrow">Last 14 days</p><h2>Daily arrivals</h2></div><StatusPill tone="blue">{data.cards.memberCheckIns} check-ins</StatusPill></div>
          <SimpleBars rows={data.daily.map((day) => ({ label: new Date(`${day.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), value: day.checkIns }))} />
        </article>
        <article className="panel card-section"><div className="section-heading"><div><p className="eyebrow">Directory</p><h2>People snapshot</h2></div><Users /></div>
          <div className="mini-stats"><div><strong>{data.cards.people}</strong><span>Synced people</span></div><div><strong>{data.cards.employees}</strong><span>Employees</span></div><div><strong>{data.cards.admins}</strong><span>Admins</span></div></div>
          <div className="sync-card"><span className={`sync-dot ${data.sync?.status === 'success' ? 'ok' : 'warn'}`} /><div><strong>{data.sync?.status === 'success' ? 'Directory current' : 'Check directory sync'}</strong><p>{data.sync?.finishedAt ? `Directory finished ${formatDateTime(data.sync.finishedAt)}` : 'No directory sync run has been recorded.'}</p><p>Local cache {data.cache?.lastSyncAt ? `updated ${formatDateTime(data.cache.lastSyncAt)}` : 'is still initializing'} · {Number(data.cache?.pendingWrites?.pending || 0) + Number(data.cache?.pendingWrites?.failed || 0)} cloud writes queued</p></div></div>
        </article>
        <article className="panel card-section span-2"><div className="section-heading"><div><p className="eyebrow">Live feed</p><h2>Recent activity</h2></div><Activity /></div>
          {data.recentEvents.length ? <div className="activity-list">{data.recentEvents.slice(0, 10).map((event) => <div key={event.id}><span className="activity-dot" /><div><strong>{event.displayName || event.guestName || 'System event'}</strong><p>{String(event.type || '').replaceAll('-', ' ')}</p></div><time>{formatDateTime(event.occurredAt)}</time></div>)}</div> : <EmptyState icon={Activity} title="No activity yet" message="Scans, guest visits, and employee clock events will appear here." />}
        </article>
        <article className="panel card-section"><div className="section-heading"><div><p className="eyebrow">Door access</p><h2>Requested state</h2></div><ShieldCheck /></div><div className="donut-summary"><div className="donut" style={{ '--percent': `${data.cards.badges ? Math.round(data.cards.accessEnabled / data.cards.badges * 100) : 0}%` }}><span>{data.cards.badges ? Math.round(data.cards.accessEnabled / data.cards.badges * 100) : 0}%</span></div><div><p><i className="legend enabled" />{data.cards.accessEnabled} should have access</p><p><i className="legend disabled" />{data.cards.accessDisabled} should be disabled</p></div></div></article>
      </section>
    </>}
  </AppShell>;
}
