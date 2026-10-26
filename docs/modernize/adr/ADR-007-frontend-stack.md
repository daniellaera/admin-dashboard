# ADR-007 — Frontend stack: Vite 8 + React 19, TanStack Router & Query, react-hook-form + Zod, Mantine 9

Status: proposed (2026-10-26) · Brief: "React 19 + Vite + strict TypeScript. Pick routing, data fetching, forms, and UI library, and justify each choice. Keep visual and functional parity first, then improve."

## Context

The SPA is Create React App 5 (abandoned), Chakra UI v2 (the v3 rewrite breaks every component, 377 type errors when tried), react-query v3 (EOL), react-router 6, axios, moment+date-fns, CRA Jest that cannot run (AUDIT DEP-02, TST-02, PERF-05). The 14 screens and shell parts are small and fully specified (FEATURES §8, appendix/features-frontend.md).

## Decisions

| Concern | Choice | Justification | Runner-up |
|---|---|---|---|
| Build | **Vite 8** (`@vitejs/plugin-react`), ESM, route-level code splitting, `vite preview` for E2E | The de-facto React toolchain after CRA's sunset; Rolldown-based 8.x builds are fast; first-class Vitest integration | — |
| Routing | **TanStack Router 1.x** (file-based routes via `@tanstack/router-plugin`, generated `routeTree.gen.ts`) | Fully type-safe paths, params and **search params validated with Zod** (pagination `?page=`, filters), `beforeLoad` guards for `/admin/*` with typed redirects (`/signin?redirect=`), loaders that prefetch TanStack Query data, devtools; same mental model as React Router's data APIs but with types end-to-end | React Router 7 (library mode): fewer concepts, but untyped params/search and no loader↔Query integration without extra code |
| Server state | **TanStack Query 5** with key factories, `queryOptions()` shared between loaders and components, mutations with targeted invalidation; SSE hook invalidates keys (ADR-006) | Successor of the installed react-query v3; the app is already written in this pattern; fixes CQ-09 via hierarchical keys | — |
| API client | `hc<AppType>` from `hono/client` (ADR-002/008) wrapped in `api.ts` with `credentials: 'same-origin'`, problem+json error parsing | End-to-end types without codegen; no axios | OpenAPI + `openapi-fetch` |
| Forms | **react-hook-form 7** + `@hookform/resolvers/zod` with the **shared Zod schemas** | Already the app's form library; the same schema validates in the browser and on the server; `Controller` for Mantine inputs | TanStack Form (good, but RHF parity is cheaper and the team knows it) |
| UI kit | **Mantine 9** (`@mantine/core`, `hooks`, `notifications`, `modals`, `dates`, `dropzone`, `spotlight`) + `@tabler/icons-react` | Near 1:1 mapping of every Chakra v2 component in use → fastest, lowest-risk visual parity: `AppShell` (admin shell with drawer on mobile), `Table`, `Card`, `Badge`, `Avatar`, `Menu`, `Tabs`, `Switch`, `Modal`/`modals.openConfirmModal` (AlertDialog), `MultiSelect`/`TagsInput` (chakra-react-select), `Progress`/`RingProgress` (dashboard), `Spotlight` (user search modal), `Notifications` (toasts), `Dropzone` (avatar), `Pagination`, `Skeleton`, built-in dark mode with system preference (`ColorSchemeScript`), CSS variables theme with semantic colours (fixes CQ-13), React 19 peer, active releases. No Tailwind needed. | **shadcn/ui + Tailwind 4 + Radix**: more "owned" and arguably more modern aesthetics, but tables (TanStack Table), multi-select, ring progress, app shell and date inputs must be assembled; ~30 % more frontend effort for the same parity. Offered as STOP question Q1. |
| Dates | `dayjs` (peer of `@mantine/dates`) for formatting (`Do MMMM YYYY`, locale short dates, relative time plugin) | One library; moment-compatible format tokens make the parity trivial | date-fns (would mean two date libs with Mantine) |
| Icons | `@tabler/icons-react` (tree-shakable named imports) | Mantine's native set; replaces `react-icons` + `@chakra-ui/icons` | lucide-react |
| Animations | CSS transitions + Mantine `Transition` for fades/scale; no framer-motion | Parity of the few fades without 100 kB | framer-motion |
| State (client) | React context for auth (`me` query) + URL state; no global store | Nothing in the app needs more | Zustand |
| Testing | Vitest 5 + Testing Library + `happy-dom`; MSW for API mocks in component tests; Playwright for E2E (ADR-009) | — | — |
| Lint | shared ESLint flat config (ADR-001) + `eslint-plugin-react-hooks` (React 19 compiler rules) + `jsx-a11y` | fixes the a11y class of findings at lint time | — |
| Env | Vite `import.meta.env.VITE_*` only for build-time flags; **runtime config is served by the API** (`GET /config`: GitHub enabled, app name) | No secrets or URLs baked into the bundle (SEC-13); same image for every environment | — |

## Visual parity approach

1. Theme: Mantine `createTheme` with primary `blue` (Chakra `blue.500` ≈ Mantine `blue.6`), gray surfaces matching the current light/dark pairs, radius `md`, the semantic tokens the old code *meant* (`muted`, `primary`, `surface`).
2. Shell first (landing navbar/footer/promo/cookie banner, admin `AppShell` with sidebar + drawer), then screens in FEATURES §8 order, each compared against the appendix spec (texts, states, actions).
3. Improvements only after parity: server-side pagination, stable badge colours, accessible upload button, no random colours, truthful cookie/privacy text, system dark mode.

## Alternatives considered (whole-stack)

- **Next.js / TanStack Start (SSR)**: SEO is irrelevant for an admin dashboard with a tiny public feed; SSR doubles the deployment surface. Rejected.
- **Chakra UI v3**: closest name, but it is a different library (Ark-based, namespace components); migrating is a rewrite anyway with a smaller ecosystem than Mantine/shadcn.
- **Keeping CRA / react-scripts**: impossible (DEP-02, REC-06).

## Consequences

- Bundle target < 200 kB gzip for the initial route (today 615 kB): Mantine core ~70 kB gzip + React 19 ~45 kB + Router/Query ~30 kB; admin screens lazy-loaded.
- All copy, toasts and empty-state texts from the appendix are reused verbatim unless flagged in FEATURES.
