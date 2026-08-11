'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity, Archive, CircleGauge, Database, Download, Factory, HardDrive,
  MailCheck, MonitorSmartphone, RefreshCcw, RefreshCw, RotateCcw, Server,
  ShieldAlert, Trash2, Wifi,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { EmptyState, LoadingState, StatusPill } from '@/components/AdminUi';
import { apiFetch, downloadApiFile } from '@/lib/client-api';
import { formatDateTime } from '@/lib/utils';

const empty = { email: '', pin: '', phrase: '' };

function bytes(value) {
  const amount = Number(value || 0);
  if (amount < 1024) return `${amount} B`;
  if (amount < 1024 ** 2) return `${Math.round(amount / 1024)} KB`;
  if (amount < 1024 ** 3) return `${Math.round(amount / 1024 ** 2 * 10) / 10} MB`;
  return `${Math.round(amount / 1024 ** 3 * 10) / 10} GB`;
}

function duration(seconds) {
  const total = Math.max(0, Number(seconds || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor(total % 86400 / 3600);
  const minutes = Math.floor(total % 3600 / 60);
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', `${minutes}m`].filter(Boolean).join(' ');
}

function HealthRow({ label, ok, detail }) {
  return <div className="system-health-row"><span className={`health-dot ${ok ? 'ok' : 'down'}`} /><div><strong>{label}</strong><small>{detail}</small></div><StatusPill tone={ok ? 'green' : 'red'}>{ok ? 'Online' : 'Attention'}</StatusPill></div>;
}

export default function SystemPage() {
  const [overview, setOverview] = useState(null);
  const [maintenance, setMaintenance] = useState(null);
  const [form, setForm] = useState(empty);
  const [jobId, setJobId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState('health');

  async function load() {
    const [controlResponse, maintenanceResponse] = await Promise.all([
      apiFetch('/api/system/control', { cache: 'no-store' }),
      apiFetch(`/api/system/maintenance${jobId ? `?jobId=${jobId}` : ''}`, { cache: 'no-store' }),
    ]);
    const [controlResult, maintenanceResult] = await Promise.all([controlResponse.json(), maintenanceResponse.json()]);
    if (controlResponse.ok) setOverview(controlResult);
    else setMessage(controlResult.error || 'System overview could not be loaded.');
    if (maintenanceResponse.ok) setMaintenance(maintenanceResult);
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [jobId]);

  async function runControl(action, extras = {}) {
    setBusy(action);
    setMessage('');
    const response = await apiFetch('/api/system/control', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, ...extras }),
    });
    const result = await response.json();
    setBusy('');
    setMessage(response.ok ? result.message : result.error || 'System action failed.');
    if (response.ok) load();
  }

  async function runMaintenance(action) {
    const required = action === 'nuke' ? 'NUKE' : 'FACTORY RESET';
    if (form.phrase.trim().toUpperCase() !== required) {
      setMessage(`Type ${required} exactly before continuing.`);
      return;
    }
    setBusy(action);
    setMessage('Starting protected maintenance job…');
    const response = await apiFetch('/api/system/maintenance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, ...form }),
    });
    const result = await response.json();
    setBusy('');
    if (!response.ok) setMessage(result.error || 'Maintenance could not start.');
    else {
      setJobId(result.jobId);
      setForm(empty);
      setMessage(result.message);
    }
  }

  const job = maintenance?.job || maintenance?.jobs?.[0];
  const queueTotal = useMemo(() => Number(overview?.cache?.pendingWrites?.pending || 0) + Number(overview?.cache?.pendingWrites?.failed || 0), [overview]);

  return <AppShell title="System tools" subtitle="Health, recovery, backups, synchronization, diagnostics, and protected maintenance" actions={<button className="btn secondary" onClick={load}><RefreshCw size={18} />Refresh</button>}>
    {message && <div className={`inline-alert ${message.includes('completed') || message.includes('queued') || message.includes('succeeded') || message.includes('requested') ? 'success' : 'error'}`}>{message}</div>}
    {!overview || !maintenance ? <LoadingState /> : <>
      <div className="system-tabs" role="tablist">
        {['health', 'controls', 'logs', 'maintenance'].map((name) => <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>{name === 'health' ? 'Health' : name === 'controls' ? 'Controls & backups' : name === 'logs' ? 'Diagnostics' : 'Destructive maintenance'}</button>)}
      </div>

      {tab === 'health' && <>
        <section className="metric-grid system-metrics">
          <article className="metric-card"><div className="metric-icon blue"><Server /></div><div><span>Core server</span><strong>Version {overview.version}</strong><small>{overview.resources.hostname} · uptime {duration(overview.resources.uptimeSeconds)}</small></div></article>
          <article className="metric-card"><div className="metric-icon green"><Database /></div><div><span>Local cache</span><strong>{overview.cache.ready ? 'Ready' : 'Needs attention'}</strong><small>{overview.cache.people} people · {overview.cache.openVisits} inside</small></div></article>
          <article className="metric-card"><div className="metric-icon yellow"><Archive /></div><div><span>Pending cloud writes</span><strong>{queueTotal}</strong><small>{overview.cache.pendingWrites?.failed || 0} failed</small></div></article>
          <article className="metric-card"><div className="metric-icon purple"><MonitorSmartphone /></div><div><span>Kiosks online</span><strong>{overview.kiosks.filter((kiosk) => kiosk.online).length} / {overview.kiosks.length || 1}</strong><small>Heartbeat within 45 seconds</small></div></article>
        </section>

        <section className="system-health-grid">
          <article className="panel card-section">
            <div className="section-heading"><div><p className="eyebrow">Services</p><h2>Runtime health</h2></div><CircleGauge /></div>
            <div className="system-health-list">
              <HealthRow label="Next.js core" ok detail="This page is responding" />
              <HealthRow label="SQLite cache worker" ok={overview.workers.cache.running && overview.cache.ready} detail={overview.workers.cache.running ? `PID ${overview.workers.cache.pid}` : 'PID file missing or stale'} />
              <HealthRow label="Operations worker" ok={overview.workers.operations.running} detail={overview.workers.operations.running ? `PID ${overview.workers.operations.pid}` : 'Automatic checkout and cleanup worker is not running'} />
              <HealthRow label="GoCreate sync service" ok={overview.sync.reachable && overview.sync.ok !== false} detail={overview.sync.reachable ? overview.sync.message || overview.sync.status || 'Reachable' : overview.sync.error} />
              <HealthRow label="Firestore queue" ok={!overview.cache.pendingWrites?.failed} detail={`${queueTotal} writes awaiting upload`} />
            </div>
          </article>
          <article className="panel card-section">
            <div className="section-heading"><div><p className="eyebrow">Computer</p><h2>Resource use</h2></div><HardDrive /></div>
            <div className="resource-gauges">
              <div><span>Memory</span><strong>{overview.resources.memory.usedPercent}%</strong><i><b style={{ width: `${Math.min(100, overview.resources.memory.usedPercent)}%` }} /></i><small>{bytes(overview.resources.memory.usedBytes)} of {bytes(overview.resources.memory.totalBytes)}</small></div>
              {overview.resources.disk && <div><span>Disk</span><strong>{overview.resources.disk.usedPercent}%</strong><i><b style={{ width: `${Math.min(100, overview.resources.disk.usedPercent)}%` }} /></i><small>{bytes(overview.resources.disk.freeBytes)} free</small></div>}
            </div>
            <dl className="system-detail-list"><div><dt>Platform</dt><dd>{overview.resources.platform}</dd></div><div><dt>CPU threads</dt><dd>{overview.resources.cpuCount}</dd></div><div><dt>Last cache sync</dt><dd>{formatDateTime(overview.cache.lastSyncAt)}</dd></div></dl>
          </article>
          <article className="panel card-section span-2">
            <div className="section-heading"><div><p className="eyebrow">Local data</p><h2>Operational table counts</h2></div><Database /></div>
            <div className="table-count-grid">{Object.entries(overview.cache.tableCounts || {}).map(([name, value]) => <div key={name}><strong>{value}</strong><span>{name.replace(/([A-Z])/g, ' $1')}</span></div>)}</div>
          </article>
        </section>
      </>}

      {tab === 'controls' && <>
        <section className="system-action-grid">
          <article className="panel system-action"><Archive /><div><h2>Create backup</h2><p>Writes a timestamped Version 5 JSON backup before maintenance or operational changes.</p></div><button className="btn primary" disabled={busy} onClick={() => runControl('backup')}>{busy === 'backup' ? 'Creating…' : 'Back up now'}</button></article>
          <article className="panel system-action"><RefreshCcw /><div><h2>Directory synchronization</h2><p>Starts the authenticated GoCreate scraper for memberships, users, machines, and reservations.</p></div><button className="btn primary" disabled={busy} onClick={() => runControl('directory-sync')}>{busy === 'directory-sync' ? 'Starting…' : 'Force sync'}</button></article>
          <article className="panel system-action"><Database /><div><h2>Reconcile local cache</h2><p>Runs a full Firestore-to-SQLite reconciliation without waiting for the normal interval.</p></div><button className="btn secondary" disabled={busy} onClick={() => runControl('cache-refresh', { mode: 'full' })}>Refresh cache</button></article>
          <article className="panel system-action"><Activity /><div><h2>Attendance reconciliation</h2><p>Applies configured stale-visit and automatic checkout policy immediately.</p></div><button className="btn secondary" disabled={busy} onClick={() => runControl('attendance-reconcile')}>Run policy</button></article>
          <article className="panel system-action"><MonitorSmartphone /><div><h2>Reset every kiosk</h2><p>Returns connected kiosks to the main scanner screen without restarting the server.</p></div><button className="btn secondary" disabled={busy} onClick={() => runControl('reset-kiosks')}>Reset kiosks</button></article>
          <article className="panel system-action"><MailCheck /><div><h2>Test Gmail</h2><p>Verifies the configured Gmail SMTP account and app password without sending a message.</p></div><button className="btn secondary" disabled={busy} onClick={() => runControl('test-email')}>Test email</button></article>
          <article className="panel system-action critical-soft"><RotateCcw /><div><h2>Restart backend</h2><p>Asks the Windows watchdog to restart Next.js, SQLite cache, operations, and sync services.</p></div><button className="btn danger" disabled={busy} onClick={() => runControl('restart-backend')}>Restart services</button></article>
          <article className="panel system-action"><MonitorSmartphone /><div><h2>Restart kiosk browser</h2><p>Asks the kiosk watchdog to close and relaunch Chrome in full-screen kiosk mode.</p></div><button className="btn secondary" disabled={busy} onClick={() => runControl('restart-kiosk-browser')}>Restart Chrome</button></article>
        </section>
        <section className="panel card-section">
          <div className="section-heading"><div><p className="eyebrow">Backups</p><h2>Recent local backups</h2></div><Archive /></div>
          {!overview.backups.length ? <EmptyState icon={Archive} title="No backups yet" message="Create one before major data or configuration changes." /> : <div className="backup-list">{overview.backups.map((backup) => <div key={backup.name}><Archive /><span><strong>{backup.name}</strong><small>{formatDateTime(backup.createdAt)} · {bytes(backup.bytes)}</small></span></div>)}</div>}
        </section>
      </>}

      {tab === 'logs' && <>
        <section className="panel card-section diagnostics-heading">
          <div className="section-heading"><div><p className="eyebrow">Support bundle</p><h2>Diagnostics without credentials</h2></div><Wifi /></div>
          <p>The bundle contains service health, table counts, kiosk heartbeat state, resource usage, backup metadata, and redacted error-log tails.</p>
          <button className="btn primary" onClick={() => downloadApiFile('/api/system/control?download=diagnostics', 'gocreate-diagnostics.json')}><Download size={18} />Download diagnostics</button>
        </section>
        <section className="diagnostic-log-grid">{Object.entries(overview.logs || {}).map(([name, content]) => <article className="panel log-card" key={name}><header><strong>{name}</strong><StatusPill tone={content ? 'yellow' : 'green'}>{content ? 'Has output' : 'Clear'}</StatusPill></header><pre>{content || 'No recent error output.'}</pre></article>)}</section>
      </>}

      {tab === 'maintenance' && <>
        {job && <section className={`maintenance-progress panel ${job.status === 'failed' ? 'failed' : ''}`}><div className="section-heading"><div><p className="eyebrow">Latest maintenance job</p><h2>{job.message}</h2></div><StatusPill tone={job.status === 'complete' ? 'green' : job.status === 'failed' ? 'red' : 'yellow'}>{job.status}</StatusPill></div><div className="sync-progress-track"><i style={{ width: `${job.progress || 0}%` }} /></div><div className="maintenance-details"><span>{job.progress || 0}% complete</span><span>Started {formatDateTime(job.createdAt)}</span>{job.details?.backupPath && <span>Backup: {job.details.backupPath}</span>}</div></section>}
        <section className="destructive-grid">
          <article className="panel destructive-card"><div className="icon-tile yellow"><Trash2 /></div><h2>Nuke operational data</h2><p>Clears visits, attendance, schedules, guest activity, scans, communications, audit history, and system-run history. People, badges, roles, settings, and directory records remain.</p><ul><li>Creates a complete backup first</li><li>Resets every kiosk</li><li>Deletes matching local and Firestore records</li></ul><code>Required phrase: NUKE</code><button className="btn danger" disabled={busy} onClick={() => runMaintenance('nuke')}><Trash2 size={18} />Nuke operational data</button></article>
          <article className="panel destructive-card critical"><div className="icon-tile red"><Factory /></div><h2>Factory reset</h2><p>Clears operational and directory data, then starts a completely fresh GoCreate synchronization.</p><ul><li>Creates a complete backup first</li><li>Badge links are removed</li><li>Directory records return after sync</li></ul><code>Required phrase: FACTORY RESET</code><button className="btn danger" disabled={busy} onClick={() => runMaintenance('factory-reset')}><Factory size={18} />Factory reset and resync</button></article>
        </section>
        <section className="panel card-section maintenance-confirm"><div className="section-heading"><div><p className="eyebrow">Three-part confirmation</p><h2>Required for destructive actions</h2></div><ShieldAlert /></div><div className="field-grid"><label className="field"><span>Confirmation email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder={maintenance.confirmationEmailHint} /></label><label className="field"><span>PIN</span><input type="password" inputMode="numeric" value={form.pin} onChange={(event) => setForm({ ...form, pin: event.target.value })} /></label><label className="field"><span>Typed phrase</span><input value={form.phrase} onChange={(event) => setForm({ ...form, phrase: event.target.value })} placeholder="NUKE or FACTORY RESET" /></label></div><p className="muted-block">The core server validates all three fields. The worker completes a timestamped backup before deleting the first record.</p></section>
      </>}
    </>}
  </AppShell>;
}
