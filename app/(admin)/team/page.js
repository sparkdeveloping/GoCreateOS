'use client';
import { useEffect, useMemo, useState } from 'react';
import { Crown, Search, Shield, ShieldCheck, UserRoundCog, Users } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { EmptyState, LoadingState, StatusPill } from '@/components/AdminUi';
import { apiFetch } from '@/lib/client-api';
import { roleLabel } from '@/lib/permissions';

const roles = [
  { value: 'member', label: 'No admin access', description: 'Member or employee kiosk actions only.' },
  { value: 'front_desk', label: 'Front desk', description: 'People, badges, access, guests, logs, sync, and kiosk control. No analytics or system settings.' },
  { value: 'admin', label: 'Admin', description: 'All normal operations plus analytics.' },
  { value: 'super_admin', label: 'Super admin', description: 'Everything, including role assignment and destructive maintenance.' },
];

export default function TeamPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [selected, setSelected] = useState(null);
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function loadAdmins() {
    setLoading(true);
    const response = await apiFetch('/api/team');
    const result = await response.json();
    if (response.ok) setAdmins(result.people || []); else setMessage(result.error || 'Admin access list could not be loaded.');
    setLoading(false);
  }

  async function search(nextQuery = query) {
    const response = await apiFetch(`/api/people/search?q=${encodeURIComponent(nextQuery)}&limit=80`);
    const result = await response.json();
    setResults(result.people || []);
  }

  async function save() {
    setMessage('Saving access role…');
    const response = await apiFetch('/api/team', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ personId: selected.id, adminRole: role }),
    });
    const result = await response.json();
    if (!response.ok) setMessage(result.error || 'Role could not be saved.');
    else {
      setSelected(result.person);
      setRole(result.person.adminRole);
      setMessage(`${result.person.displayName} is now ${roleLabel(result.person.adminRole).toLowerCase()}.`);
      await loadAdmins();
    }
  }

  useEffect(() => { loadAdmins(); }, []);
  useEffect(() => {
    if (!query.trim()) { setResults([]); return undefined; }
    const timer = window.setTimeout(() => search(query), 220);
    return () => window.clearTimeout(timer);
  }, [query]);
  const allRows = useMemo(() => {
    const map = new Map(admins.map((person) => [person.id, person]));
    for (const person of results) map.set(person.id, person);
    return [...map.values()].filter((person) => !query || JSON.stringify(person).toLowerCase().includes(query.toLowerCase()));
  }, [admins, results, query]);

  function choose(person) {
    setSelected(person);
    setRole(person.adminRole || (person.isAdmin ? 'admin' : 'member'));
    setMessage('');
  }

  return <AppShell title="Admin access" subtitle="Only super admins can decide who can open each part of GoCreate OS">
    <section className="overview-strip"><div><Crown /><span><strong>{admins.filter((person) => person.adminRole === 'super_admin' || person.isSuperAdmin).length}</strong> super admins</span></div><div><ShieldCheck /><span><strong>{admins.filter((person) => person.adminRole === 'admin').length}</strong> admins</span></div><div><Users /><span><strong>{admins.filter((person) => person.adminRole === 'front_desk').length}</strong> front-desk users</span></div></section>
    <section className="split-workspace">
      <article className="panel card-section list-panel">
        <div className="section-heading"><div><p className="eyebrow">Directory</p><h2>Choose a person</h2></div></div>
        <div className="admin-search live-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, phone, or badge" /><span>{query.trim() ? `${allRows.length} found` : `${admins.length} authorized`}</span></div>
        {loading ? <LoadingState /> : allRows.length ? <div className="directory-list">{allRows.map((person) => <button key={person.id} className={selected?.id === person.id ? 'selected' : ''} onClick={() => choose(person)}><span className="avatar-initial">{person.displayName?.[0] || '?'}</span><span className="person-main"><strong>{person.displayName}</strong><small>{person.email || person.phone}</small></span><StatusPill tone={person.adminRole === 'super_admin' ? 'purple' : person.isAdmin ? 'blue' : 'neutral'}>{roleLabel(person.adminRole || (person.isAdmin ? 'admin' : 'member'))}</StatusPill></button>)}</div> : <EmptyState icon={UserRoundCog} title="No people matched" message="Search the synced directory, then assign a role." />}
      </article>
      <article className="panel card-section editor-panel">
        {!selected ? <EmptyState icon={Shield} title="Choose a person" message="Role changes are effective the next time that badge opens the dashboard." /> : <><div className="person-editor-header"><span className="avatar-large">{selected.displayName?.[0]}</span><div><p className="eyebrow">Admin permissions</p><h2>{selected.displayName}</h2><p>{selected.email || selected.phone}</p></div></div><div className="role-choice-grid">{roles.map((item) => <label key={item.value} className={role === item.value ? 'selected' : ''}><input type="radio" name="admin-role" value={item.value} checked={role === item.value} onChange={() => setRole(item.value)} /><span><strong>{item.label}</strong><small>{item.description}</small></span></label>)}</div>{message && <div className={`inline-alert ${message.includes('now') ? 'success' : 'error'}`}>{message}</div>}<button className="btn primary wide" onClick={save}>Save admin access</button></>}
      </article>
    </section>
  </AppShell>;
}
