'use client';
import { useEffect, useState } from 'react';
import { Activity, ClipboardList, ScanLine, Search, ShieldCheck, UserRoundCheck } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { EmptyState, LoadingState, StatusPill } from '@/components/AdminUi';
import { apiFetch } from '@/lib/client-api';
import { formatDateTime } from '@/lib/utils';

function identity(kind, row) {
  if (kind === 'audit') return row.actorName || 'System';
  if (kind === 'scans') return row.displayName || (row.recognized ? 'Recognized badge' : 'Unknown badge');
  if (kind === 'guests') return row.displayName || 'Guest';
  if (kind === 'events') return row.displayName || row.guestName || 'System';
  return row.actorName || row.subjectName || 'System';
}
function action(kind, row) {
  if (kind === 'audit') return String(row.action || '').replaceAll('.', ' ');
  if (kind === 'scans') return String(row.outcome || 'badge scan').replaceAll('-', ' ');
  if (kind === 'guests') return `guest ${String(row.status || 'visit').replaceAll('-', ' ')}`;
  if (kind === 'events') return String(row.type || '').replaceAll('-', ' ');
  return row.message || String(row.eventType || 'activity').replaceAll('.', ' ').replaceAll('-', ' ');
}
function time(kind, row) {
  if (kind === 'audit') return row.createdAt;
  if (kind === 'guests') return row.checkInAt;
  return row.occurredAt;
}

export default function ReportsPage() {
  const [kind, setKind] = useState('activity');
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [fallback, setFallback] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load() {
    setLoading(true); setError('');
    const response = await apiFetch(`/api/reports?kind=${kind}&days=${days}`, { cache: 'no-store' });
    const result = await response.json();
    setRows(result.rows || []); setCounts(result.counts || {}); setFallback(Boolean(result.usingLegacyFallback));
    if (!response.ok) setError(result.error || 'Logs could not be loaded.');
    setLoading(false);
  }
  useEffect(() => { load(); const timer = setInterval(load, 15000); return () => clearInterval(timer); }, [kind, days]);
  const filtered = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));
  const tabs = [
    ['activity','Activity',Activity,counts.activity], ['audit','Audit',ShieldCheck,counts.audit], ['events','Attendance',ClipboardList,counts.attendance],
    ['scans','Badge scans',ScanLine,counts.scans], ['guests','Guests',UserRoundCheck,counts.guests],
  ];

  return <AppShell title="Activity & audit" subtitle="Operational activity and immutable administrative accountability, updated from the local cache">
    {error && <div className="inline-alert error">{error}</div>}
    {fallback && <div className="inline-alert success">Version 5 is displaying historical Version 4 records while the new unified activity stream begins collecting events.</div>}
    <section className="panel card-section">
      <div className="toolbar-row"><div className="segmented report-tabs">{tabs.map(([key,label,Icon,count]) => <button key={key} className={kind === key ? 'active' : ''} onClick={() => setKind(key)}><Icon size={17} />{label}<span className="tab-count">{count ?? 0}</span></button>)}</div><select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option><option value={365}>1 year</option><option value={1825}>5 years</option></select></div>
      <div className="admin-search report-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Live filter: person, badge, action, kiosk, route, IP, or detail" /></div>
      {loading ? <LoadingState /> : filtered.length ? <div className="activity-list detailed">{filtered.map((row, index) => <div key={`${kind}-${row.id || index}`}><span className="activity-dot" /><div><strong>{identity(kind,row)}</strong><p>{action(kind,row)}</p>{kind === 'activity' && <small>{row.subjectType || 'system'}{row.subjectId ? ` · ${row.subjectId}` : ''}{row.correlationId ? ` · correlation ${row.correlationId.slice(0,8)}` : ''}</small>}{kind === 'audit' && <small>{row.targetType || 'target'} · {row.targetName || row.targetId || '—'}{row.changedFields?.length ? ` · changed ${row.changedFields.join(', ')}` : ''}{row.request?.path ? ` · ${row.request.path}` : ''}</small>}{kind === 'scans' && <small>Badge {row.badgeNumber || '—'} · {row.membershipStatus || 'no membership result'}</small>}{kind === 'guests' && <small>{row.hostName ? `Host ${row.hostName}` : `Checked in by ${row.checkedInByName || 'staff'}`} · waiver {row.waiverAccepted ? `${row.waiverInitials || 'accepted'} (${row.waiverVersion || 'unknown version'})` : 'not recorded'}</small>}</div><div className="activity-right"><StatusPill tone={kind === 'audit' ? 'purple' : row.outcome === 'failed' ? 'red' : row.outcome === 'attention' ? 'yellow' : 'blue'}>{row.source || row.kioskId || kind}</StatusPill><time>{formatDateTime(time(kind,row))}</time></div></div>)}</div> : <EmptyState icon={ClipboardList} title="No matching log entries" message="The route is connected and returned zero matching rows. Increase the date range or perform a new kiosk/admin action to verify the stream." />}
    </section>
  </AppShell>;
}
