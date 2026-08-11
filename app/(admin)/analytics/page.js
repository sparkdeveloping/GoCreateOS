'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity, BadgeCheck, BarChart3, CalendarPlus, CarFront, Clock3, CreditCard,
  DoorOpen, RefreshCw, ScanLine, ShieldAlert, TrendingUp, UserRoundCheck, Users,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { DonutChart, LineChart } from '@/components/Charts';
import { EmptyState, LoadingState, MetricCard, SimpleBars, StatusPill } from '@/components/AdminUi';
import { apiFetch } from '@/lib/client-api';

const CHART_COLORS = ['var(--chart-blue)', 'var(--chart-green)', 'var(--chart-yellow)', 'var(--chart-purple)', 'var(--chart-red)', 'var(--chart-gray)'];

function entriesToRows(object = {}, limit = 12) {
  return Object.entries(object).map(([label, value]) => ({ label: String(label).replaceAll('_', ' '), value })).sort((a, b) => b.value - a.value).slice(0, limit);
}

function minutesLabel(minutes) {
  const value = Number(minutes || 0);
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  async function load() {
    setError('');
    const response = await apiFetch(`/api/analytics?days=${days}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) setError(result.error || 'Analytics could not be loaded.');
    else setData(result);
  }
  useEffect(() => { load(); }, [days]);

  const membershipRows = useMemo(() => entriesToRows(data?.membership), [data]);
  const membershipTypeRows = useMemo(() => entriesToRows(data?.membershipTypes, 10), [data]);
  const busiest = useMemo(() => data ? [...data.hourly].sort((a, b) => b.count - a.count).slice(0, 8).map((row) => ({ label: new Date(2000, 0, 1, row.hour).toLocaleTimeString([], { hour: 'numeric' }), value: row.count })) : [], [data]);
  const dailyCheckins = useMemo(() => data?.daily?.map((day) => ({ label: new Date(`${day.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: day.checkIns })) || [], [data]);
  const dailyGuests = useMemo(() => data?.daily?.map((day) => ({ label: new Date(`${day.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: day.guests })) || [], [data]);

  return <AppShell title="Analytics" subtitle="Membership growth, attendance, guests, employees, badges, payments, parking, and operational reliability" actions={<div className="header-filter"><select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option><option value={365}>1 year</option></select><button className="btn secondary" onClick={load}><RefreshCw size={18} />Refresh</button></div>}>
    {error && <div className="inline-alert error">{error}</div>}
    {!data ? <LoadingState label="Calculating analytics from the local database…" /> : <>
      <section className="metric-grid analytics-metrics">
        <MetricCard icon={Users} label="Active members" value={data.cards.activeMembers} detail={`${data.cards.people} total profiles`} tone="green" />
        <MetricCard icon={CalendarPlus} label="New this month" value={data.cards.newMembersThisMonth} detail={`${data.cards.expiringSoon} expire in 30 days`} tone="blue" />
        <MetricCard icon={DoorOpen} label="Member check-ins" value={data.cards.memberCheckIns} detail={`${data.cards.uniqueVisitors} unique visitors`} tone="blue" />
        <MetricCard icon={UserRoundCheck} label="Guest visits" value={data.cards.guestVisits} detail={`${data.cards.guestWaiverRate}% waiver capture`} tone="yellow" />
        <MetricCard icon={Clock3} label="Employee hours" value={data.cards.employeeHours} detail={`${data.cards.employeeShifts} shifts`} tone="purple" />
        <MetricCard icon={ScanLine} label="Scan recognition" value={`${data.cards.scanRecognitionRate}%`} detail={`${data.cards.unknownBadgeScans} unknown scans`} tone="blue" />
        <MetricCard icon={CreditCard} label="Auto pay" value={data.cards.autoPay} detail={`${data.dataCoverage.autoPayKnownPercent}% recorded`} tone="green" />
        <MetricCard icon={CarFront} label="Vehicle records" value={data.cards.vehiclesTracked} detail={`${data.dataCoverage.vehiclePercent}% coverage`} tone="yellow" />
      </section>

      <section className="analytics-grid v4-analytics-grid">
        <article className="panel card-section span-2"><div className="section-heading"><div><p className="eyebrow">Traffic trend</p><h2>Daily member check-ins</h2></div><TrendingUp /></div><LineChart rows={dailyCheckins} /></article>
        <article className="panel card-section"><div className="section-heading"><div><p className="eyebrow">Membership health</p><h2>Status distribution</h2></div><Users /></div><DonutChart centerLabel="profiles" rows={membershipRows.map((row, index) => ({ ...row, color: CHART_COLORS[index % CHART_COLORS.length] }))} /></article>

        <article className="panel card-section"><div className="section-heading"><div><p className="eyebrow">Member acquisition</p><h2>New profiles by month</h2></div><CalendarPlus /></div><LineChart rows={data.memberGrowth.map((row) => ({ label: row.label, value: row.joined }))} /></article>
        <article className="panel card-section span-2"><div className="section-heading"><div><p className="eyebrow">Membership mix</p><h2>Membership types</h2></div><BarChart3 /></div>{membershipTypeRows.length ? <SimpleBars rows={membershipTypeRows} /> : <EmptyState icon={Users} title="No membership types" message="Types will appear after directory synchronization." />}</article>

        <article className="panel card-section"><div className="section-heading"><div><p className="eyebrow">Payments</p><h2>Auto-pay notation</h2></div><CreditCard /></div><DonutChart centerLabel="profiles" rows={[{ label: 'Auto pay', value: data.autoPay.yes, color: CHART_COLORS[1] }, { label: 'Manual pay', value: data.autoPay.no, color: CHART_COLORS[2] }, { label: 'Not recorded', value: data.autoPay.unknown, color: CHART_COLORS[5] }]} /><p className="muted-block">Payment and auto-pay analytics use synced fields when available and the manual front-desk notation otherwise.</p></article>
        <article className="panel card-section span-2"><div className="section-heading"><div><p className="eyebrow">Guest operations</p><h2>Guest visits by day</h2></div><UserRoundCheck /></div><LineChart rows={dailyGuests} /><div className="mini-stats four"><div><strong>{data.cards.uniqueGuests}</strong><span>Unique guests</span></div><div><strong>{minutesLabel(data.cards.averageGuestMinutes)}</strong><span>Average visit</span></div><div><strong>{data.cards.guestsInside}</strong><span>Inside now</span></div><div><strong>{data.cards.guestWaiverRate}%</strong><span>Waivers recorded</span></div></div></article>

        <article className="panel card-section"><div className="section-heading"><div><p className="eyebrow">Guest hosts</p><h2>Top associated members</h2></div><Activity /></div>{data.topHosts.length ? <ol className="ranked-list">{data.topHosts.slice(0, 8).map((host, index) => <li key={`${host.hostPersonId}-${index}`}><span>{index + 1}</span><strong>{host.name}</strong><em>{host.visits} guests</em></li>)}</ol> : <EmptyState icon={UserRoundCheck} title="No guest visits" message="Guest visits now aggregate directly from the guest-visit records, not only attendance events." />}</article>
        <article className="panel card-section"><div className="section-heading"><div><p className="eyebrow">Timing</p><h2>Busiest hours</h2></div><Clock3 /></div>{busiest.some((row) => row.value) ? <SimpleBars rows={busiest} /> : <EmptyState icon={Clock3} title="Not enough scan data" message="Busiest-hour patterns appear after check-ins are recorded." />}</article>
        <article className="panel card-section"><div className="section-heading"><div><p className="eyebrow">Engagement</p><h2>Repeat member activity</h2></div><Activity /></div><div className="mini-stats"><div><strong>{data.cards.repeatVisitorRate}%</strong><span>Repeat visitor rate</span></div><div><strong>{data.cards.averageVisitsPerVisitor}</strong><span>Average visits</span></div><div><strong>{data.cards.peakOccupancy}</strong><span>Peak occupancy</span></div></div>{data.topVisitors.length ? <ol className="ranked-list compact">{data.topVisitors.slice(0, 6).map((visitor, index) => <li key={`${visitor.personId}-${index}`}><span>{index + 1}</span><strong>{visitor.name}</strong><em>{visitor.count}</em></li>)}</ol> : null}</article>

        <article className="panel card-section span-3"><div className="section-heading"><div><p className="eyebrow">Employees</p><h2>Shift statistics</h2></div><Clock3 /></div>{data.employeeStats.length ? <div className="responsive-table"><table><thead><tr><th>Employee</th><th>Shifts</th><th>Total hours</th><th>Average shift</th><th>Open now</th></tr></thead><tbody>{data.employeeStats.map((employee) => <tr key={employee.employeeId || employee.name}><td><strong>{employee.name}</strong></td><td>{employee.shifts}</td><td>{employee.hours}</td><td>{minutesLabel(employee.averageShiftMinutes)}</td><td><StatusPill tone={employee.openShifts ? 'yellow' : 'neutral'}>{employee.openShifts || 0}</StatusPill></td></tr>)}</tbody></table></div> : <EmptyState icon={Clock3} title="No employee shifts in range" message="Clock-in and clock-out events appear here automatically." />}</article>

        <article className="panel card-section span-2"><div className="section-heading"><div><p className="eyebrow">Data coverage</p><h2>Where more information would improve decisions</h2></div><ShieldAlert /></div><div className="coverage-list"><div><span>Auto-pay known</span><strong>{data.dataCoverage.autoPayKnownPercent}%</strong><i><b style={{ width: `${data.dataCoverage.autoPayKnownPercent}%` }} /></i></div><div><span>Payment details</span><strong>{data.dataCoverage.paymentPercent}%</strong><i><b style={{ width: `${data.dataCoverage.paymentPercent}%` }} /></i></div><div><span>Vehicle or parking</span><strong>{data.dataCoverage.vehiclePercent}%</strong><i><b style={{ width: `${data.dataCoverage.vehiclePercent}%` }} /></i></div></div><p className="muted-block">The sync worker now preserves extra source columns such as auto pay, payment status, vehicle, plate, and parking permit when those columns are present. Manual values remain available when the source does not expose them.</p></article>
        <article className="panel card-section"><div className="section-heading"><div><p className="eyebrow">Payment operations</p><h2>Payment status and plans</h2></div><CreditCard /></div>{entriesToRows(data.paymentStatus, 8).length ? <SimpleBars rows={entriesToRows(data.paymentStatus, 8)} /> : <EmptyState icon={CreditCard} title="No payment statuses yet" message="Record them in People or expose the source column in GoCreate." />}{entriesToRows(data.paymentPlans, 6).length ? <div className="analytics-subsection"><strong>Payment plans</strong><SimpleBars rows={entriesToRows(data.paymentPlans, 6)} /></div> : null}</article>
        <article className="panel card-section"><div className="section-heading"><div><p className="eyebrow">Parking and vehicles</p><h2>Operational coverage</h2></div><CarFront /></div>{entriesToRows(data.vehicleMakes, 8).length ? <SimpleBars rows={entriesToRows(data.vehicleMakes, 8)} /> : <EmptyState icon={CarFront} title="No vehicle makes recorded" message="Vehicle and parking fields can be synced or entered by staff." />}{entriesToRows(data.parkingPermits, 6).length ? <div className="analytics-subsection"><strong>Parking permits</strong><SimpleBars rows={entriesToRows(data.parkingPermits, 6)} /></div> : null}</article>
        <article className="panel card-section span-3"><div className="section-heading"><div><p className="eyebrow">Source-field intelligence</p><h2>Every extra membership field captured by sync</h2></div><BarChart3 /></div>{data.metadataInsights?.length ? <div className="metadata-insight-grid">{data.metadataInsights.map((item) => <article key={item.key}><div><strong>{item.label}</strong><span>{item.coverage} profiles · {item.coveragePercent}% coverage · {item.uniqueValues} unique</span></div>{item.valuesHidden ? <small>Values hidden because this field may contain identifying information.</small> : item.topValues?.length ? <ul>{item.topValues.map((value) => <li key={value.label}><span>{value.label}</span><strong>{value.count}</strong></li>)}</ul> : <small>No useful distribution available.</small>}</article>)}</div> : <EmptyState icon={BarChart3} title="No extra source columns yet" message="When GoCreate exposes payment, vehicle, parking, release, or other columns, the sync worker preserves them and summarizes them here automatically." />}</article>
        <article className="panel card-section"><div className="section-heading"><div><p className="eyebrow">Reliability</p><h2>Operational logging</h2></div><BadgeCheck /></div><div className="mini-stats"><div><strong>{data.cards.scanAttempts}</strong><span>Badge scans</span></div><div><strong>{data.cards.auditedActions}</strong><span>Audited actions</span></div><div><strong>{data.cards.openEmployeeShifts}</strong><span>Open shifts</span></div></div><p className="muted-block">Page views, kiosk commands, account-link attempts, check-ins, guest waivers, role changes, exports, and maintenance actions are included in the audit trail.</p></article>
      </section>
    </>}
  </AppShell>;
}
