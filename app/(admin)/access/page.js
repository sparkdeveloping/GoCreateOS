'use client';
import { useEffect, useMemo, useState } from 'react';
import { Download, Mail, Search, ShieldCheck, ShieldOff } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { EmptyState, LoadingState, StatusPill } from '@/components/AdminUi';
import { formatDate } from '@/lib/utils';
import { apiFetch, downloadApiFile } from '@/lib/client-api';

export default function AccessPage() {
  const [people, setPeople] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState('');
  const [message, setMessage] = useState('');
  async function load() {
    setLoading(true);
    const response = await apiFetch('/api/access');
    const result = await response.json();
    setPeople(result.people || []);
    setRecipients(result.recipients || '');
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggle(person) {
    if (!person.badgeActive || !person.isCurrentBadge || !person.personId) return;
    const next = !person.doorAccessDesired;
    setPeople((rows) => rows.map((row) => row.id === person.id ? { ...row, doorAccessDesired: next, doorAccessOverride: next, doorAccessSource: next ? 'manual-allow' : 'manual-deny' } : row));
    const response = await apiFetch('/api/access', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ personId: person.personId, doorAccessDesired: next }) });
    const result = await response.json();
    if (!response.ok) {
      setPeople((rows) => rows.map((row) => row.id === person.id ? { ...row, doorAccessDesired: !next, doorAccessOverride: person.doorAccessOverride, doorAccessSource: person.doorAccessSource } : row));
      setMessage(result.error || 'Could not update access.');
    } else if (result.person) {
      setPeople((rows) => rows.map((row) => row.personId === person.personId ? { ...row, doorAccessDesired: result.person.doorAccessDesired, doorAccessOverride: result.person.doorAccessOverride, doorAccessSource: result.person.doorAccessSource } : row));
    }
  }

  async function setAutomatic(person) {
    if (!person.badgeActive || !person.isCurrentBadge || !person.personId) return;
    const response = await apiFetch('/api/access', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ personId: person.personId, automatic: true }) });
    const result = await response.json();
    if (!response.ok) setMessage(result.error || 'Could not restore automatic access.');
    else if (result.person) setPeople((rows) => rows.map((row) => row.personId === person.personId ? { ...row, doorAccessDesired: result.person.doorAccessDesired, doorAccessOverride: null, doorAccessSource: result.person.doorAccessSource } : row));
  }

  async function emailRoster() {
    setMessage('Sending access roster…');
    const response = await apiFetch('/api/email/access', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ recipients }) });
    const result = await response.json();
    setMessage(response.ok ? result.message : result.error);
  }

  const filtered = useMemo(() => people.filter((person) => [person.displayName, person.badgeNumber, person.email].some((value) => String(value || '').toLowerCase().includes(query.toLowerCase()))), [people, query]);
  const enabled = people.filter((person) => person.doorAccessDesired).length;

  return <AppShell title="Door access roster" subtitle="Current and retired RFID badge records, with the requested physical-door state">
    <section className="overview-strip"><div><ShieldCheck /><span><strong>{enabled}</strong> should have access</span></div><div><ShieldOff /><span><strong>{people.length - enabled}</strong> should be disabled</span></div><div><span><strong>{people.length}</strong> badge records</span></div></section>
    <section className="panel card-section">
      <div className="toolbar-row"><div className="admin-search compact-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or badge" /></div><button className="btn secondary" onClick={() => downloadApiFile('/api/exports/access', 'gocreate-door-access.csv').catch((error) => setMessage(error.message))}><Download size={18} />Download CSV</button></div>
      <div className="email-bar"><label><span>Email roster to</span><input value={recipients} onChange={(event) => setRecipients(event.target.value)} placeholder="email@example.com, another@example.com" /></label><button className="btn primary" onClick={emailRoster}><Mail size={18} />Email current roster</button></div>
      {message && <div className={`inline-alert ${message.includes('emailed') ? 'success' : 'error'}`}>{message}</div>}
      {loading ? <LoadingState /> : filtered.length ? <div className="responsive-table"><table><thead><tr><th>Person</th><th>Badge</th><th>Badge state</th><th>Membership</th><th>Expires</th><th>Requested door state</th></tr></thead><tbody>{filtered.map((person) => <tr key={person.id}><td><strong>{person.displayName}</strong><small>{person.email || person.phone || 'Historical badge record'}</small></td><td>{person.badgeNumber}</td><td><StatusPill tone={person.badgeActive && person.isCurrentBadge ? 'green' : 'neutral'}>{person.badgeActive && person.isCurrentBadge ? 'current' : 'retired'}</StatusPill></td><td><StatusPill tone={person.membershipStatus === 'approved' ? 'green' : person.membershipStatus === 'pending' ? 'yellow' : 'red'}>{person.membershipStatus || 'unknown'}</StatusPill></td><td>{formatDate(person.membershipExpiresAt)}</td><td><div className="access-control-stack"><button className={`access-switch ${person.doorAccessDesired ? 'enabled' : 'disabled'}`} onClick={() => toggle(person)} disabled={!person.badgeActive || !person.isCurrentBadge || !person.personId}><span>{person.doorAccessDesired ? <ShieldCheck /> : <ShieldOff />}</span>{person.doorAccessDesired ? 'Should have access' : (!person.badgeActive || !person.isCurrentBadge) ? 'Retired — disable' : 'Should be disabled'}</button><small>{person.doorAccessOverride === null || person.doorAccessOverride === undefined ? `Automatic: ${String(person.doorAccessSource || 'membership').replaceAll('-', ' ')}` : 'Manual override'}{person.doorAccessOverride !== null && person.doorAccessOverride !== undefined && <button className="inline-reset" onClick={() => setAutomatic(person)}>Use automatic</button>}</small></div></td></tr>)}</tbody></table></div> : <EmptyState icon={ShieldCheck} title="No linked badges matched" message="Create or link badges in Badge Studio. Every linked badge appears here automatically." />}
    </section>
  </AppShell>;
}
