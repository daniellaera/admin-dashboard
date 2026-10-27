import type { ExperienceDto, Paginated, ProfileDetail, PublicProfile } from '@devconnector/shared';
import { describe, expect, it } from 'vitest';
import { createPost, createUser } from '../factories.ts';
import { buildApp, json, problem } from '../helpers.ts';

describe('developers directory', () => {
  it('lists public profiles of active users with search and pagination', async () => {
    const app = await buildApp();
    await createUser({ username: 'Hulk Green', company: 'Avengers' });
    await createUser({ username: 'Matthew Laing', company: 'Matthew&Co' });
    await createUser({ username: 'Private Pete', isPublic: false });
    await createUser({ username: 'Gone Gary', disabled: true });

    const all = (await (await json(app, 'GET', '/profiles')).json()) as Paginated<PublicProfile>;
    expect(all.total).toBe(2);
    expect(all.items.map((p) => p.displayName).sort()).toEqual(['Hulk Green', 'Matthew Laing']);
    const search = (await (
      await json(app, 'GET', '/profiles?q=matthew')
    ).json()) as Paginated<PublicProfile>;
    expect(search.items.map((p) => p.displayName)).toEqual(['Matthew Laing']);
    const byCompany = (await (
      await json(app, 'GET', '/profiles?q=aveng')
    ).json()) as Paginated<PublicProfile>;
    expect(byCompany.items.map((p) => p.displayName)).toEqual(['Hulk Green']);
  });

  it('shows a private profile only to its owner and to admins', async () => {
    const app = await buildApp();
    const pete = await createUser({ username: 'pete', isPublic: false });
    const other = await createUser();
    const admin = await createUser({ role: 'admin' });
    await createPost(pete.id);
    await createPost(pete.id, { published: false });
    expect((await json(app, 'GET', `/profiles/${pete.id}`)).status).toBe(404);
    expect(
      (await json(app, 'GET', `/profiles/${pete.id}`, undefined, { cookie: other.cookie })).status,
    ).toBe(404);
    const own = await json(app, 'GET', `/profiles/${pete.id}`, undefined, { cookie: pete.cookie });
    expect(own.status).toBe(200);
    expect(((await own.json()) as ProfileDetail).postCount).toBe(1);
    expect(
      (await json(app, 'GET', `/profiles/${pete.id}`, undefined, { cookie: admin.cookie })).status,
    ).toBe(200);
  });
});

describe('own profile and CV', () => {
  it('updates the profile partially, normalises empty strings and validates skills', async () => {
    const app = await buildApp();
    const me = await createUser({ username: 'old' });
    expect((await json(app, 'PATCH', '/me/profile', { bio: 'x' })).status).toBe(401);
    const res = await json(
      app,
      'PATCH',
      '/me/profile',
      {
        username: 'Hulk Green',
        website: '',
        bio: ' Smash. ',
        skills: ['typescript', 'rust', 'rust'],
        isPublic: false,
      },
      { cookie: me.cookie },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      username: 'Hulk Green',
      displayName: 'Hulk Green',
      website: null,
      bio: 'Smash.',
      skills: ['typescript', 'rust'],
      isPublic: false,
    });
    const bad = await json(
      app,
      'PATCH',
      '/me/profile',
      { skills: ['cobol'], email: 'x@y.z' },
      { cookie: me.cookie },
    );
    expect(bad.status).toBe(400);
    // Unknown keys are rejected by the schema before anything else runs.
    expect((await problem(bad)).errors?.map((e) => e.path)).toEqual(['']);
    const unknownSkill = await json(
      app,
      'PATCH',
      '/me/profile',
      { skills: ['cobol'] },
      { cookie: me.cookie },
    );
    expect(unknownSkill.status).toBe(400);
    expect((await problem(unknownSkill)).errors).toEqual([
      { path: 'skills.0', message: 'Unknown skill "cobol"' },
    ]);
    const mine = (await (
      await json(app, 'GET', '/me/profile', undefined, { cookie: me.cookie })
    ).json()) as ProfileDetail;
    expect(mine.isPublic).toBe(false);
    expect(JSON.stringify(mine)).not.toContain(me.email);
  });

  it('manages experiences and educations owner-only with period validation', async () => {
    const app = await buildApp();
    const me = await createUser();
    const other = await createUser();
    const exp = {
      title: 'Dev',
      description: 'Stuff',
      company: 'ACME',
      location: 'Remote',
      startedOn: '2020-01-01',
      endedOn: null,
      isCurrent: true,
    };

    const created = await json(app, 'POST', '/me/experiences', exp, { cookie: me.cookie });
    expect(created.status).toBe(201);
    const dto = (await created.json()) as ExperienceDto;
    expect(dto).toMatchObject({ ...exp, endedOn: null });

    const invalid = await json(
      app,
      'POST',
      '/me/experiences',
      { ...exp, isCurrent: false },
      { cookie: me.cookie },
    );
    expect(invalid.status).toBe(400);
    expect((await problem(invalid)).errors?.[0]?.path).toBe('endedOn');

    const updated = await json(
      app,
      'PUT',
      `/me/experiences/${dto.id}`,
      { ...exp, isCurrent: false, endedOn: '2021-06-30' },
      { cookie: me.cookie },
    );
    expect(updated.status).toBe(200);
    expect(((await updated.json()) as ExperienceDto).endedOn).toBe('2021-06-30');

    // Another user cannot touch it (owner-scoped queries → 404, no information leak).
    expect(
      (await json(app, 'PUT', `/me/experiences/${dto.id}`, exp, { cookie: other.cookie })).status,
    ).toBe(404);
    expect(
      (await json(app, 'DELETE', `/me/experiences/${dto.id}`, undefined, { cookie: other.cookie }))
        .status,
    ).toBe(404);
    expect(
      await (await json(app, 'GET', '/me/experiences', undefined, { cookie: other.cookie })).json(),
    ).toEqual([]);

    expect(
      (await json(app, 'DELETE', `/me/experiences/${dto.id}`, undefined, { cookie: me.cookie }))
        .status,
    ).toBe(204);
    expect(
      await (await json(app, 'GET', '/me/experiences', undefined, { cookie: me.cookie })).json(),
    ).toEqual([]);

    const edu = {
      school: 'MIT',
      description: 'CS',
      degree: 'BSc',
      fieldOfStudy: 'Computer science',
      startedOn: '2015-09-01',
      endedOn: '2018-06-30',
      isCurrent: false,
    };
    expect((await json(app, 'POST', '/me/educations', edu, { cookie: me.cookie })).status).toBe(
      201,
    );
    const profile = (await (await json(app, 'GET', `/profiles/${me.id}`)).json()) as ProfileDetail;
    expect(profile.educations).toHaveLength(1);
    expect(profile.educations[0]).toMatchObject(edu);
  });
});
