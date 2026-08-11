'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mail, RefreshCw, Send, Settings2, UsersRound } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { EmptyState, LoadingState, StatusPill } from '@/components/AdminUi';
import { apiFetch } from '@/lib/client-api';
import { formatDateTime } from '@/lib/utils';

export default function CommunicationsPage() {
  const [data, setData] = useState(null);
  const [audience, setAudience] = useState('employees');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [customRecipients, setCustomRecipients] = useState('');
  const [selected, setSelected] = useState([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await apiFetch('/api/communications', { cache: 'no-store' });
    const result = await response.json();
    if (response.ok) setData(result);
    else setNotice(result.error || 'Communications could not be loaded.');
  }

  useEffect(() => { load(); }, []);

  const selectedPeople = useMemo(() => {
    if (!data) return [];
    if (audience === 'employees') return data.people.filter((person) => person.isEmployee || person.staffRole === 'mentor');
    if (audience === 'admins') return data.people.filter((person) => person.isAdmin);
    if (audience === 'members') return data.people.filter((person) => person.membershipStatus === 'approved');
    if (audience === 'selected') return data.people.filter((person) => selected.includes(person.id));
    return [];
  }, [audience, data, selected]);

  async function run(body) {
    setBusy(true);
    setNotice('');
    const response = await apiFetch('/api/communications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setBusy(false);
    setNotice(response.ok ? result.message || 'Communication processed.' : result.error || 'Communication failed.');
    if (response.ok) load();
  }

  function sendGeneral() {
    run({
      action: 'send',
      audience,
      personIds: selected,
      recipients: customRecipients,
      subject,
      message,
    });
  }

  return <AppShell
    title="Communications"
    subtitle="Email employees, members, administrators, or a selected audience and track every delivery"
    actions={<button className="btn secondary" onClick={load}><RefreshCw size={18} />Refresh</button>}
  >
    {notice && <div className={`inline-alert ${notice.includes('Processed') || notice.includes('succeeded') ? 'success' : 'error'}`}>{notice}</div>}
    {!data ? <LoadingState /> : <div className="communications-layout">
      <section className="panel communication-compose">
        <div className="section-heading"><div><p className="eyebrow">Compose</p><h2>Send a message</h2></div><Mail /></div>
        <div className="field-grid">
          <label className="field"><span>Audience</span><select value={audience} onChange={(event) => setAudience(event.target.value)}><option value="employees">All employees and mentors</option><option value="members">Approved members</option><option value="admins">Administrators</option><option value="selected">Selected people</option><option value="custom">Custom email addresses</option></select></label>
          <label className="field"><span>Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
        </div>
        {audience === 'custom' && <label className="field"><span>Email addresses</span><textarea rows="3" value={customRecipients} onChange={(event) => setCustomRecipients(event.target.value)} placeholder="name@example.com, another@example.com" /></label>}
        {audience === 'selected' && <div className="recipient-picker">{data.people.map((person) => <label key={person.id}><input type="checkbox" checked={selected.includes(person.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, person.id] : current.filter((id) => id !== person.id))} /><span><strong>{person.displayName}</strong><small>{person.email}</small></span></label>)}</div>}
        <label className="field"><span>Message</span><textarea rows="10" value={message} onChange={(event) => setMessage(event.target.value)} /></label>
        <div className="compose-summary"><UsersRound /><span>{audience === 'custom' ? customRecipients.split(/[;,\n]/).filter((value) => value.trim()).length : selectedPeople.length} intended recipients</span></div>
        <button className="btn primary wide" disabled={busy || !subject.trim() || !message.trim()} onClick={sendGeneral}><Send size={18} />{busy ? 'Sending…' : 'Send email'}</button>
      </section>

      <aside className="communications-side">
        <section className="panel card-section">
          <div className="section-heading"><div><p className="eyebrow">Scheduling intake</p><h2>Request availability</h2></div><UsersRound /></div>
          <p>Each employee receives a private link to enter recurring availability from a phone or computer.</p>
          <button className="btn secondary wide" disabled={busy} onClick={() => run({ action: 'availability-invites', audience: 'employees', expiresDays: 14 })}><Send size={18} />Email all staff</button>
        </section>
        <section className="panel card-section">
          <div className="section-heading"><div><p className="eyebrow">Provider</p><h2>Email status</h2></div><Settings2 /></div>
          <dl className="system-detail-list"><div><dt>Provider</dt><dd>{data.settings.emailProvider.replaceAll('_', ' ')}</dd></div><div><dt>From</dt><dd>{data.settings.fromEmail}</dd></div><div><dt>SMS</dt><dd>{data.settings.smsProvider}</dd></div></dl>
          <button className="btn secondary wide" disabled={busy} onClick={() => run({ action: 'test' })}><Settings2 size={18} />Test Gmail connection</button>
        </section>
      </aside>

      <section className="panel card-section communication-history">
        <div className="section-heading"><div><p className="eyebrow">Delivery history</p><h2>Recent communications</h2></div><StatusPill tone="blue">{data.communications.length}</StatusPill></div>
        {!data.communications.length ? <EmptyState icon={Mail} title="No messages sent" message="Sent and failed deliveries will appear here." /> : <div className="responsive-table"><table><thead><tr><th>When</th><th>Recipient</th><th>Subject</th><th>Type</th><th>Status</th></tr></thead><tbody>{data.communications.map((row) => <tr key={row.id}><td>{formatDateTime(row.createdAt)}</td><td><strong>{row.recipientName || row.recipient}</strong><small>{row.recipientName ? row.recipient : ''}</small></td><td>{row.subject}</td><td>{String(row.messageType || 'general').replaceAll('_', ' ')}</td><td><StatusPill tone={row.status === 'sent' ? 'green' : row.status === 'failed' ? 'red' : 'yellow'}>{row.status}</StatusPill>{row.error && <small>{row.error}</small>}</td></tr>)}</tbody></table></div>}
      </section>
    </div>}
  </AppShell>;
}
