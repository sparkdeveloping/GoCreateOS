'use client';
import { useEffect, useState } from 'react';
import {
  CalendarClock, Clock3, Mail, RefreshCw, Save, Settings2, ShieldAlert,
  Sparkles, UserRoundCheck, UsersRound,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { LoadingState, StatusPill } from '@/components/AdminUi';
import { apiFetch } from '@/lib/client-api';

const tabs = [
  ['attendance', 'Attendance', Clock3],
  ['membership', 'Membership', ShieldAlert],
  ['guests', 'Guests', UserRoundCheck],
  ['operating_hours', 'Hours', CalendarClock],
  ['scheduling', 'Scheduling', UsersRound],
  ['communications', 'Communication', Mail],
  ['cleanup', 'Data cleanup', Sparkles],
  ['kiosk', 'Kiosk', Settings2],
];

function Toggle({ checked, onChange, label, description }) {
  return <label className="setting-toggle"><input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} /><span className="toggle-track" /><span><strong>{label}</strong>{description && <small>{description}</small>}</span></label>;
}

function Field({ label, children, description }) {
  return <label className="setting-field"><span>{label}</span>{children}{description && <small>{description}</small>}</label>;
}

function updateAt(source, path, value) {
  const clone = structuredClone(source);
  let cursor = clone;
  for (const key of path.slice(0, -1)) cursor = cursor[key];
  cursor[path.at(-1)] = value;
  return clone;
}

