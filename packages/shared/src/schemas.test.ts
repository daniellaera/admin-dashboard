import { describe, expect, it } from 'vitest';
import { displayNameOf, labelOf, POST_TAGS, SKILL_VALUES, TAG_VALUES } from './constants.ts';
import { adminUserUpdateSchema } from './schemas/admin.ts';
import { loginSchema, registerSchema } from './schemas/auth.ts';
import { pageQuerySchema } from './schemas/common.ts';
import { experienceInputSchema } from './schemas/cv.ts';
import { postCreateSchema, postUpdateSchema, postsQuerySchema } from './schemas/posts.ts';
import { profileUpdateSchema } from './schemas/profile.ts';

describe('constants', () => {
  it('exposes the 15 programming languages and 14 tags of the original app', () => {
    expect(SKILL_VALUES).toHaveLength(15);
    expect(TAG_VALUES).toHaveLength(14);
    expect(labelOf(POST_TAGS, 'joblife')).toBe('Job Life');
    expect(labelOf(POST_TAGS, 'unknown')).toBe('unknown');
  });

  it('never derives a display name from an e-mail address', () => {
    expect(displayNameOf({ id: 7, username: 'hulk' })).toBe('hulk');
    expect(displayNameOf({ id: 7, username: '  ' })).toBe('Developer #7');
    expect(displayNameOf({ id: 7, username: null })).toBe('Developer #7');
  });
});

describe('auth schemas', () => {
  it('normalises e-mail and enforces the password policy', () => {
    const ok = registerSchema.parse({ email: '  Hulk@Marvel.COM ', password: 'longenough' });
    expect(ok.email).toBe('hulk@marvel.com');
    expect(registerSchema.safeParse({ email: 'nope', password: 'longenough' }).success).toBe(false);
    expect(registerSchema.safeParse({ email: 'a@b.co', password: 'short' }).success).toBe(false);
    expect(registerSchema.safeParse({ email: 'a@b.co', password: 'x'.repeat(129) }).success).toBe(
      false,
    );
  });

  it('rejects unknown keys (no mass assignment)', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'pw', role: 'admin' }).success).toBe(
      false,
    );
  });
});

describe('profile schema', () => {
  it('accepts a partial update and validates the website URL', () => {
    expect(profileUpdateSchema.parse({ bio: ' hi ' })).toEqual({ bio: 'hi' });
    expect(profileUpdateSchema.safeParse({ website: 'https://example.com' }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ website: '' }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ website: 'javascript:alert(1)' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ skills: ['python', 'cobol'] }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ email: 'x@y.z' }).success).toBe(false);
  });
});

describe('post schemas', () => {
  it('validates create and partial update', () => {
    const post = { title: 'T', content: 'C', type: 'TECH', published: true, tags: ['devops'] };
    expect(postCreateSchema.safeParse(post).success).toBe(true);
    expect(postCreateSchema.safeParse({ ...post, tags: ['nope'] }).success).toBe(false);
    expect(postCreateSchema.safeParse({ ...post, type: 'MEME' }).success).toBe(false);
    expect(postUpdateSchema.parse({ published: false })).toEqual({ published: false });
    expect(postUpdateSchema.safeParse({ authorId: 1 }).success).toBe(false);
  });

  it('coerces and bounds query parameters', () => {
    expect(pageQuerySchema.parse({})).toEqual({ page: 1, limit: 10 });
    expect(postsQuerySchema.parse({ page: '3', limit: '50', tag: 'tech' })).toMatchObject({
      page: 3,
      limit: 50,
      tag: 'tech',
    });
    expect(postsQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
    expect(postsQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });
});

describe('cv schemas', () => {
  const base = {
    title: 'Dev',
    description: 'Things',
    company: 'ACME',
    location: 'Remote',
    startedOn: '2023-02-19',
  };
  it('requires an end date unless current, and orders dates', () => {
    expect(
      experienceInputSchema.safeParse({ ...base, endedOn: null, isCurrent: true }).success,
    ).toBe(true);
    expect(
      experienceInputSchema.safeParse({ ...base, endedOn: null, isCurrent: false }).success,
    ).toBe(false);
    expect(
      experienceInputSchema.safeParse({ ...base, endedOn: '2022-01-01', isCurrent: false }).success,
    ).toBe(false);
    expect(
      experienceInputSchema.safeParse({ ...base, endedOn: '2023-03-01', isCurrent: false }).success,
    ).toBe(true);
  });
});

describe('admin schemas', () => {
  it('requires at least one field', () => {
    expect(adminUserUpdateSchema.safeParse({}).success).toBe(false);
    expect(adminUserUpdateSchema.safeParse({ role: 'admin' }).success).toBe(true);
    expect(adminUserUpdateSchema.safeParse({ role: 'root' }).success).toBe(false);
  });
});
