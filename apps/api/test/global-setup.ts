import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

/**
 * Starts one PostgreSQL 18 container for the whole integration run, or reuses the database
 * named by TEST_DATABASE_URL (CI service container, or a developer's own instance).
 */
export default async function globalSetup(
  project: TestProject,
): Promise<(() => Promise<void>) | undefined> {
  const external = process.env.TEST_DATABASE_URL;
  if (external) {
    project.provide('databaseUrl', external);
    return undefined;
  }
  const container = await new PostgreSqlContainer('postgres:18-alpine')
    .withDatabase('devconnector_test')
    .withUsername('test')
    .withPassword('test')
    .start();
  project.provide('databaseUrl', container.getConnectionUri());
  return async () => {
    await container.stop();
  };
}
