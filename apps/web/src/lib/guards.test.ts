import type { Me } from '@devconnector/shared';
import { isNotFound } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { isStaff, requireStaff, safeRedirect } from './guards.ts';

const me = (role: Me['role']) => ({ role }) as Me;

describe('guards', () => {
  it('isStaff: owner and admin only', () => {
    expect(isStaff(me('owner'))).toBe(true);
    expect(isStaff(me('admin'))).toBe(true);
    expect(isStaff(me('user'))).toBe(false);
    expect(isStaff(null)).toBe(false);
    expect(isStaff(undefined)).toBe(false);
  });

  it('requireStaff: members and anonymous visitors get a router 404, not a 403 hint', () => {
    expect(requireStaff(me('admin')).role).toBe('admin');
    for (const who of [me('user'), null, undefined]) {
      try {
        requireStaff(who);
        expect.unreachable('should have thrown');
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });

  it('safeRedirect: only internal paths survive', () => {
    expect(safeRedirect('/admin/posts')).toBe('/admin/posts');
    expect(safeRedirect('/admin?x=1')).toBe('/admin?x=1');
    expect(safeRedirect('https://evil.example')).toBe('/');
    expect(safeRedirect('//evil.example')).toBe('/');
    expect(safeRedirect('admin')).toBe('/');
    expect(safeRedirect(undefined, '/admin')).toBe('/admin');
    expect(safeRedirect('', '/admin')).toBe('/admin');
  });
});