function KeyLabelEditor({ title, description, items, onChange }) {
  function update(index, field, value) {
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }
  function add() {
    const nextNumber = items.length + 1;
    onChange([...items, { key: `item-${Date.now()}`, label: `Area ${nextNumber}` }]);
  }
  return <section className="shift-template-editor">
    <div className="subsection-heading"><div><h3>{title}</h3>{description && <p>{description}</p>}</div><button type="button" className="btn secondary compact" onClick={add}>Add area</button></div>
    <div className="key-label-list">{items.map((item, index) => <div className="key-label-row" key={item.key || index}>
      <Field label="Internal key"><input value={item.key || ''} onChange={(event) => update(index, 'key', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} /></Field>
      <Field label="Display label"><input value={item.label || ''} onChange={(event) => update(index, 'label', event.target.value)} /></Field>
      <button type="button" className="icon-button danger" aria-label={`Remove ${item.label || 'area'}`} onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>×</button>
    </div>)}</div>
  </section>;
}

function StaffRoleEditor({ items, onChange }) {
  function update(index, field, value) {
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }
  function add() {
    onChange([...items, { key: `role-${Date.now()}`, label: `Role ${items.length + 1}`, countsAsTechnician: false }]);
  }
  return <section className="shift-template-editor">
    <div className="subsection-heading"><div><h3>Staff roles</h3><p>Technician-qualified roles satisfy required shift coverage.</p></div><button type="button" className="btn secondary compact" onClick={add}>Add role</button></div>
    <div className="key-label-list">{items.map((item, index) => <div className="staff-role-row" key={item.key || index}>
      <Field label="Internal key"><input value={item.key || ''} onChange={(event) => update(index, 'key', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} /></Field>
      <Field label="Display label"><input value={item.label || ''} onChange={(event) => update(index, 'label', event.target.value)} /></Field>
      <Toggle checked={item.countsAsTechnician} onChange={(value) => update(index, 'countsAsTechnician', value)} label="Technician qualified" />
      <button type="button" className="icon-button danger" aria-label={`Remove ${item.label || 'role'}`} onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>×</button>
    </div>)}</div>
  </section>;
}

function ShiftTemplateEditor({ title, description, templates, onChange }) {
  function update(index, field, value) {
    onChange(templates.map((template, templateIndex) => templateIndex === index ? { ...template, [field]: value } : template));
  }
  function add() {
    const nextNumber = templates.length + 1;
    onChange([...templates, { key: `shift-${Date.now()}`, label: `Shift ${nextNumber}`, start: '09:00', end: '13:00' }]);
  }
  function remove(index) {
    onChange(templates.filter((_, templateIndex) => templateIndex !== index));
  }
  return <section className="shift-template-editor">
    <div className="subsection-heading"><div><h3>{title}</h3>{description && <p>{description}</p>}</div><button type="button" className="btn secondary compact" onClick={add}>Add shift</button></div>
    <div className="shift-template-list">{templates.map((template, index) => <div className="shift-template-row" key={template.key || index}>
      <Field label="Label"><input value={template.label || ''} onChange={(event) => update(index, 'label', event.target.value)} /></Field>
      <Field label="Start"><input type="time" value={template.start || ''} onChange={(event) => update(index, 'start', event.target.value)} /></Field>
      <Field label="Nominal end"><input type="time" value={template.end || ''} onChange={(event) => update(index, 'end', event.target.value)} /></Field>
      <button type="button" className="icon-button danger" aria-label={`Remove ${template.label || 'shift'}`} onClick={() => remove(index)}>×</button>
    </div>)}</div>
  </section>;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [tab, setTab] = useState('attendance');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const response = await apiFetch('/api/settings', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) setMessage(result.error || 'Settings could not be loaded.');
    else setSettings(result.settings);
  }
  useEffect(() => { load(); }, []);

  function change(path, value) {
    setSettings((current) => updateAt(current, path, value));
  }

  async function save() {
    setSaving(true);
    setMessage('');
    const response = await apiFetch('/api/settings', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ settings: { [tab]: settings[tab] } }),
    });
    const result = await response.json();
    setSaving(false);
    setMessage(response.ok ? 'Settings saved. New kiosk and admin actions use them immediately.' : result.error);
    if (response.ok) setSettings(result.settings);
  }

  async function reset() {
    const response = await apiFetch(`/api/settings?section=${encodeURIComponent(tab)}`, { method: 'DELETE' });
    const result = await response.json();
    if (response.ok) await load();
    setMessage(response.ok ? 'Section restored to Version 5 defaults.' : result.error);
  }

  if (!settings) return <AppShell title="Operations settings" subtitle="Replace hard-coded behavior with role-controlled policy"><LoadingState /></AppShell>;
  const attendance = settings.attendance;
  const membership = settings.membership;
  const guests = settings.guests;
  const hours = settings.operating_hours;
  const scheduling = settings.scheduling;
  const communications = settings.communications;
  const cleanup = settings.cleanup;
  const kiosk = settings.kiosk;

  return <AppShell title="Operations settings" subtitle="Configure attendance, membership, guests, hours, scheduling, communication, cleanup, and kiosk behavior" actions={<><button className="btn secondary" onClick={reset}><RefreshCw size={18} />Restore defaults</button><button className="btn primary" disabled={saving} onClick={save}><Save size={18} />{saving ? 'Saving…' : 'Save section'}</button></>}>
    {message && <div className={`inline-alert ${message.includes('saved') || message.includes('restored') ? 'success' : 'error'}`}>{message}</div>}
    <section className="settings-layout">
      <nav className="settings-tabs" aria-label="Settings sections">{tabs.map(([key, label, Icon]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}><Icon size={19} /><span>{label}</span></button>)}</nav>
      <div className="panel settings-panel">
        {tab === 'attendance' && <>
          <div className="section-heading"><div><p className="eyebrow">Presence lifecycle</p><h2>Attendance and automatic checkout</h2></div><StatusPill tone="blue">Editable policy</StatusPill></div>
          <div className="settings-grid">
            <Field label="Checkout policy" description="Manual disables every automatic member and guest checkout."><select value={attendance.autoCheckoutMode} onChange={(event) => change(['attendance', 'autoCheckoutMode'], event.target.value)}><option value="after_close">Automatically after closing</option><option value="manual">Manual checkout only</option></select></Field>
            <Field label="Grace period after closing"><div className="number-suffix"><input type="number" min="0" max="360" value={attendance.graceMinutes} onChange={(event) => change(['attendance', 'graceMinutes'], Number(event.target.value))} /><span>minutes</span></div></Field>
            <Toggle checked={attendance.closeMembersWithFacility} onChange={(value) => change(['attendance', 'closeMembersWithFacility'], value)} label="Close member visits" description="Automatically closes members who remain checked in after the facility closes." />
            <Toggle checked={attendance.closeGuestsWithFacility} onChange={(value) => change(['attendance', 'closeGuestsWithFacility'], value)} label="Close guest visits" description="Guest visits follow the same closing policy." />
            <Toggle checked={attendance.closeEmployeeShiftsAutomatically} onChange={(value) => change(['attendance', 'closeEmployeeShiftsAutomatically'], value)} label="Auto-close employee shifts" description="Disabled by default so missed clock-outs appear as exceptions instead of silently changing time records." />
          </div>
        </>}
        {tab === 'membership' && <>
          <div className="section-heading"><div><p className="eyebrow">Entry policy</p><h2>Membership status behavior</h2></div></div>
          <div className="settings-grid">
            {['pendingPolicy','expiredPolicy','unknownPolicy','inactivePolicy'].map((key) => <Field key={key} label={key.replace('Policy','').replace(/\b\w/g, (letter) => letter.toUpperCase())}><select value={membership[key]} onChange={(event) => change(['membership', key], event.target.value)}><option value="block">Block and send to front desk</option><option value="allow_with_notice">Allow with notice</option><option value="allow">Allow</option></select></Field>)}
            <Toggle checked={membership.allowFrontDeskOverride} onChange={(value) => change(['membership','allowFrontDeskOverride'], value)} label="Allow temporary front-desk override" />
            <Field label="Default override duration"><div className="number-suffix"><input type="number" min="15" max="1440" value={membership.overrideMinutes} onChange={(event) => change(['membership','overrideMinutes'], Number(event.target.value))} /><span>minutes</span></div></Field>
          </div>
        </>}
        {tab === 'guests' && <>
          <div className="section-heading"><div><p className="eyebrow">Visitor policy</p><h2>Guest check-in</h2></div></div>
          <div className="settings-grid">
            <Toggle checked={guests.requireHost} onChange={(value) => change(['guests','requireHost'], value)} label="Require a member host" description="When disabled, an on-the-clock employee can register a guest without being recorded as the host." />
            <Toggle checked={guests.allowStaffAssistedCheckIn} onChange={(value) => change(['guests','allowStaffAssistedCheckIn'], value)} label="Allow employee-assisted check-in" />
            <Toggle checked={guests.staffMustBeClockedIn} onChange={(value) => change(['guests','staffMustBeClockedIn'], value)} label="Employee must be clocked in" />
            <Field label="Maximum open guests per person" description="Use 0 for no limit."><input type="number" min="0" max="100" value={guests.maximumOpenGuestsPerPerson} onChange={(event) => change(['guests','maximumOpenGuestsPerPerson'], Number(event.target.value))} /></Field>
            <Toggle checked={guests.requirePhone} onChange={(value) => change(['guests','requirePhone'], value)} label="Require phone number" />
            <Toggle checked={guests.requireDateOfBirth} onChange={(value) => change(['guests','requireDateOfBirth'], value)} label="Require date of birth" />
            <Toggle checked={guests.waiverRequired} onChange={(value) => change(['guests','waiverRequired'], value)} label="Require guest waiver and initials" />
            <Field label="Waiver version"><input value={guests.waiverVersion} onChange={(event) => change(['guests','waiverVersion'], event.target.value)} /></Field>
            <Field label="Guest waiver text" description="This is shown on the public kiosk. Have institutional counsel approve the final wording."><textarea rows="8" value={guests.waiverText || ''} onChange={(event) => change(['guests','waiverText'], event.target.value)} /></Field>
          </div>
        </>}
        {tab === 'operating_hours' && <>
          <div className="section-heading"><div><p className="eyebrow">Facility calendar</p><h2>Regular operating hours</h2></div><StatusPill tone="green">{hours.timezone}</StatusPill></div>
          <div className="hours-editor">{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((label, day) => { const window = hours.weekly[day]?.[0] || null; return <div key={label} className="hours-row"><strong>{label}</strong><label><input type="checkbox" checked={Boolean(window)} onChange={(event) => change(['operating_hours','weekly',String(day)], event.target.checked ? [{ start: day === 0 ? '13:00' : '09:00', end: day === 0 ? '18:00' : '21:00' }] : [])} />Open</label>{window ? <><input type="time" value={window.start} onChange={(event) => change(['operating_hours','weekly',String(day),'0','start'], event.target.value)} /><span>to</span><input type="time" value={window.end} onChange={(event) => change(['operating_hours','weekly',String(day),'0','end'], event.target.value)} /></> : <span className="muted">Closed</span>}</div>; })}</div>
          <p className="muted-block">Special closures and extended hours are created in the Operations Calendar. They override this weekly schedule.</p>
        </>}
        {tab === 'scheduling' && <>
          <div className="section-heading"><div><p className="eyebrow">Staff coverage</p><h2>Schedule generation defaults</h2></div></div>
          <div className="settings-grid">
            <Field label="Publishing cadence"><select value={scheduling.publishCadence} onChange={(event) => change(['scheduling','publishCadence'], event.target.value)}><option value="weekly">Weekly</option><option value="biweekly">Every two weeks</option><option value="monthly">Monthly</option><option value="semester">Semester</option><option value="custom">Custom dates</option></select></Field>
            <Field label="Overlap between shifts"><div className="number-suffix"><input type="number" min="0" max="120" value={scheduling.overlapMinutes} onChange={(event) => change(['scheduling','overlapMinutes'], Number(event.target.value))} /><span>minutes</span></div></Field>
            <Toggle checked={scheduling.requireTechnicianEachShift} onChange={(value) => change(['scheduling','requireTechnicianEachShift'], value)} label="Require technician coverage" />
            <Field label="Minimum technicians per shift"><input type="number" min="0" max="10" value={scheduling.minimumTechniciansPerShift} onChange={(event) => change(['scheduling','minimumTechniciansPerShift'], Number(event.target.value))} /></Field>
            <Field label="Minimum total staff per shift"><input type="number" min="1" max="20" value={scheduling.minimumPeoplePerShift} onChange={(event) => change(['scheduling','minimumPeoplePerShift'], Number(event.target.value))} /></Field>
            <Field label="Minimum mentors per shift" description="Use 0 when mentors are scheduled only for selected events or areas."><input type="number" min="0" max="10" value={scheduling.minimumMentorsPerShift} onChange={(event) => change(['scheduling','minimumMentorsPerShift'], Number(event.target.value))} /></Field>
            <Field label="Target weekly hours"><input type="number" min="0" max="60" value={scheduling.targetWeeklyHours} onChange={(event) => change(['scheduling','targetWeeklyHours'], Number(event.target.value))} /></Field>
            <Field label="Maximum weekly hours"><input type="number" min="0" max="80" value={scheduling.maximumWeeklyHours} onChange={(event) => change(['scheduling','maximumWeeklyHours'], Number(event.target.value))} /></Field>
          </div>
          <ShiftTemplateEditor title="Tuesday–Saturday shift templates" description="The overlap setting extends handoff coverage between adjacent shifts. The final shift uses its nominal end time." templates={scheduling.shiftTemplates || []} onChange={(value) => change(['scheduling','shiftTemplates'], value)} />
          <ShiftTemplateEditor title="Sunday shift templates" description="Sunday can use a different number and shape of shifts." templates={scheduling.sundayShiftTemplates || []} onChange={(value) => change(['scheduling','sundayShiftTemplates'], value)} />
          <KeyLabelEditor title="Work areas" description="Areas are available when creating staff, mentors, calendar coverage, and schedules." items={scheduling.areas || []} onChange={(value) => change(['scheduling','areas'], value)} />
          <StaffRoleEditor items={scheduling.staffRoles || []} onChange={(value) => change(['scheduling','staffRoles'], value)} />
          <p className="muted-block">Student technicians and technicians satisfy technician coverage by default. Mentors can be assigned to Studios, Woods, Metals, Design, Textiles, or TechLab and may be marked technician-qualified only when that accurately reflects their role.</p>
        </>}
        {tab === 'communications' && <>
          <div className="section-heading"><div><p className="eyebrow">Email and text</p><h2>Communication provider</h2></div></div>
          <div className="settings-grid">
            <Field label="Email provider"><select value={communications.emailProvider} onChange={(event) => change(['communications','emailProvider'], event.target.value)}><option value="gmail_smtp">Gmail SMTP (no additional provider fee)</option><option value="gmail_api">Gmail API OAuth</option><option value="disabled">Disabled</option></select></Field>
            <Field label="From email"><input type="email" value={communications.fromEmail} onChange={(event) => change(['communications','fromEmail'], event.target.value)} /></Field>
            <Field label="Reply-to email"><input type="email" value={communications.replyToEmail} onChange={(event) => change(['communications','replyToEmail'], event.target.value)} /></Field>
            <Field label="SMS provider"><select value={communications.smsProvider} onChange={(event) => change(['communications','smsProvider'], event.target.value)}><option value="disabled">Disabled for initial release</option><option value="twilio">Twilio</option></select></Field>
          </div>
        </>}
        {tab === 'cleanup' && <>
          <div className="section-heading"><div><p className="eyebrow">Safe cleanup</p><h2>Quarantine policy</h2></div></div>
          <div className="settings-grid">
            <Field label="Days before deletion"><div className="number-suffix"><input type="number" min="0" max="365" value={cleanup.quarantineDays} onChange={(event) => change(['cleanup','quarantineDays'], Number(event.target.value))} /><span>days</span></div></Field>
            <Toggle checked={cleanup.numericNameCandidates} onChange={(value) => change(['cleanup','numericNameCandidates'], value)} label="Flag numeric-only names" />
            <Toggle checked={cleanup.missingContactCandidates} onChange={(value) => change(['cleanup','missingContactCandidates'], value)} label="Flag records without email or phone" />
            <Toggle checked={cleanup.requireNoBadge} onChange={(value) => change(['cleanup','requireNoBadge'], value)} label="Only flag records without a badge" />
            <Toggle checked={cleanup.requireNoAttendance} onChange={(value) => change(['cleanup','requireNoAttendance'], value)} label="Only flag records without attendance" />
          </div>
          <p className="muted-block">Quarantine means a record is flagged and hidden from normal workflows for review. It is not permanently deleted until an authorized person approves the purge.</p>
        </>}
        {tab === 'kiosk' && <>
          <div className="section-heading"><div><p className="eyebrow">Front desk experience</p><h2>Kiosk timing and scanner guidance</h2></div></div>
          <div className="settings-grid">
            <Field label="Successful result display"><div className="number-suffix"><input type="number" min="2" max="30" value={kiosk.resultTimeoutSeconds} onChange={(event) => change(['kiosk','resultTimeoutSeconds'], Number(event.target.value))} /><span>seconds</span></div></Field>
            <Field label="Form inactivity timeout"><div className="number-suffix"><input type="number" min="30" max="600" value={kiosk.formTimeoutSeconds} onChange={(event) => change(['kiosk','formTimeoutSeconds'], Number(event.target.value))} /><span>seconds</span></div></Field>
            <Field label="Badge-link session timeout"><div className="number-suffix"><input type="number" min="120" max="1800" value={kiosk.claimTimeoutSeconds} onChange={(event) => change(['kiosk','claimTimeoutSeconds'], Number(event.target.value))} /><span>seconds</span></div></Field>
            <Toggle checked={kiosk.showClock} onChange={(value) => change(['kiosk','showClock'], value)} label="Show date and time" />
            <Toggle checked={kiosk.showScannerArrow} onChange={(value) => change(['kiosk','showScannerArrow'], value)} label="Show arrow to physical reader" />
            <Field label="Scanner instruction"><textarea rows="3" value={kiosk.scannerInstruction} onChange={(event) => change(['kiosk','scannerInstruction'], event.target.value)} /></Field>
          </div>
        </>}
      </div>
    </section>
  </AppShell>;
}
