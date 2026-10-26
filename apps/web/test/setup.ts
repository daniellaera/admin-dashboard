import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

/**
 * No test talks to a real API: `fetch` answers 401 for the session probe (anonymous visitor) and
 * 404 for everything else. A test that needs data overrides `fetch` with `vi.spyOn(globalThis, 'fetch')`.
 */
const problem = (status: number, title: string) =>
  new Response(JSON.stringify({ type: 'about:blank', title, status }), {
    status,
    headers: { 'content-type': 'application/problem+json' },
  });
vi.stubGlobal('fetch', (input: RequestInfo | URL): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return Promise.resolve(
    url.includes('/auth/me') ? problem(401, 'Unauthorized') : problem(404, 'Not Found'),
  );
});

// Mantine relies on these browser APIs; happy-dom provides partial implementations.
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  }
  if (!('ResizeObserver' in window)) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(window, 'ResizeObserver', { writable: true, value: ResizeObserverStub });
  }
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }
}
