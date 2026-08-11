export const ADMIN_ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  FRONT_DESK: 'front_desk',
  MEMBER: 'member',
});

export const PERMISSIONS = Object.freeze({
  DASHBOARD_VIEW: 'dashboard.view',
  PEOPLE_VIEW: 'people.view',
  PEOPLE_EDIT: 'people.edit',
  BADGES_MANAGE: 'badges.manage',
  ACCESS_MANAGE: 'access.manage',
  GUESTS_MANAGE: 'guests.manage',
  EMPLOYEES_MANAGE: 'employees.manage',
  REPORTS_VIEW: 'reports.view',
  ANALYTICS_VIEW: 'analytics.view',
  KIOSKS_MANAGE: 'kiosks.manage',
  SYNC_RUN: 'sync.run',
  ROLES_MANAGE: 'roles.manage',
  SYSTEM_MAINTAIN: 'system.maintain',
  SETTINGS_MANAGE: 'settings.manage',
  PRESENCE_MANAGE: 'presence.manage',
  SCHEDULE_MANAGE: 'schedule.manage',
  CALENDAR_MANAGE: 'calendar.manage',
  COMMUNICATIONS_MANAGE: 'communications.manage',
  DATA_QUALITY_MANAGE: 'data-quality.manage',
});

const ROLE_PERMISSIONS = Object.freeze({
  [ADMIN_ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ADMIN_ROLES.ADMIN]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PEOPLE_VIEW,
    PERMISSIONS.PEOPLE_EDIT,
    PERMISSIONS.BADGES_MANAGE,
    PERMISSIONS.ACCESS_MANAGE,
    PERMISSIONS.GUESTS_MANAGE,
    PERMISSIONS.EMPLOYEES_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.KIOSKS_MANAGE,
    PERMISSIONS.SYNC_RUN,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.PRESENCE_MANAGE,
    PERMISSIONS.SCHEDULE_MANAGE,
    PERMISSIONS.CALENDAR_MANAGE,
    PERMISSIONS.COMMUNICATIONS_MANAGE,
    PERMISSIONS.DATA_QUALITY_MANAGE,
  ],
  [ADMIN_ROLES.FRONT_DESK]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PEOPLE_VIEW,
    PERMISSIONS.PEOPLE_EDIT,
    PERMISSIONS.BADGES_MANAGE,
    PERMISSIONS.ACCESS_MANAGE,
    PERMISSIONS.GUESTS_MANAGE,
    PERMISSIONS.EMPLOYEES_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.KIOSKS_MANAGE,
    PERMISSIONS.SYNC_RUN,
    PERMISSIONS.PRESENCE_MANAGE,
    PERMISSIONS.CALENDAR_MANAGE,
  ],
  [ADMIN_ROLES.MEMBER]: [],
});

export function normalizeAdminRole(value, person = {}) {
  const raw = String(value || '').trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  if (person.isSuperAdmin || raw === ADMIN_ROLES.SUPER_ADMIN) return ADMIN_ROLES.SUPER_ADMIN;
  if (raw === ADMIN_ROLES.ADMIN) return ADMIN_ROLES.ADMIN;
  if (raw === ADMIN_ROLES.FRONT_DESK || raw === 'staff' || raw === 'frontdesk') return ADMIN_ROLES.FRONT_DESK;
  if (person.isAdmin) return ADMIN_ROLES.ADMIN;
  return ADMIN_ROLES.MEMBER;
}

export function permissionsForRole(role) {
  return [...(ROLE_PERMISSIONS[normalizeAdminRole(role)] || [])];
}

export function hasPermission(subject, permission) {
  if (!subject || !permission) return false;
  const permissions = Array.isArray(subject.permissions)
    ? subject.permissions
    : permissionsForRole(subject.adminRole || subject.role);
  return permissions.includes(permission);
}

export function withAdminRole(person = {}) {
  const adminRole = normalizeAdminRole(person.adminRole, person);
  return {
    ...person,
    adminRole,
    isAdmin: adminRole !== ADMIN_ROLES.MEMBER,
    isSuperAdmin: adminRole === ADMIN_ROLES.SUPER_ADMIN,
    permissions: permissionsForRole(adminRole),
  };
}

export function roleLabel(role) {
  const normalized = normalizeAdminRole(role);
  if (normalized === ADMIN_ROLES.SUPER_ADMIN) return 'Super admin';
  if (normalized === ADMIN_ROLES.ADMIN) return 'Admin';
  if (normalized === ADMIN_ROLES.FRONT_DESK) return 'Front desk';
  return 'Member';
}
