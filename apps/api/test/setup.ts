import { afterAll, beforeAll, beforeEach } from 'vitest';
import { closeTestDatabase, testDatabase, truncateAll } from './db.ts';

beforeAll(async () => {
  await testDatabase();
});

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closeTestDatabase();
});
