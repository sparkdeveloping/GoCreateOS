'use client';
import { useEffect, useMemo, useState } from 'react';
import { Camera, CarFront, CheckCircle2, CreditCard, Search, ShieldCheck, UserCog, Users } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { EmptyState, LoadingState, StatusPill } from '@/components/AdminUi';
import { apiFetch, assetUrl } from '@/lib/client-api';
import { roleLabel } from '@/lib/permissions';
import { formatDate } from '@/lib/utils';

function toneFor(status) {
  if (status === 'approved') return 'green';
  if (status === 'pending') return 'yellow';
  if (status === 'expired' || status === 'denied') return 'red';
  return 'neutral';
}

function formFrom(person) {
  return {
    role: person.role || 'Member',
    isEmployee: Boolean(person.isEmployee),
    active: person.active !== false,
    doorAccessMode: person.doorAccessOverride === true ? 'allow' : person.doorAccessOverride === false ? 'deny' : 'auto',
    autoPay: person.autoPay === true ? 'yes' : person.autoPay === false ? 'no' : 'unknown',
    vehicleMake: person.vehicleMake || '',
    vehicleModel: person.vehicleModel || '',
    vehiclePlate: person.vehiclePlate || '',
    parkingPermit: person.parkingPermit || '',
    paymentStatus: person.paymentStatus || '',
    paymentPlan: person.paymentPlan || '',
    amountPaid: person.amountPaid ?? '',
  };
}

