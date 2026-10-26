import type { Me, Role } from '@devconnector/shared';
import { notFound } from '@tanstack/react-router';

const STAFF_ROLES: readonly Role[] = ['owner', 'admin'];

export function isStaff(me: Me | null | undefined): boolean {
  return me !== null && me !== undefined && STAFF_ROLES.includes(me.role);
}

/** `beforeLoad` helper for staff-only routes: non-staff get a 404, not a hint. */
export function requireStaff(me: Me | null | undefined): Me {
  if (!me || !STAFF_ROLES.includes(me.role)) throw notFound();
  return me;
}

/** The post-login redirect target must be an internal path (never an absolute URL). */
export function safeRedirect(target: string | undefined, fallback = '/'): string {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return fallback;
  return target;
}
