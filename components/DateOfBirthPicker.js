'use client';
import { useEffect, useState } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseValue(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { year: '', month: '', day: '' };
  return { year: match[1], month: String(Number(match[2])), day: String(Number(match[3])) };
}

function daysInMonth(year, month) {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
}

function completeDate(draft, earliestYear, latestYear) {
  const year = Number(draft.year);
  const month = Number(draft.month);
  const day = Number(draft.day);
  if (!Number.isInteger(year) || draft.year.length !== 4 || year < earliestYear || year > latestYear) return '';
  if (!Number.isInteger(month) || month < 1 || month > 12) return '';
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function DateOfBirthPicker({ value, onChange, minAge = 0, maxAge = 110 }) {
  const [draft, setDraft] = useState(() => parseValue(value));
  const currentYear = new Date().getFullYear();
  const latestYear = currentYear - Math.max(0, Number(minAge || 0));
  const earliestYear = currentYear - Math.max(1, Number(maxAge || 110));
  const maxDay = daysInMonth(draft.year, draft.month);

  useEffect(() => {
    const next = parseValue(value);
    if (value && (next.year !== draft.year || next.month !== draft.month || next.day !== draft.day)) setDraft(next);
    if (!value && draft.year && draft.month && draft.day && completeDate(draft, earliestYear, latestYear)) {
      setDraft({ year: '', month: '', day: '' });
    }
    // Incomplete draft selections intentionally stay visible while the parent value is blank.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function update(part, rawValue) {
    const nextValue = part === 'year' ? String(rawValue || '').replace(/\D/g, '').slice(0, 4) : rawValue;
    const next = { ...draft, [part]: nextValue };
    if (part !== 'day' && Number(next.day) > daysInMonth(next.year, next.month)) next.day = '';
    setDraft(next);
    const completed = completeDate(next, earliestYear, latestYear);
    if (completed) onChange(completed);
    else if (value) onChange('');
  }

  const yearNumber = Number(draft.year);
  const yearInvalid = draft.year.length === 4 && (yearNumber < earliestYear || yearNumber > latestYear);

  return <div className="dob-picker" role="group" aria-label="Date of birth">
    <label><span>Month</span><select value={draft.month} onChange={(event) => update('month', event.target.value)}><option value="">Choose month</option>{MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
    <label><span>Day</span><select value={draft.day} onChange={(event) => update('day', event.target.value)}><option value="">Choose day</option>{Array.from({ length: maxDay }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}</option>)}</select></label>
    <label><span>Year</span><input className={yearInvalid ? 'invalid' : ''} type="text" inputMode="numeric" autoComplete="bday-year" maxLength={4} value={draft.year} onChange={(event) => update('year', event.target.value)} placeholder="YYYY" aria-invalid={yearInvalid} /><small>{earliestYear}–{latestYear}</small></label>
  </div>;
}