export default function PeoplePage() {
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(formFrom({}));
  const [totalMatches, setTotalMatches] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function load(search = query) {
    setLoading(true);
    const response = await apiFetch(`/api/people/search?q=${encodeURIComponent(search)}&limit=120`);
    const result = await response.json();
    setPeople(result.people || []);
    setTotalMatches(Number(result.total || 0));
    setLoading(false);
  }
  useEffect(() => { load(''); }, []);
  useEffect(() => { const timer = setTimeout(() => load(query), 220); return () => clearTimeout(timer); }, [query]);

  function choose(person) {
    setSelected(person);
    setForm(formFrom(person));
    setMessage('');
  }

  async function save(useSourceFields = []) {
    const doorAccessOverride = form.doorAccessMode === 'allow' ? true : form.doorAccessMode === 'deny' ? false : null;
    const nextValues = {
      role: form.role,
      isEmployee: form.isEmployee,
      active: form.active,
      doorAccessOverride,
      autoPay: form.autoPay === 'unknown' ? null : form.autoPay === 'yes',
      vehicleMake: form.vehicleMake.trim(),
      vehicleModel: form.vehicleModel.trim(),
      vehiclePlate: form.vehiclePlate.trim(),
      parkingPermit: form.parkingPermit.trim(),
      paymentStatus: form.paymentStatus.trim(),
      paymentPlan: form.paymentPlan.trim(),
      amountPaid: form.amountPaid === '' ? null : Number(form.amountPaid),
    };
    const body = { personId: selected.id, useSourceFields };
    for (const [key, value] of Object.entries(nextValues)) {
      const before = key === 'doorAccessOverride' ? selected.doorAccessOverride ?? null : selected[key] ?? null;
      if (String(before ?? '') !== String(value ?? '') || ['role', 'isEmployee', 'active', 'doorAccessOverride'].includes(key)) body[key] = value;
    }
    const response = await apiFetch('/api/people', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) setMessage(result.error || 'Could not save changes.');
    else {
      setMessage('Changes saved and recorded in the audit log.');
      const saved = result.person;
      setSelected(saved);
      setForm(formFrom(saved));
      setPeople((current) => current.map((person) => person.id === selected.id ? saved : person));
    }
  }

  const counts = useMemo(() => ({
    employees: people.filter((person) => person.isEmployee).length,
    admins: people.filter((person) => person.isAdmin).length,
    autoPay: people.filter((person) => person.autoPay === true).length,
  }), [people]);

  const manualOverrides = selected?.manualFieldOverrides || {};
  const paymentManual = ['autoPay', 'paymentStatus', 'paymentPlan', 'amountPaid'].some((key) => manualOverrides[key]);
  const vehicleManual = ['vehicleMake', 'vehicleModel', 'vehiclePlate', 'parkingPermit'].some((key) => manualOverrides[key]);

  return <AppShell title="People & member records" subtitle="Search the complete local directory, update front-desk fields, and review membership and access status">
    <section className="overview-strip">
      <div><Users /><span><strong>{totalMatches}</strong> matching profiles</span></div>
      <div><UserCog /><span><strong>{counts.employees}</strong> employees</span></div>
      <div><ShieldCheck /><span><strong>{counts.admins}</strong> dashboard users</span></div>
      <div><CreditCard /><span><strong>{counts.autoPay}</strong> marked auto pay</span></div>
    </section>
    <section className="split-workspace">
      <article className="panel card-section list-panel">
        <div className="section-heading"><div><p className="eyebrow">Directory</p><h2>Find a person</h2></div></div>
        <div className="admin-search live-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, phone, badge…" /><span>{loading ? 'Searching…' : `${totalMatches} found`}</span></div>
        {loading ? <LoadingState /> : people.length ? <div className="directory-list">{people.map((person) => <button key={person.id} className={selected?.id === person.id ? 'selected' : ''} onClick={() => choose(person)}>
          <span className="avatar-initial">{person.displayName?.[0] || '?'}</span>
          <span className="person-main"><strong>{person.displayName}</strong><small>{person.email || person.phone || 'No contact information'}</small></span>
          <span className="person-meta"><StatusPill tone={toneFor(person.membershipStatus)}>{person.membershipStatus || 'unknown'}</StatusPill><small>{person.badgeNumber ? `Badge ${person.badgeNumber}` : 'No badge'}</small></span>
        </button>)}</div> : <EmptyState icon={Search} title="No matching profiles" message="Try a broader search. Searches use the complete local directory cache." />}
      </article>
      <article className="panel card-section editor-panel">
        {!selected ? <EmptyState icon={UserCog} title="Choose a person" message="Select a directory row to review membership, badge, employee, admin, payment, parking, and access settings." /> : <>
          <div className="person-editor-header"><label className="profile-photo-editor">{selected.photoUrl ? <img src={assetUrl(selected.photoUrl)} alt={selected.displayName} onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <span className="avatar-large">{selected.displayName?.[0]}</span>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; const body = new FormData(); body.set('personId', selected.id); body.set('file', file); setMessage('Uploading profile image…'); const response = await apiFetch('/api/profile-image', { method: 'POST', body }); const result = await response.json(); if (!response.ok) setMessage(result.error); else { const next = { ...selected, photoUrl: result.photoUrl, photoAssetId: result.assetId }; setSelected(next); setPeople((current) => current.map((person) => person.id === next.id ? next : person)); setMessage('Profile image saved.'); } }} /><span><Camera size={16}/>Change photo</span></label><div><p className="eyebrow">Editing profile</p><h2>{selected.displayName}</h2><p>{selected.email || selected.phone}</p></div><StatusPill tone={selected.isSuperAdmin ? 'purple' : selected.isAdmin ? 'blue' : 'neutral'}>{roleLabel(selected.adminRole)}</StatusPill></div>
          <div className="membership-summary"><div><span>Membership</span><StatusPill tone={toneFor(selected.membershipStatus)}>{selected.membershipStatus || 'unknown'}</StatusPill></div><div><span>Expires</span><strong>{formatDate(selected.membershipExpiresAt)}</strong></div><div><span>Joined/submitted</span><strong>{formatDate(selected.membershipSubmittedAt)}</strong></div><div><span>Badge</span><strong>{selected.badgeNumber || 'Not linked'}</strong></div></div>
          <div className="form-stack">
            <label className="field"><span>Operational role</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option>Member</option><option>Staff</option><option>Student Tech</option><option>Mentor</option><option>Manager</option><option>Administrator</option></select></label>
            <label className="toggle-row"><span className="toggle-icon"><UserCog /></span><span><strong>Employee</strong><small>Allows clock-in and clock-out and makes door access automatic.</small></span><input type="checkbox" checked={form.isEmployee} onChange={(event) => setForm({ ...form, isEmployee: event.target.checked })} /></label>
            <label className="field"><span>Auto pay</span><select value={form.autoPay} onChange={(event) => setForm({ ...form, autoPay: event.target.value })}><option value="unknown">Not recorded</option><option value="yes">Yes — automatic payments</option><option value="no">No — manual payments</option></select><small>This is a front-desk notation unless the GoCreate source exposes an auto-pay field during sync.</small></label>
            <label className="field"><span>Door access policy</span><select value={form.doorAccessMode} onChange={(event) => setForm({ ...form, doorAccessMode: event.target.value })}><option value="auto">Automatic — membership, employee, or admin rule</option><option value="allow">Manual override — always allow</option><option value="deny">Manual override — always deny</option></select><small className="field-help">Current effective state: <strong>{selected.doorAccessDesired ? 'Allow' : 'Deny'}</strong>{selected.doorAccessSource ? ` (${String(selected.doorAccessSource).replaceAll('-', ' ')})` : ''}.</small></label>
            <label className="toggle-row"><span className="toggle-icon"><CheckCircle2 /></span><span><strong>Active profile</strong><small>Inactive profiles cannot complete member check-in.</small></span><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /></label>
          </div>
          <details className="editor-details"><summary><CreditCard />Payment notes {paymentManual && <StatusPill tone="yellow">Manual values</StatusPill>}</summary><div className="field-grid"><label className="field"><span>Payment status</span><input value={form.paymentStatus} onChange={(event) => setForm({ ...form, paymentStatus: event.target.value })} placeholder="Current, past due, scholarship…" /></label><label className="field"><span>Payment plan</span><input value={form.paymentPlan} onChange={(event) => setForm({ ...form, paymentPlan: event.target.value })} placeholder="Monthly, annual…" /></label><label className="field"><span>Amount paid</span><input inputMode="decimal" value={form.amountPaid} onChange={(event) => setForm({ ...form, amountPaid: event.target.value })} placeholder="0.00" /></label></div>{paymentManual && <button className="btn secondary source-reset-button" onClick={() => save(['autoPay', 'paymentStatus', 'paymentPlan', 'amountPaid'])}>Use synced payment values</button>}</details>
          <details className="editor-details"><summary><CarFront />Vehicle & parking {vehicleManual && <StatusPill tone="yellow">Manual values</StatusPill>}</summary><div className="field-grid"><label className="field"><span>Vehicle make</span><input value={form.vehicleMake} onChange={(event) => setForm({ ...form, vehicleMake: event.target.value })} /></label><label className="field"><span>Vehicle model</span><input value={form.vehicleModel} onChange={(event) => setForm({ ...form, vehicleModel: event.target.value })} /></label><label className="field"><span>License plate</span><input value={form.vehiclePlate} onChange={(event) => setForm({ ...form, vehiclePlate: event.target.value.toUpperCase() })} /></label><label className="field"><span>Parking permit</span><input value={form.parkingPermit} onChange={(event) => setForm({ ...form, parkingPermit: event.target.value })} /></label></div>{vehicleManual && <button className="btn secondary source-reset-button" onClick={() => save(['vehicleMake', 'vehicleModel', 'vehiclePlate', 'parkingPermit'])}>Use synced vehicle values</button>}</details>
          {message && <div className={`inline-alert ${message.startsWith('Changes') ? 'success' : 'error'}`}>{message}</div>}
          <button className="btn primary wide" onClick={() => save()}>Save profile settings</button>
        </>}
      </article>
    </section>
  </AppShell>;
}
