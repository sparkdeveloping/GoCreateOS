'use client';
import { Inbox, LoaderCircle } from 'lucide-react';

export function EmptyState({ icon: Icon = Inbox, title, message, action = null }) {
  return <div className="empty-state"><div className="empty-icon"><Icon /></div><strong>{title}</strong><p>{message}</p>{action}</div>;
}

export function LoadingState({ label = 'Loading data…' }) {
  return <div className="loading-state"><LoaderCircle className="spin" /><span>{label}</span></div>;
}

export function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

export function MetricCard({ icon: Icon, label, value, detail, tone = 'blue' }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}><Icon /></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

export function SimpleBars({ rows, valueKey = 'value', labelKey = 'label', max = null }) {
  const largest = max || Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));
  return <div className="simple-bars">{rows.map((row) => <div className="bar-row" key={row[labelKey]}><span>{row[labelKey]}</span><div><i style={{ width: `${Math.max(2, (Number(row[valueKey] || 0) / largest) * 100)}%` }} /></div><strong>{row[valueKey]}</strong></div>)}</div>;
}
