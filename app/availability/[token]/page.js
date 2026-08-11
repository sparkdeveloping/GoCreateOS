'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck2, CheckCircle2, Clock3, Save } from 'lucide-react';
import { apiFetch } from '@/lib/client-api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityInvitePage({ params }) {
  const [token, setToken] = useState('');
  const [data, setData] = useState(null);
  const [availability, setAvailability] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.resolve(params).then((resolved) => setToken(String(resolved?.token || '')));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    apiFetch(`/api/availability/invite?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Availability form could not be loaded.');
        const rows = {};
        for (const item of result.availability || []) rows[Number(item.dayOfWeek)] = item;
        setData(result);
        setAvailability(rows);
      })
      .catch((error) => setMessage(error.message));
  }, [token]);

  function toggleDay(day, checked) {
    setAvailability((current) => ({
      ...current,
      [day]: checked
        ? current[day] || {
          dayOfWeek: day,
          startsTime: day === 0 ? '13:00' : '09:00',
          endsTime: day === 0 ? '18:00' : '21:00',
          availabilityType: 'available',
        }
        : undefined,
    }));
  }

  function changeTime(day, key, value) {
    setAvailability((current) => ({ ...current, [day]: { ...current[day], [key]: value } }));
  }

  async function save() {
    setBusy(true);
    setMessage('');
    const rows = Object.values(availability).filter(Boolean);
    const response = await apiFetch(`/api/availability/invite?token=${encodeURIComponent(token)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ availability: rows }),
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? result.message : result.error || 'Availability could not be saved.');
  }

  return <main className="self-service-shell">
    <section className="self-service-card">
      <header className="self-service-heading">
        <img src="/GCVertical_ColorAndBlack.svg" alt="GoCreate" />
        <div>
          <p className="eyebrow">Employee self-service</p>
          <h1>Recurring availability</h1>
          <p>Choose the complete time range you are normally available on each day.</p>
        </div>
      </header>

      {message && <div className={`inline-alert ${message.includes('saved') ? 'success' : 'error'}`}>{message}</div>}
      {!data && !message && <div className="availability-loading"><Clock3 />Loading your availability…</div>}

      {data && <>
        <div className="self-service-person">
          <div className="avatar-initial">{data.employee.displayName?.[0] || '?'}</div>
          <div><strong>{data.employee.displayName}</strong><span>{data.employee.staffRole?.replaceAll('-', ' ') || 'Employee'} · {data.employee.primaryArea?.replaceAll('-', ' ') || 'GoCreate'}</span></div>
          <CalendarCheck2 />
        </div>
        <div className="self-service-days">
          {DAYS.map((label, day) => {
            const row = availability[day];
            return <article key={label} className={row ? 'enabled' : ''}>
              <label className="day-toggle">
                <input type="checkbox" checked={Boolean(row)} onChange={(event) => toggleDay(day, event.target.checked)} />
                <span><strong>{label}</strong><small>{row ? 'Available' : 'Not available'}</small></span>
              </label>
              {row && <div className="availability-times">
                <label><span>From</span><input type="time" value={row.startsTime} onChange={(event) => changeTime(day, 'startsTime', event.target.value)} /></label>
                <span>to</span>
                <label><span>Until</span><input type="time" value={row.endsTime} onChange={(event) => changeTime(day, 'endsTime', event.target.value)} /></label>
              </div>}
            </article>;
          })}
        </div>
        <button className="btn primary wide self-service-save" onClick={save} disabled={busy}>
          {busy ? <Clock3 /> : message.includes('saved') ? <CheckCircle2 /> : <Save />}
          {busy ? 'Saving…' : 'Save availability'}
        </button>
        <p className="self-service-expiry">Private link expires {new Date(data.expiresAt).toLocaleDateString()}.</p>
      </>}
    </section>
  </main>;
}
