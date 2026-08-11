'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity, BadgeCheck, BarChart3, CalendarDays, CalendarRange, ClipboardList, DoorOpen, HelpCircle,
  LayoutDashboard, LogOut, Mail, Menu, MonitorSmartphone, SearchCheck, Settings2, ShieldCheck,
  Users, UserRoundCheck, UserRoundCog, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, setClientAdminToken } from '@/lib/client-api';
import { hasPermission, PERMISSIONS, roleLabel } from '@/lib/permissions';

const links = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_VIEW },
  { href: '/people', label: 'People', icon: Users, permission: PERMISSIONS.PEOPLE_VIEW },
  { href: '/badges', label: 'Badge Studio', icon: BadgeCheck, permission: PERMISSIONS.BADGES_MANAGE },
  { href: '/access', label: 'Door access', icon: ShieldCheck, permission: PERMISSIONS.ACCESS_MANAGE },
  { href: '/guests', label: 'Guests', icon: UserRoundCheck, permission: PERMISSIONS.GUESTS_MANAGE },
  { href: '/presence', label: 'Live presence', icon: Activity, permission: PERMISSIONS.PRESENCE_MANAGE },
  { href: '/calendar', label: 'Operations calendar', icon: CalendarDays, permission: PERMISSIONS.CALENDAR_MANAGE },
  { href: '/schedule', label: 'Staff scheduling', icon: CalendarRange, permission: PERMISSIONS.SCHEDULE_MANAGE },
  { href: '/communications', label: 'Communications', icon: Mail, permission: PERMISSIONS.COMMUNICATIONS_MANAGE },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, permission: PERMISSIONS.ANALYTICS_VIEW },
  { href: '/reports', label: 'Activity log', icon: ClipboardList, permission: PERMISSIONS.REPORTS_VIEW },
  { href: '/kiosks', label: 'Kiosk control', icon: MonitorSmartphone, permission: PERMISSIONS.KIOSKS_MANAGE },
  { href: '/team', label: 'Admin access', icon: UserRoundCog, permission: PERMISSIONS.ROLES_MANAGE },
  { href: '/settings', label: 'Operations settings', icon: Settings2, permission: PERMISSIONS.SETTINGS_MANAGE },
  { href: '/data-quality', label: 'Data quality', icon: SearchCheck, permission: PERMISSIONS.DATA_QUALITY_MANAGE },
  { href: '/system', label: 'System tools', icon: Settings2, permission: PERMISSIONS.SYSTEM_MAINTAIN },
  { href: '/kiosk', label: 'Public kiosk', icon: DoorOpen, permission: null },
];

export default function AppShell({ children, title = 'GoCreate OS', subtitle = 'Operations platform', actions = null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [help, setHelp] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let active = true;
    apiFetch('/api/admin/session', { cache: 'no-store' }).then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!active) return;
      if (!response.ok) {
        router.push('/kiosk?admin=scan-required');
        return;
      }
      setSession(result.session || null);
    });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!session || pathname === '/kiosk') return;
    apiFetch('/api/audit', {
      method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ action: 'admin.page.viewed', source: 'admin-ui', targetType: 'page', targetId: pathname, details: { title } }),
    }).catch(() => {});
  }, [pathname, session, title]);

  const visibleLinks = useMemo(() => links.filter((link) => !link.permission || hasPermission(session, link.permission)), [session]);

  async function logout() {
    await apiFetch('/api/admin/session', { method: 'DELETE' });
    setClientAdminToken('');
    router.push('/kiosk');
    router.refresh();
  }

  return <div className="admin-layout">
    <aside className={`sidebar ${mobile ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <img src="/GCVertical_ColorAndBlack.svg" alt="GoCreate" />
        <div><strong>GoCreate OS</strong><span>Version 6.2</span></div>
        <button className="icon-button sidebar-close" onClick={() => setMobile(false)} aria-label="Close menu"><X /></button>
      </div>
      <nav className="sidebar-nav" aria-label="Admin navigation">
        {visibleLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));
          return <Link key={href} href={href} className={active ? 'active' : ''} onClick={() => setMobile(false)}>
            <Icon size={20} aria-hidden="true" /><span>{label}</span>
          </Link>;
        })}
      </nav>
      <div className="sidebar-session">
        <strong>{session?.displayName || 'Loading session…'}</strong>
        <span>{roleLabel(session?.adminRole)}</span>
      </div>
      <div className="sidebar-footer">
        <button onClick={() => setHelp(true)}><HelpCircle size={19} />Help</button>
        <button onClick={logout}><LogOut size={19} />End admin session</button>
      </div>
    </aside>
    {mobile && <button className="sidebar-scrim" onClick={() => setMobile(false)} aria-label="Close menu" />}
    <div className="admin-main">
      <header className="admin-header">
        <button className="icon-button mobile-menu" onClick={() => setMobile(true)} aria-label="Open menu"><Menu /></button>
        <div><p className="eyebrow">GoCreate operations</p><h1>{title}</h1><p>{subtitle}</p></div>
        <div className="header-actions">{actions}</div>
      </header>
      <main className="admin-content">{children}</main>
    </div>
    {help && <div className="modal-back" onClick={() => setHelp(false)}>
      <section className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div className="icon-tile blue"><HelpCircle /></div><div><h2>Quick help</h2><p>Each screen is organized around one front-desk job.</p></div></div>
        <div className="help-grid">
          <article><DoorOpen /><div><strong>Public kiosk</strong><p>Every non-final screen returns to the scanner automatically. Super admins and authorized staff can reset it remotely.</p></div></article>
          <article><BadgeCheck /><div><strong>Badge Studio</strong><p>Link, photograph, save, and print a badge without printing its RFID number.</p></div></article>
          <article><Users /><div><strong>Roles</strong><p>Front-desk users manage people and badges. Admins also see analytics. Super admins control roles and system maintenance.</p></div></article>
          <article><Activity /><div><strong>Audit trail</strong><p>Scans, check-ins, guest waivers, badge changes, page views, resets, exports, and maintenance actions are recorded.</p></div></article>
        </div>
        <button className="btn primary wide" onClick={() => setHelp(false)}>Done</button>
      </section>
    </div>}
  </div>;
}
