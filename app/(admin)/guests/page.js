'use client';
import { useEffect, useMemo, useState } from 'react';
import { Download, LogOut, Mail, Search, ShieldCheck, UserRoundCheck, UsersRound } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { EmptyState, LoadingState, StatusPill } from '@/components/AdminUi';
import { apiFetch, downloadApiFile } from '@/lib/client-api';
import { formatDate, formatDateTime } from '@/lib/utils';

export default function GuestsPage() {
  const [visits, setVisits] = useState([]);
  const [days, setDays] = useState(30);
  const [query, setQuery] = useState('');
  const [recipients, setRecipients] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function load(nextDays = days) {
    setLoading(true);
    const response = await apiFetch(`/api/guests?days=${nextDays}`);
    const result = await response.json();
    setVisits(result.visits || []);
    setRecipients(result.recipients || recipients);
    setLoading(false);
  }
  useEffect(() => { load(days); }, [days]);

  async function checkOut(visitId) {
    const response = await apiFetch('/api/guests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ visitId, action: 'check-out' }) });
    const result = await response.json();
    if (response.ok) load(); else setMessage(result.error);
  }

  async function emailReport() {
    setMessage('Sending guest report…');
    const response = await apiFetch('/api/email/guests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ recipients, days }) });
    const result = await response.json();
    setMessage(response.ok ? result.message : result.error);
  }

  const filtered = useMemo(() => visits.filter((visit) => [visit.displayName, visit.hostName, visit.checkedInByName, visit.phone, visit.waiverInitials].some((value) => String(value || '').toLowerCase().includes(query.toLowerCase()))), [visits, query]);
  const inside = visits.filter((visit) => visit.status === 'inside').length;
  const waiverRate = visits.length ? Math.round(visits.filter((visit) => visit.waiverAccepted).length / visits.length * 100) : 0;

  return <AppShell title="Guest visits" subtitle="Guest details, associated members, waiver initials, in/out times, downloads, and email reports">
    <section className="overview-strip"><div><UserRoundCheck /><span><strong>{inside}</strong> guests inside</span></div><div><UsersRound /><span><strong>{visits.length}</strong> visits in range</span></div><div><ShieldCheck /><span><strong>{waiverRate}%</strong> waiver capture</span></div></section>
    <section className="panel card-section">
      <div className="toolbar-row"><div className="admin-search compact-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Guest, associated member, or initials" /></div><select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last year</option></select><button className="btn secondary" onClick={() => downloadApiFile(`/api/exports/guests?days=${days}`, 'gocreate-guests.csv').catch((error) => setMessage(error.message))}><Download size={18} />Download CSV</button></div>
      <div className="email-bar"><label><span>Email guest report to</span><input value={recipients} onChange={(event) => setRecipients(event.target.value)} /></label><button className="btn primary" onClick={emailReport}><Mail size={18} />Email report</button></div>
      {message && <div className={`inline-alert ${message.includes('emailed') ? 'success' : 'error'}`}>{message}</div>}
      {loading ? <LoadingState /> : filtered.length ? <div className="responsive-table"><table><thead><tr><th>Guest</th><th>Date of birth</th><th>Host / checked in by</th><th>In</th><th>Out</th><th>Waiver</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((visit) => <tr key={visit.id}><td><strong>{visit.displayName}</strong><small>{visit.phone || 'No phone'}</small></td><td>{formatDate(visit.dateOfBirth)}</td><td><strong>{visit.hostName || 'No host'}</strong><small>{visit.checkedInByName ? `Checked in by ${visit.checkedInByName}` : visit.hostName ? 'Member host' : 'Front desk'}</small></td><td>{formatDateTime(visit.checkInAt)}</td><td>{formatDateTime(visit.checkOutAt)}</td><td>{visit.waiverAccepted ? <><StatusPill tone="green">Accepted</StatusPill><small>{visit.waiverInitials || 'Initials missing'} · {visit.waiverVersion || 'version unknown'}</small></> : <StatusPill tone="red">Not recorded</StatusPill>}</td><td><StatusPill tone={visit.status === 'inside' ? 'green' : 'neutral'}>{visit.status}</StatusPill></td><td>{visit.status === 'inside' && <button className="btn tiny secondary" onClick={() => checkOut(visit.id)}><LogOut size={16} />Check out</button>}</td></tr>)}</tbody></table></div> : <EmptyState icon={UsersRound} title="No guest visits in this range" message="Guest check-ins from the kiosk appear here with date of birth, host, waiver acceptance, initials, and in/out times." />}
    </section>
  </AppShell>;
}
