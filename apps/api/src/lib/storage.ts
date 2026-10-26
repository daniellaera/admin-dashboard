import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * File storage behind a small interface (ADR-005). The only implementation stores files on a
 * local volume; an S3 adapter could replace it without touching the services.
 */
export interface Storage {
  put(relativePath: string, data: Buffer): Promise<void>;
  get(relativePath: string): Promise<Buffer | null>;
  stat(relativePath: string): Promise<{ size: number; mtime: Date } | null>;
  delete(relativePath: string): Promise<void>;
  /** Removes a whole directory (e.g. every avatar of one user). */
  deleteDir(relativeDir: string): Promise<void>;
  list(relativeDir: string): Promise<string[]>;
  /** Readiness probe: the root exists and is writable. */
  ensureWritable(): Promise<boolean>;
}

export class InvalidStoragePathError extends Error {
  constructor(relativePath: string) {
    super(`Refusing storage path outside the root: ${relativePath}`);
    this.name = 'InvalidStoragePathError';
  }
}

export function createLocalStorage(rootDir: string): Storage {
  const root = path.resolve(rootDir);

  /** Resolves a relative path and refuses anything escaping the root (`..`, absolute paths). */
  function resolveSafe(relativePath: string): string {
    const normalised = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const absolute = path.resolve(root, normalised);
    if (absolute !== root && !absolute.startsWith(root + path.sep)) {
      throw new InvalidStoragePathError(relativePath);
    }
    if (path.isAbsolute(relativePath) || relativePath.includes('..')) {
      throw new InvalidStoragePathError(relativePath);
    }
    return absolute;
  }

  return {
    async put(relativePath, data) {
      const absolute = resolveSafe(relativePath);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, data);
    },
    async get(relativePath) {
      try {
        return await readFile(resolveSafe(relativePath));
      } catch (err) {
        if (isNotFound(err)) return null;
        throw err;
      }
    },
    async stat(relativePath) {
      try {
        const s = await stat(resolveSafe(relativePath));
        return s.isFile() ? { size: s.size, mtime: s.mtime } : null;
      } catch (err) {
        if (isNotFound(err)) return null;
        throw err;
      }
    },
    async delete(relativePath) {
      await rm(resolveSafe(relativePath), { force: true });
    },
    async deleteDir(relativeDir) {
      const absolute = resolveSafe(relativeDir);
      if (absolute === root) throw new InvalidStoragePathError(relativeDir);
      await rm(absolute, { recursive: true, force: true });
    },
    async list(relativeDir) {
      try {
        return await readdir(resolveSafe(relativeDir));
      } catch (err) {
        if (isNotFound(err)) return [];
        throw err;
      }
    },
    async ensureWritable() {
      try {
        await mkdir(root, { recursive: true });
        const probe = path.join(root, '.write-test');
        await writeFile(probe, 'ok');
        await rm(probe, { force: true });
        return true;
      } catch {
        return false;
      }
    },
  };
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    ((err as { code?: string }).code === 'ENOENT' || (err as { code?: string }).code === 'ENOTDIR')
  );
}
