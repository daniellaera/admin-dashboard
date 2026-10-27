# DevConnector — Frontend Functional Inventory (feature-parity contract)

Source of truth: PRIMARY snapshot `scratchpad/dirty-tree/frontend/src` (127 files, 6,529 lines). REFERENCE snapshot `scratchpad/head-main/frontend/src` differs only in 8 files (verified by a full `diff -w` sweep of every file); anything present only in PRIMARY is labelled **UNCOMMITTED LOCAL ADDITION**. All `file:line` references are into PRIMARY `frontend/src/` unless prefixed `backend/`.

Stack as declared: Create React App (`react-scripts 5.0.1`), React 18, Chakra UI, react-query v3 (`react-query ^3.39.3`), react-router-dom, react-hook-form, axios, `@supabase/supabase-js` v2, `socket.io-client` v4, `@novu/notification-center`, `chakra-react-select`, `framer-motion`, `moment`, `date-fns`, `react-icons`, `@chakra-ui/icons`.
Note on versions: REFERENCE `frontend/package.json` declares `@chakra-ui/react ^2.5.1`, `react-router-dom ^6.8.1`, `framer-motion ^6.5.1`, `@novu/notification-center ^0.12.0`, `chakra-react-select ^4.4.3`, `react-icons ^3.11.0`, `typescript ^4.9.5`. PRIMARY `frontend/package.json` (uncommitted, outside `src/`) bumps these to `@chakra-ui/react ^3.30.0`, `react-router-dom ^7.10.1`, `framer-motion ^12.23.25`, `@novu/notification-center ^2.0.0`, `chakra-react-select ^6.1.1`, `react-icons ^5.5.0`, `typescript ^5.9.3`, `date-fns ^4.1.0`, `@testing-library/react ^16.3.0`, `@testing-library/jest-dom ^6.9.1`, `@types/jest ^30.0.0`, `@types/node ^24.10.1`, `web-vitals ^5.1.0`, `axios ^1.13.2`, `@supabase/supabase-js ^2.86.2`, `socket.io-client ^4.8.1`. The `src/` code is written against the Chakra v2 / react-router v6 APIs (`ChakraProvider theme={theme}`, `useColorModeValue`, `extendTheme`-less default theme, `<Routes>/<Route index>`).

Environment variables consumed by `src/`: `REACT_APP_BACKEND_URL` (`utils/constants.ts:27`, every `api/*.ts`), `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY` (`config/supabase-client.ts:3-4`). `frontend/.env.development` sets only `REACT_APP_BACKEND_URL="http://localhost:8080"`.

---

## 1. Route table (`App.tsx`)

Provider nesting (`App.tsx:28-66`, `index.tsx:15-23`): `React.StrictMode` → `QueryClientProvider` (new `QueryClient()` with default options, `index.tsx:14`) → `ColorModeScript` → `ChakraProvider theme={theme}` (stock theme import, no `extendTheme` anywhere in `src/`) → `BrowserRouter` → `<CookieBanner />` (rendered on every route, outside AuthProvider, `App.tsx:30`) → `AuthProvider` → `Routes`. `AuthProvider` renders its children only when `!loading` (`providers/AuthProvider.tsx:64`), i.e. the whole route tree is blank until `supabase.auth.getSession()` resolves.

| # | Path | Page component (file) | Layout | Guard | Purpose | Evidence |
|---|---|---|---|---|---|---|
| 1 | `/` (index) | `Home` (`pages/Home.tsx`) | LandingLayout | public | Marketing landing page | `App.tsx:34` |
| 2 | `/login` | `Login` (component does not exist in `src/`) | LandingLayout | public | **DISABLED** — commented out | `App.tsx:35` |
| 3 | `/signup` | `Signup` (component does not exist in `src/`) | LandingLayout | public | **DISABLED** — commented out | `App.tsx:36` |
| 4 | `/signin` | `Signin` (`pages/auth/Signin.tsx`) | LandingLayout | public (no redirect when already logged in) | Sign in / register / magic link / GitHub OAuth | `App.tsx:37` |
| 5 | `/privacy` | `Privacy` (`pages/Privacy.tsx`) | LandingLayout | public | Static privacy policy | `App.tsx:38` |
| 6 | `/terms` | `Terms` (`pages/Terms.tsx`) | LandingLayout | public | Static terms of service | `App.tsx:39` |
| 7 | `/posts` | `Posts` as `LandingPosts` (`pages/post/Posts.tsx`) | LandingLayout | public | Public feed of all posts (like, comment count, realtime "New posts" chip) | `App.tsx:40` |
| 8 | `/developers` | `Developers` (`pages/developers/Developers.tsx`) | LandingLayout | public | Directory of all profiles | `App.tsx:41` |
| 9 | `/posts/:id` | `Post` as `LandingPost` (`pages/post/Post.tsx`) | LandingLayout | public (comment form only with session) | Post detail + comments | `App.tsx:42` |
| 10 | `*` | `NotFound` (`pages/NotFound.tsx`) | **none** (no Nav/Footer) | public | 404 page; also the target of footer "Licence" → `/license` and admin sidebar "404 Page" → `/404` | `App.tsx:44` |
| 11 | `/admin` (index) | `Dashboard` (`pages/admin/Dashboard.tsx`) | AdminLayout | `RequireAuth` | Mocked user-statistics dashboard | `App.tsx:45-53` |
| 12 | `/admin/profile` | `Profile` (`pages/admin/Profile.tsx`) | AdminLayout | `RequireAuth` | Edit profile, (fake) password, delete account, experiences, educations | `App.tsx:54` |
| 13 | `/admin/users` | `Users` (`pages/admin/Users.tsx`) | AdminLayout | `RequireAuth` | Mocked users table | `App.tsx:55` |
| 14 | `/admin/users/new` | `User` (`pages/admin/User.tsx`) | AdminLayout | `RequireAuth` | Mocked "add user" form | `App.tsx:56` |
| 15 | `/admin/users/:id` | `User` (`pages/admin/User.tsx`) | AdminLayout | `RequireAuth` | Mocked "update user" form | `App.tsx:57` |
| 16 | `/admin/posts` | `Posts` (`pages/admin/Posts.tsx`) | AdminLayout | `RequireAuth` | Table of the logged-in profile's own posts (edit/delete) | `App.tsx:58` |
| 17 | `/admin/posts/new` | `Post` (`pages/admin/Post.tsx`) | AdminLayout | `RequireAuth` | Create post | `App.tsx:59` |
| 18 | `/admin/posts/:id` | `Post` (`pages/admin/Post.tsx`) | AdminLayout | `RequireAuth` | Update post | `App.tsx:60` |
| 19 | `/admin/websocket` | `WebSocket` (`pages/admin/WebSocket.tsx`) | AdminLayout | `RequireAuth` | **DISABLED** — route commented out (`App.tsx:61`); sidebar link "Tasks" also commented out (`layouts/AdminLayout.tsx:25`) | `App.tsx:61` |

Totals: 16 active routes, 3 disabled. Nested admin routes use absolute paths (`/admin/profile`, …) inside the `/admin` parent.

`RequireAuth` (`components/auth/RequireAuth.tsx:12-15`): if `useAuth().user` is falsy → `<Navigate to="/signin" state={{ from: location }} replace />`; otherwise renders children. No role check anywhere.

---

## 2. Layouts & shell

### LandingLayout (`layouts/LandingLayout.tsx:8-17`)
Renders in order: `<PromoBanner />`, `<Nav />`, `<Limiter pt="65px"><Outlet /></Limiter>`, `<Footer />`. The 65px top padding compensates for the fixed Nav.

- **Limiter** (`components/shared/Limiter.tsx:5-13`): `Box w="100%" px={{ base: 4, md: 10, lg: 24, xl: 60 }}`.
- **PromoBanner** (`components/shared/PromoBanner.tsx`): `Collapse in={isOpen} unmountOnExit`, `useDisclosure({ defaultIsOpen: true })` (not persisted; reappears on every full reload). `Banner` with `bgGradient` `linear(to-r, primary.500, green.500)` (light) / `linear(to-r, primary.200, green.200)` (dark), `closable`, `color="surface"`; body text `"We just launched our new product."` (`:24`).
- **Nav** (`components/shared/Nav.tsx`): `c.Box w="100%" pos="fixed" top=0 left=0 borderBottom="1px solid" borderColor gray.100/gray.700 zIndex=500` (`:49-57`), inner `Limiter display=flex py base 4 / md 3, bg white/gray.800, justify space-between` (`:58-66`).
  - Left (hidden below `md`): `Link "/"` text `DevConnector 🚀`, `Link "/posts"` "Posts", `Link "/developers"` "Developers" (`:67-73`).
  - When **no session** (hidden below `md`, wrapped in `c.Fade in`): `LinkButton to="/signin" variant="ghost"` "Login"; `LinkButton to="/signin" variant="solid" colorScheme="blue"` "Register"; `<DarkModeSwitch />` (`:74-86`). Both Login and Register go to the same `/signin` page.
  - Right `HStack` (`display={{ base: "flex", md: session ? "flex" : "none" }}`, `:87`): so on desktop logged-out the avatar/hamburger menu is hidden; on mobile it is the only navigation.
    - If session: Novu bell block (`:89-108`, see §8).
    - `Menu placement="bottom-end" closeOnSelect closeOnBlur` (`:109`). `MenuButton` content: with session → `ProfileAvatar avatarSize="sm" url={profile?.avatarUrl} avatarName={truncate(session.user.email)}` + (md+) `VStack` with `Text fontSize="sm"` `{profile?.username}` and hard-coded `Text fontSize="xs" color="gray.600"` **"Admin"** (`:122-125`) + `FiChevronDown` (md+); without session → `GiHamburgerMenu` icon (`:132`).
    - `MenuList` with session (`:137-164`): `Link /admin/profile` → MenuItem icon `BiUser` "Profile"; `Link /admin` → icon `BiCog` "Admin"; `MenuDivider`; `Link /` → "Home" (**UNCOMMITTED LOCAL ADDITION**, `:146`); `Link /posts` → "Posts"; `Link /developers` → "Developers"; `MenuDivider`; MenuItem `closeOnSelect={false}` icon `BiSun`/`BiMoon` "Toggle theme" → `toggleColorMode`; MenuItem icon `BiExit` "Logout" → `handleSignOut`.
    - `MenuList` without session (`:166-183`): "Toggle theme"; `MenuDivider`; `Link /posts` "Posts"; `Link /developers` "Developers"; `Link /signin` "Login"; `Link /signin` MenuItem `fontWeight="semibold"` "Register".
  - `handleSignOut` (`:33-46`): `useSignOut().mutate(undefined, { onSuccess: () => { /* navigate("/login") commented out */ }, onError: toast error "Something went wrong! If the problem persists, contact us!" })`. No navigation after logout from Nav.
- **Footer** (`components/shared/Footer.tsx`): `Box as="footer" pt="10" style={{ marginTop: '10vh' }}`, `Divider`, `Container maxWidth="5xl"`, left text `"Admin dashboard built with React & ChakraUI"` (`:44-46`), two link columns (`:13-30`):
  - "Resources": "Live preview" → `/admin` (internal RouterLink); "Documentation" → `/`; "Github" → `https://github.com/` (external, `isExternal`, `ExternalLinkIcon`).
  - "Legal": "Terms" → `/terms`; "Privacy" → `/privacy`; "Licence" → `/license` (no route exists → NotFound).
  - `Divider`, then centered `"© 2023 DevConnector. All rights reserved."` (`:74-76`).

### AdminLayout (`layouts/AdminLayout.tsx`)
`AppShell` → `AppShellSidebar` + `AppShellContent`.
- Sidebar header (`:33-45`): `Button as={NavLink} to="/" variant="ghost" leftIcon={<ArrowBackIcon />}` "Home Page".
- Sidebar body (`:46-54`): `NavItem` list from `links` (`:20-27`): `/admin` "Dashboard" `FiGrid`; `/admin/users` "Users" `FiUsers`; `/admin/profile` "Profile" `FiUser`; `/admin/posts` "Posts" `FiMessageCircle`; *(commented: `/admin/websocket` "Tasks" `FiClipboard`)*; `/404` "404 Page" `FiSettings`.
- Sidebar footer (`:55-68`): `<ProfileMenu />` (a second "Home Page" button block is commented out `:56-66`).
- Content header (`:71-76`): `Stack direction="row" spacing={2} mr="-2"` with `<UserSearch />` and `<DarkModeSwitch />`.
- Content body: `<Outlet />`.

**AppShell** (`components/shared/AppShell.tsx`): `sidebarWidth = 280` (`:31`); `isMobile = useBreakpointValue({ base: true, md: false })` (`:175`); context via `createCtx` (`utils/contextUtils.ts`). Desktop: sidebar is `Flex direction="column" position="fixed" top=0 left=0 height="100vh" width=280 overflowY="auto" shadow sm/dark-sm` (`:155-166`); content `Box bg gray.100/gray.900 minHeight="100vh" ml={isMobile ? 0 : 280}` (`:43`). Mobile: sidebar becomes `Drawer placement="left"` with `DrawerOverlay/DrawerContent/DrawerCloseButton` (`:147-153`); the content header shows `IconButton aria-label="Open menu" icon={<HamburgerIcon />} variant="ghost"` that opens the drawer (`:70-77`). Content header is a `Navbar bg gray.100/gray.900` with `Spacer` then children (`:69-81`). Content body `Container maxW="7xl" px={{ base: "4", sm: "8" }} py="8"` (`:55`).

**Navbar** (`components/shared/Navbar.tsx`): `useMultiStyleConfig("Navbar", {})` (no such component style exists in the stock theme → `styles.navbar` undefined, `:17`); applies `shadow` sm/dark-sm once `scrollY > own height` using framer-motion `useScroll` (`:24-33`); `Container maxW="7xl" px base 4 / sm 8`, `Flex align="center" py="4"`.

**NavItem** (`components/shared/NavItem.tsx:16-45`): `NavLink to={href}` wrapping `Flex align="center" p="4" mx="4" borderRadius="lg" role="group" cursor="pointer" _hover={{ bg: gray.100/gray.900 }}`; optional `Icon mr="4" fontSize="16"`. No active-route styling.

**ProfileMenu** (`components/auth/ProfileMenu.tsx`): `Box px={4} mb='8' border='1px solid gray' borderRadius='2xl'`; `Menu placement="bottom-end"`; `MenuButton as={IconButton} rounded="full" variant="link"` containing `ProfileAvatar mr="3" avatarSize="sm" url={profile?.avatarUrl} avatarName={truncate(user.email)}` (`:54`); `MenuList` → single `MenuItem` "Sign out" (`:57`) → `useSignOut().mutate` → `onSuccess: navigate("/signin")` (`:30`), `onError` generic toast. Beside the avatar: `Text fontSize="sm" fontWeight="medium"` `profile.username` or `''`; `Text color="muted" fontSize="xs"` `profile.authorEmail` (`:60-67`).

**InnerLayout** (`layouts/InnerLayout.tsx`) — **never imported** (dead). Would render `Navbar` with `Button as={Link} to="/" colorScheme="blue" size="sm" variant="ghost" leftIcon={<ArrowBackIcon />}` "Back to home", `Spacer`, `DarkModeSwitch`; `Outlet`; `Footer`.

**Brand** (`components/shared/Brand.tsx`) — **never imported** (dead). `Circle bg="primary" size="10"` with a 2-path inline SVG logo.
**Logo** (`components/shared/Logo.tsx`): `chakra.svg color='lightblue' height="10" width="auto" viewBox="0 0 89 89"` single-path mark; used only in Signin (`pages/auth/Signin.tsx:165`).

**Banner** family (`components/shared/Banner.tsx`): `Banner` = `Box bg white/gray.700 boxShadow="lg" position="relative" px="4" py="3" w="100%"`, optional `CloseButton position="absolute" right="2" top="2"` when `closable`; inner `Stack direction base column / sm row, align center, justify space-between`. `BannerActions` = `Stack direction base column / md row spacing 2`. `BannerAvatar` = `Square size="12" bg gray.200/whiteAlpha.200 borderRadius="md"`. `BannerBody` = `Stack spacing 4, direction base column / md row, fontSize sm`.

**CookieBanner** (`components/shared/CookieBanner.tsx`; mounted globally `App.tsx:30`): `CONSENT_STORAGE_KEY = "cookies-consent"` (`:14`); `defaultIsOpen: localStorage.getItem("cookies-consent") !== "true"` (`:17-19`); `ScaleFade in unmountOnExit`; `Box position="fixed" bottom="2" right="2" maxWidth="2xl" zIndex="modal"`; `Banner borderRadius="lg"`; `BannerAvatar` with `InfoOutlineIcon boxSize="6"`; text `"We use third-party cookies to deliver our services, to personalize ads, and to analyze traffic. "` + `Link as={RouterLink} fontWeight="bold" to="/privacy"` `"Read our Cookie Policy."` (`:34-40`); `Button colorScheme="blue"` `"I agree"` → `localStorage.setItem("cookies-consent", "true")` and close (`:21-24, 43-45`).

**Color-mode toggles**: `DarkModeSwitch` (`components/shared/DarkModeSwitch.tsx:10-20`): `IconButton variant="ghost" aria-label="Dark mode"`, icon `MoonIcon` when light / `SunIcon` when dark, `color="muted"`, `onClick={toggleColorMode}`. Mounted in: Nav logged-out desktop row (`Nav.tsx:83`), AdminLayout content header (`AdminLayout.tsx:74`), InnerLayout (dead). The Nav menu also has "Toggle theme" items for both auth states. `ColorModeSwitcher` (`components/shared/ColorModeSwitcher.tsx`, `FaMoon`/`FaSun`, aria-label ``Switch to ${dark|light} mode``) is **never imported**.

**Novu bell mount point**: only in landing `Nav`, only when `session` is truthy (`Nav.tsx:89-108`); never in AdminLayout. Props: `NovuProvider subscriberId={`${profile?.id}`} applicationIdentifier='vTbMIBFNZdXt'`; `PopoverNotificationCenter showUserPreferences={false} footer={() => <></>} onNotificationClick={onNotificationClick} colorScheme={colorMode} allowedNotificationActions={true}`; render-prop child `({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />`. `onNotificationClick = (notification) => navigate(`/posts/${notification.payload.postId}`)` (`:30-31`).

---

## 3. Per-screen specification

Shared building blocks referenced below:
- `Page` (`components/shared/Page.tsx`): `motion.div` with `animation` `"fade"` (default; opacity 0→1) or `"slideFade"` (y −16→0 + opacity).
- `Loading` (`components/shared/Loading.tsx`): `Center` + `Spinner`.
- `Empty` (`components/shared/Empty.tsx`): `Stack align center py="12"` with `WarningIcon boxSize="32px"` + message.
- `Result` (`components/shared/Result.tsx`): Chakra `Alert bg="transparent" variant="subtle" flexDirection="column" py="12"` with `AlertIcon boxSize="40px"`, `AlertTitle` (title), `AlertDescription maxWidth="sm"`.
- `Toolbar`/`ToolbarTitle`/`ToolbarActions` (`components/shared/Toolbar.tsx`): `Stack direction base column / sm row justify space-between`; title = `Heading as="h2" size="lg"`.
- `Pagination` (`components/shared/Pagination.tsx`): props `pageIndex`, `pageSize`, `total`, `onPageChange`; shows `Text` `` `${pageIndex*pageSize+1}–${min(pageIndex*pageSize+pageSize, total)} of ${total}` `` (`:43`), buttons `variant="outline"` "Previous" (`isDisabled pageIndex <= 0`) and "Next" (`isDisabled pageIndex*pageSize+pageSize >= total`) (`:45-58`). All pagination in the app is **client-side slicing** of the full fetched array with `pageSize = 5`.
- `Section` family (`components/shared/Section.tsx`): `Section` = `Box as="section" py base 16 / md 24` + `Container maxW` by variant (`default` → `5xl`, `full` → `full`, `prose` → `2xl`, `:13-17`) + `Stack spacing="20"`; `SectionTag` = `Text color="primary" fontSize="md" fontWeight="semibold"`; `SectionTitle` = `Heading as="h2" size="2xl" fontWeight="extrabold"`; `SectionDescription` = `Text color="muted" fontSize="xl" maxW="2xl"`; `SectionHeader` = centered `Stack spacing 6`; `SectionHeadings` = centered `Stack spacing 3`.
- `Form` family (`components/shared/Form.tsx`): `Form` = `chakra.form` + `Stack direction="column" divider={<Divider />} spacing="6"`; `FormHeader` = `Stack base column / sm row justify space-between spacing 6`; `FormFooter` = `Stack base column / sm row-reverse spacing 6`; `FormLine` = `FormControl` + `Stack base column / sm row justify space-between spacing base 0 / sm 8`; `FormLineLabel` = `FormLabel flexShrink=0`; `FormLineField` = `Box flexGrow=1 maxW="3xl"`.
- Generic error toast text used everywhere: `"Something went wrong! If the problem persists, contact us!"`.
- `truncate(str)` (`utils/functions.ts:1-3`): `str.length > 1 ? str.substring(0, 10) + '...' : str`. `getRandomColor()` (`:5-12`): random pick from `['red','green','blue','orange','yellow','purple','pink','cyan']` on every render.

### 3.1 Home — `/` (`pages/Home.tsx`)
- Purpose: marketing landing. No data loading.
- Layout: `Page` (fade) → `Section` (default 5xl) → centered `Box`.
- `Heading letterSpacing="tighter" maxWidth="2xl" mx="auto" fontWeight="extrabold" size="4xl"` containing gradient `Text bgGradient='linear(to-l, #2193b0, #6dd5ed)' bgClip='text' fontWeight='extrabold'` **"Dev Connector"** followed by **" dashboard"** (`:47-62`).
- Subtitle `Text color="muted" fontSize="xl" maxWidth="xl" mt="6"`: **"Connecting with Developers has never been so easy!"** (`:63-65`).
- Buttons (`Stack direction base column / sm row justify center mt 10 spacing 4`, `:66-78`): `Button as={Link} size="lg" to="/developers"` **"Developers"**; `Button as={Link} colorScheme="blue" size="lg" to="/admin"` **"Dashboard"** (when logged out, `RequireAuth` bounces to `/signin` with `from=/admin`).
- `SectionHeadings`: `SectionTag` **"Technologies"**, `SectionTitle` **"Built with"** (`:80-83`).
- `SimpleGrid columns base 1 / md 3 gap base 5 / md 8` of 18 feature rows, each `CheckIcon color="green.400" mr="3"` + `Text color="muted"` (`:21-40`, `:85-93`): "React", "Supabase", "Realtime with SocketIO", "Notification Provider with Novu", "Containerized with Docker", "Styled with ChakraUI", "Written in TypeScript", "Create React App (CRA) as toolchain", "Data fetching with React Query", "Form handled by React Hook Form", "Code hosted on Github", "CI/CD with Github actions", "Deployed on Fly.io", "100% Responsive", "Dark/Light mode support", "Theming", "Best Practice", "Clean code".

### 3.2 Signin — `/signin` (`pages/auth/Signin.tsx`)
- Purpose: single page for sign-in, registration, magic link and OAuth. Reachable while logged in (no redirect).
- `Container maxW="lg" py base 12 / md 24 px base 0 / sm 8`; `<Logo />`; `Heading fontSize='4xl'`: `authButtonState === true` → **"Sign in to your account"**, `false` → **"Register a new account"** (`:167`). Below: `Text color="muted"` **"Don't have an account?"** + `Button variant="link" colorScheme="blue"` **"Sign up"** (toggles state) / when registering **"Already a User?"** + **"Log in"** (`:168-173`). Default `authButtonState = true` (`:46`).
- Form card: `Box py base 0 / sm 8, px base 4 / sm 10, bg gray.100/gray.700, boxShadow base none / sm md|md-dark, borderRadius base none / sm xl` (`:176-181`).
- `Tabs align='center' isLazy` with `TabList mb='1em'`: **"Username/Password"**, **"Magic Link"** (`:183-187`).
- **Tab 1 form** (`:190-251`), `useForm` with **`defaultValues: { email: "janedane@gmail.com", password: "123456" }`** (`:61-66`; credentials are pre-filled in the UI), default validation mode (onSubmit).
  - `email`: `Input id="email" placeholder="Email"`, rule `required: "This is required"`; no e-mail pattern (`:195-201`).
  - `password`: `InputGroup` with `InputRightElement` `IconButton variant="link"` aria-label `'Reveal password'`/`'Mask password'`, icon `HiEye`/`HiEyeOff`, toggles `type` `'password'`/`'text'` via `useDisclosure` (`:209-224`); rule `required: "This is required"`.
  - Submit `Button type="submit" variant='solid' spinnerPlacement='start' colorScheme="blue" isDisabled={!isValid}`, `isLoading` from `signUp`/`signIn`; label **"Register"** when registering, **"Sign in"** otherwise (`:232-240`).
  - Divider row `"or continue with"` (`:241-247`) then `<OAuthButtonGroup childToParent={handleCallBack} />`: `ButtonGroup variant="outline" spacing="4" width="full"`, three `Button width="full"` with `VisuallyHidden` `"Sign in with GitHub|Google|Twitter"` and icons `GitHubIcon`, `GoogleIcon`, `TwitterIcon` (`components/shared/OAuthButtonGroup.tsx:4-8,21-27`). `handleCallBack` (`:141-158`): `'GitHub'` → `signInWithGithub()`; `'Google'` → `console.log('Login with google...')` (no-op); `'Twitter'` → `console.log('Login with twitter...')` (no-op).
  - `onSubmit = handleSubmit(!authButtonState ? handleSignUp : handleSignIn)` (`:190`).
  - `handleSignIn` (`:94-110`): `signIn.mutate({email,password})` → **onSuccess**: `socket.emit("new-user-add", values.email)`; `socket.on("get-users", users => console.log('users online', users))` (**UNCOMMITTED LOCAL ADDITION**, `:97-100`; the backend has no handler for either event); `navigate(from, { replace: true })`. **onError**: toast `description: `${err}`` status error (e.g. "AuthApiError: Invalid login credentials").
  - `handleSignUp` (`:112-124`): `signUp.mutate` → onSuccess `navigate(from, { replace: true })` (no toast); onError toast `${err}`.
  - `signInWithGithub` (`:126-139`): calls `signInWithOAuth()` **without await** inside try/catch; catch would toast `title: 'Error', position: 'top', description: error.error_description || error.message, status 'error', duration 5000, isClosable` (unreachable for async rejections).
- **Tab 2 form** (`:253-280`), separate `useForm({ mode: "onBlur" })` (`:68-70`): `email` `Input id="email" placeholder="Email"` rule `required: "This is required"`; `Button type='submit' colorScheme="blue" spinnerPlacement="start" isDisabled={!isValid2} isLoading={signWithMagicLink.isLoading} loadingText="Sending magic link ..."` label **"Send magic link"**.
  - `handleSignInWithMagicLink` (`:72-92`): onSuccess toast `{ title: 'Account confirmed.', position: 'top', description: 'Check your email for the login link', status: 'success', duration: 5000, isClosable: true }` then `navigate(from, { replace: true })`; onError toast `${err}` error.
- Redirect target: `from = location.state?.from?.pathname || "/"` (`:55`).

### 3.3 Posts feed — `/posts` (`pages/post/Posts.tsx`)
- Data: `usePosts()` → `fetchPosts()` → **GET `${BACKEND}/api/v1/posts`** (key `"posts"`); response `Post[]` including `profile`, `comments`, `likes`, `tags`. Also `refetch` used by the chip.
- `pageSize = 5` (`:20`), client-side slice (`:33-35`).
- State order (`:46-62`): `data?.length === 0` → `Empty "Posts will show up here!"` (checked before loading); `isLoading` → `Loading`; `isError` → `Result title="Oops!" description="Something went wrong! If the problem persists, contact us!" status="error"`.
- **Realtime** (`:37-44`): `useEffect` registers `socket.on("postBroadcasted", (p) => { if (p.post.published) toggleChip() })`; dependency `[toggleChip]` (re-registers on each toggle; no `socket.off` cleanup). `chipVisible` state; when true renders `ScaleFade initialScale={0.9}` → centered `HStack onClick={reloadPosts}` with `Tag cursor='pointer' size='lg' borderRadius='full' variant='solid' colorScheme='blue'` `TagLabel` **"New posts"** + `ArrowDownIcon` (`:75-90`). `reloadPosts` = `refetch()` + `toggleChip()` (`:68-71`).
- Each post (`:91-130`), `Wrap spacing="30px" marginTop="10"` → `WrapItem` → `Box w="100%"`:
  - `Link to={`/posts/${id}`}` wrapping: `Heading fontSize="xl" marginTop="2"` → `Text` `{title}` + `Badge ml='2' colorScheme={getRandomColor()}` `{type}` (`:97-104`); `Text as="p" fontSize="md" marginTop="2"` `{content}`; `BlogAuthor avatarUrl={profile.avatarUrl} userEmail={profile.authorEmail} name={profile?.username || profile?.authorEmail} date={moment(createdAt).format('Do MMMM YYYY')}` (`:109-113`); `BlogTags tags={tags} marginTop="4"` (`:114`).
  - Action row `Stack direction row mt='4'` (`:116-125`): `<div><span className="button__badge">{likes?.length ?? 0}</span><LikeButton postId={id} /></div>` and `<div><span className="button__badge">{comments?.length ?? 0}</span><IconButton variant='ghost' aria-label="'Chat Button" icon={<HiOutlineChat />} onClick={() => navigate(`/posts/${id}`)} /></div>`.
  - `Divider marginTop="5"`.
- `Pagination` in `Stack mt={4}` (`:131-138`).
- `Posts.css` (`pages/post/Posts.css`): `.button__badge { position: relative; left: 10px; border-radius: 3px; padding: 1px 3px; font: 10px Verdana; z-index: 1; }`.
- **BlogAuthor** (`components/shared/Blog.tsx:13-20`): `HStack marginTop="4" spacing="2"` → `ProfileAvatar mr="3" avatarSize="sm" url={avatarUrl} avatarName={truncate(userEmail)}` + `Text fontSize='small'` `` `${name || userEmail} - ${date}` ``. Prop `avatarUrl?: string` (**UNCOMMITTED**: was `string | undefined`).
- **BlogTags** (`Blog.tsx:27-39`): `HStack spacing={2}`; each tag → `Tag size='sm' variant='subtle' colorScheme={getRandomColor()}` `{tag.label}`.
- **LikeButton** (`components/shared/LikeButton.tsx`): `Tooltip placement="bottom" hasArrow bg='blue.600' label={session ? "Smash the like button!" : "you must be logged in to like the post"}` (`:59`, constants `LIKE_BUTTON_TEXT`/`LIKE_BUTTON_TEXT_DISABLED`); `IconButton isDisabled={!session} variant='ghost' aria-label="'Like Button" icon={<HiOutlineThumbUp />}` (`:60-65`). Click → `handleSubmit` of a hidden react-hook-form with `postId` and `profileId` (from `useProfile(session.user.email)`) → `useAddLike().mutate` → **POST `/api/v1/likes/create`** body `{ postId, profileId }`. onSuccess toast `"post liked"` success + invalidate `"posts"` (`hooks/like/useAddLike.ts:9`); onError toast `{ position: 'top', status: 'warning', description: `${error.message.response.data.error}` }` (`:44-50`) — `likeApi.addLike` rethrows `new AxiosError(error)` (`api/likeApi.ts:11`), so `error.message` is the original AxiosError and `.response.data.error` is the backend text (`'You cannot like a post twice'`, `'You already liked this post'`, `'Unauthorized'` — `backend/src/api/like.ts:26,36,47`). No unlike.

### 3.4 Post detail — `/posts/:id` (`pages/post/Post.tsx`)
- Data: `usePost(Number(id))` → **GET `/api/v1/posts/post/:id`** (key `["posts", id]`, enabled when id truthy); `useCommentsByPostId(data?.id)` → **GET `/api/v1/comments/commentsByPostId/:postId`** (key `["comments", postId]`, enabled when post loaded). Backend returns comments ordered `createdAt desc` with `profile` included (`backend/src/api/comments.ts:26-34`).
- `isLoading` → `Loading`; `isError` → bare `<span>Something went wrong! If the problem persists, contact us!</span>` (`:24-32`).
- `Toolbar`: `ToolbarTitle` `` `Post ${id}` `` (fallback "Add post" unreachable) ; `Button as={Link} to="/posts" variant="outline" leftIcon={<ArrowBackIcon />}` **"Back"** (`:36-50`).
- `Wrap spacing="30px" marginTop="5"`: `Heading fontSize="xl"` title; `Text as="p" fontSize="md"` content; `BlogAuthor avatarUrl={data.profile.avatarUrl} userEmail={data.profile.authorEmail} name={data.profile.username} date={moment(data.createdAt).format('Do MMMM YYYY')}` (`:51-63`). `Divider marginTop='5'`.
- Conditional: `session ? <CommentForm post={data} /> : <Empty message="You need to login to comment the post" />` (`:65`).
- Comment list (`:66-77`): each `Flex` → `Center py={2}` → `Box maxW='800px' w='full' rounded='md' p={6}` with `Text as="p" fontSize="md"` `{text}` and `BlogAuthor avatarUrl={profile?.avatarUrl} userEmail={profile?.authorEmail} name={profile?.authorEmail} date={moment(createdAt).format('Do MMMM YYYY')}` (comment author shown by e-mail, not username).
- No like button, no edit/delete on this page; no view-count display (`viewCount` exists in type but is never rendered).
- **CommentForm** (`components/comments/CommentForm.tsx`): `Flex as='form' py={6}` → `Stack w={600} rounded='xl' spacing={2} align='center'` → `Stack spacing={4} direction base column / md row w='full'`: `Input id="text" placeholder="write your comment here"` rule `required: "This is required"`, `color gray.800/gray.200`, `bg gray.100/gray.600`, `rounded='full' border={0}`, `_focus bg gray.200/gray.800` (`:74-88`); `FormErrorMessage` (not inside a `FormControl`, so it never renders); `Button type="submit" isDisabled={!isValid} colorScheme="blue" bg='blue.400' rounded='full' color='white' flex='1 0 auto' _hover/_focus bg blue.500 isLoading={addComment.isLoading}` **"Add"** (`:92-99`). Hidden values via `setValue`: `postId = post.id`, `profileId = profile.id` (`:36-39`). Submit → `useAddComment().mutate(comment)` → **POST `/api/v1/comments/create`** body `{ text, profileId, postId }`; onSuccess: `reset()`, toast `` `${comment.text} has been added` `` success, invalidate `"comments"`, `socket.emit("addComment", { post, profile, comment })` (`:41-50`); onError generic toast.

### 3.5 Developers — `/developers` (`pages/developers/Developers.tsx`)
- Data: `useProfiles()` → **GET `/api/v1/profile`** (key `"profiles"`) → all profiles (no `isPublic` filtering client-side; `isPublic` is never read anywhere in `src/`).
- State order (`:32-48`): `data?.length === 0` → `Empty "Developers will show up here!"`; `isLoading` → `Loading`; `isError` → `Result "Oops!"`.
- `Container maxW='7xl' py={16} as={Stack} spacing={12}` → `SimpleGrid spacing={8} templateColumns='repeat(auto-fill, minmax(300px, 1fr))'` (**UNCOMMITTED**: spacing was `4`).
- Per profile `Card` (`:56-106`), destructures `username, company, authorEmail, website, bio, programmingLanguages, avatarUrl` (`company`, `website` unused in PRIMARY):
  - `CardHeader` → `Flex`: `ProfileAvatar url={avatarUrl} avatarName={truncate(authorEmail)}` (default size) ; `Box ml='3'`: `Text fontWeight='bold'` `{username}` + `Badge variant='outline' ml='1' fontSize='0.8em' colorScheme='green'` **"Developer"**; `Text fontSize='sm'` `{authorEmail}` (**UNCOMMITTED LOCAL ADDITION** — REFERENCE rendered `Flex flex="1" gap="4"` with `Heading size="sm"` `` `${username} - ${authorEmail}` `` and `Text` `` `${company} - ${website}` `` plus an `IconButton variant="ghost" aria-label="See menu" icon={<BsThreeDotsVertical />}`; in PRIMARY that IconButton is a comment, `:72`).
  - `CardBody`: `Text` `{bio ? bio : ''}` (**UNCOMMITTED**: fallback was `' Biography'`); `programmingLanguages?.map` → `Tag margin={2}` `{value.label}` (`:75-82`).
  - `CardFooter justify="space-between" flexWrap="wrap" sx={{ '& > button': { minW: '136px' } }}`: `Button w='xl' mt={8} bg={gray.400|gray.900} color='white' rounded='md' _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }} leftIcon={<FiUserPlus />}` **"Connect"** — **no onClick handler** (**UNCOMMITTED**: REFERENCE label "Follow", no icon) (`:93-104`).

### 3.6 Privacy — `/privacy` (`pages/Privacy.tsx`) and Terms — `/terms` (`pages/Terms.tsx`)
Static; see §12.

### 3.7 NotFound — `*` (`pages/NotFound.tsx`)
`Page` → `Container maxW="lg" py="16"` → `Stack align="center" spacing="6"`: `<NotFoundImage />` (theme-aware SVG illustration, `components/illustrations/NotFoundImage.tsx` using `Illustration` CSS classes `fill-surface/fill-primary/fill-gray-1..3` mapped via `useColorModeValue`, `Illustration.tsx:9-13`); `Text fontSize="2xl" fontWeight="extrabold"` **"Oops"**; `Text color="muted"` **"Sorry, we couldn’t find the page you’re looking for."**; `Button as={Link} to="/"` **"Back to home"** (`:13-21`). Rendered without any layout (no Nav/Footer).

### 3.8 Admin Dashboard — `/admin` (`pages/admin/Dashboard.tsx`)
- Data: `useUserStats()` → `fetchUserStats()` (**MOCK**, 1 s delay, computed from the in-memory 11-user array; see §10) key `"userStats"`.
- States: `isLoading` → `Loading`; `isError` → `<span>Something went wrong! …</span>`; `!data` → `<span>Empty</span>` (`:89-101`).
- `Page slideFade`. Row 1 `SimpleGrid columns base 1 / lg 3 gap 6`: three `Card` → `Stat` with `StatLabel color="muted"` / `StatNumber`: **"Total Users"** = `count`, **"Active Users"** = `countByStatus.active`, **"Disabled Users"** = `countByStatus.disabled` (`:46-52, 105-116`).
- Row 2 `SimpleGrid columns base 1 / xl 2 gap 6 mt 6`:
  - `Card` header **"User Roles"**: rows **Member**, **Guest**, **Admin** each `Flex justify space-between` with `Text color="muted"` label and `Text` `` `${value}/${count}` ``, then `Progress colorScheme='blue' mt={2} value={percentage}` where percentage = value/count*100 (`:54-72, 118-140`).
  - `Card` header **"User Status"**: `CircularProgress color='blue.200' size="160px" trackColor={gray.100|whiteAlpha.300} value={active%}` with `CircularProgressLabel` `` `${pct.toFixed(1)}%` ``; legend `Circle size 16px` **Active** (blue.200) / **Disabled** (track color) (`:74-83, 141-173`).
- Row 3 `SimpleGrid columns base 1 / xl 2 gap 6 mt 6`: `Card` **"Recently Added"** and `Card` **"Recently Updated"**, each a `List` of `ListItem` → `ListItemAvatar name="First Last"` (first list `colorScheme='blue'`), `ListItemText` with `Text` full name + `Text color="muted" fontSize="xs"` email, `ListItemExtra` `Text fontSize="small"` `formatDistanceToNow(user.createdAt)` / `formatDistanceToNow(user.lastModifiedAt)` (date-fns) (`:175-229`).

### 3.9 Admin Users — `/admin/users` (`pages/admin/Users.tsx`)
- Data: `useUsers()` → `fetchUsers()` (**MOCK**, 1 s, 11 users) key `"users"`; `pageSize = 5` (`:33`), client-side slice.
- `isLoading` → `Loading`; `isError` → `Result "Oops!"`.
- `Toolbar`: title **"Users"**; `Button as={Link} colorScheme='blue' to="/admin/users/new"` **"Add User"** (`:97-104`).
- `Card mt="8"` header `Text` **"Users table"**; body `UserTable` (`components/user/UserTable.tsx`): columns **Name** (`` `${firstName} ${lastName}` ``), **Status** (`Badge` "Disabled" / `Badge colorScheme="green"` "Active"), **Role**, **Actions** (`isNumeric`): `IconButton as={Link} icon={<EditIcon />} to={`/admin/users/${id}`} aria-label="Edit First Last"`, `IconButton icon={<DeleteIcon />} aria-label="Delete First Last" onClick={() => onDelete(item)}`; row key = `item.email`; empty → `Empty "Users will show up here!"` (`UserTable.tsx:25-27, 34-66`). `CardFooter` → `Pagination total={data.length}`.
- Delete flow: `AlertDialog` header **"Delete User"**, body **"Are you sure? You can't undo this action afterwards."**, buttons **"Cancel"** (`leastDestructiveRef`) and `Button colorScheme="red" isLoading={removeUser.isLoading}` **"Delete"** (`:124-154`) → `useRemoveUser().mutate(user)` (**MOCK**, 2 s, returns id, does not remove) → onSuccess close + toast `` `${firstName} ${lastName} has been removed` `` success + invalidate `"users"`; onError generic toast (`:76-93`).

### 3.10 Admin User — `/admin/users/new` and `/admin/users/:id` (`pages/admin/User.tsx`)
- Data: `useUser(id)` → `fetchUserById(id)` (**MOCK**, 1 s) key `["users", id]`, enabled only when `id`.
- `isUpdate = !!id`; `isLoading` → `Loading`; `isError` → `<span>Something went wrong! …</span>`.
- `Toolbar`: title `` `Update user ${id}` `` or **"Add user"**; `Button as={Link} to="/admin/users" variant="outline" leftIcon={<ArrowBackIcon />}` **"Back"** (`:42-56`).
- `Grid templateColumns base 1 / xl 3 gap 6 mt 8`: `GridItem colSpan xl 2` → `Card` header **"User form"** → `UserForm initialValues={data}`; `GridItem` → `Card` header **"Help"** → `Stack spacing 3`: `ChakraLink isExternal` (no `href`) **"Read documentation"** + `ExternalLinkIcon ml="1"`, `ChakraLink` (no `href`) **"Chakra UI documentation"** (`:57-88`).
- **UserForm** (`components/user/UserForm.tsx`): `Box as="form"`; `reset(initialValues)` on change (`:46-48`). Fields: `firstName` `Input placeholder="First name"` `required: "This is required"`; `lastName` `Input placeholder="Last name"` required (both in `Stack direction base column / sm row`); `role` `Select placeholder="Select Role"` options **Admin**, **Member** (`required`; mock data also contains role "Guest", which has no option); `disabled` `Checkbox` **"Tick the box to disable the user"** (no rule). `Flex direction="row-reverse"` → `Button colorScheme="blue" type="submit" isLoading`: **"Save"**. Submit: `isUpdate` (`!!initialValues`) → `useUpdateUser` (**MOCK** 2 s echo) → toast `` `${firstName} ${lastName} has been updated` ``; else `useAddUser` (**MOCK** 2 s, random id) → toast `` `… has been added` ``; errors generic toast. No navigation after save; the user list is not actually changed.

### 3.11 Admin Posts — `/admin/posts` (`pages/admin/Posts.tsx`)
- Data: `useAuth().session` → `useProfile(session.user.email)` → **GET `/api/v1/profile/findProfileByEmail/:email`**; then `usePostByProfileId(profile?.id)` → **GET `/api/v1/posts/postsByProfileId/:profileId`** (key `["posts", profileId]`, enabled when profile loaded) — only the logged-in profile's posts. `pageSize = 5` (`:16`).
- `isLoading` → `Loading`; `isError` → `Result "Oops!"`. (While the profile has not loaded the posts query is disabled/idle, so the table shows `Empty` with pagination text over `undefined`.)
- `Toolbar`: **"Posts"**; `Button as={Link} colorScheme='blue' to="/admin/posts/new"` **"Add Post"** (`:82-89`).
- `Card mt="8"` header **"Posts table"**; `PostTable` (`components/post/PostTable.tsx`): columns **Title** (`truncate(title)` → first 10 chars + "..."), **Content** (`truncate(content)`), **Status** (`published` → `Badge colorScheme="green"` "Public" else `Badge` "Private"), **Actions**: `IconButton as={Link} icon={<EditIcon />} to={`/admin/posts/${id}`} aria-label="Edit post {id}"`, `IconButton icon={<DeleteIcon />} aria-label="Delete post {id}" onClick={onDelete}` (`:34-67`); empty → `Empty "Posts will show up here!"` (`:25-27`); `Table variant="simple"` (**UNCOMMITTED**: quoting style only). `CardFooter` → `Pagination`.
- Delete: `AlertDialog` **"Delete Post"** / **"Are you sure? You can't undo this action afterwards."** / **"Cancel"** / red **"Delete"** `isLoading={removePost.isLoading}` (`:109-139`) → `useRemovePost().mutate(post.id)` → **DELETE `/api/v1/posts/deleteById/:id`** (no auth header) → onSuccess close + toast `` `Post ${post.id} has been removed` `` success + invalidate `"posts"`; onError generic (`:61-78`). No ownership check on the client beyond listing only own posts.

### 3.12 Admin Post — `/admin/posts/new` and `/admin/posts/:id` (`pages/admin/Post.tsx`)
- Data: `usePost(Number(id))` → **GET `/api/v1/posts/post/:id`** (enabled when id). `isLoading` → `Loading`; `isError` → `<span>…</span>`.
- `Toolbar`: `` `Update post ${id}` `` or **"Add post"**; **"Back"** → `/admin/posts` (`:42-56`). Same `Grid` as User page: `Card` **"Post form"** → `PostForm initialValues={data}`; `Card` **"Help"** with the same two href-less links (`:57-88`).
- **PostForm** (`components/post/PostForm.tsx`): `Page slideFade` → `Box as="form"` → `Stack spacing 5`. `FormHeader` `Heading fontSize="lg" fontWeight="semibold"` **"Add Post"** (shown in update mode too, `:112-114`). Hidden `profileId = profile.id` via `setValue`; `reset(initialValues)` when editing (`:56-59`).
  - `title`: `Input placeholder="title"` `required: "This is required"` (`:116-128`).
  - `content`: `Textarea placeholder='content'` required (`:129-140`).
  - `published`: `Checkbox id="published"` **"Tick the box to make the post public"** (`:141-146`).
  - `type`: Chakra `Select placeholder='type'` options from `POST_TYPE_OPTIONS` in order Funny, Serious, News, Random, Tech (values `FUNNY|SERIOUS|NEWS|RANDOM|TECH`); no rule (`:147-156`).
  - `tags`: `Controller` + `chakra-react-select` `Select isMulti options={tags} placeholder="Pick post tags" closeMenuOnSelect={false}` (`:157-180`); 14 options (§9).
  - `Flex direction="row-reverse"` → `Button colorScheme="blue" type="submit" isLoading={addPost.isLoading || updatePost.isLoading}` **"Save"**.
  - `isUpdate = !!initialValues` (`:44`). Add (`:61-79`): `useAddPost().mutate(post)` → **POST `/api/v1/posts/create`** with header `Authorization: token <access_token>` body `{ title, content, published, type, tags, profileId }` → onSuccess toast **"post has been added"**, `navigate("/admin/posts")`, `socket.emit("createPost", { post, username: profile?.username })`; onError generic. Update (`:81-97`): `useUpdatePost().mutate(post)` → **PUT `/api/v1/posts/updateById/:id`** (no auth header) body = form values (includes everything from `reset(initialValues)`: `id, createdAt, updatedAt, viewCount, profile, comments, likes, …`) → onSuccess toast `` `${title} ${content} has been updated` `` (stays on page); onError generic. Both invalidate `"posts"`.
  - `PostFormProps` declares `onSubmitSuccess?, onSubmitError?, submitButtonText?, isSubmitting?, readOnly?, showPublishToggle?` (**UNCOMMITTED LOCAL ADDITION**, `:28-33`) — declared only; the component destructures just `initialValues` (`:36`).

### 3.13 Admin Profile — `/admin/profile` (`pages/admin/Profile.tsx`)
- `Page slideFade`; `Toolbar` **"Profile"**; `Card mt="8"` header **"Profile details"**; `Tabs variant="soft-rounded" colorScheme="blue"`: **"Profile"** → `ProfileForm`; **"Password"** → `PasswordForm`; **"Danger Zone"** (`_selected={{ color: 'white', bg: 'red.400' }}`) → `DangerZone` (`:21-37`). Below the card: `<ExperienceList />` then `<EducationList />` (`:41-42`).

**ProfileForm** (`components/auth/ProfileForm.tsx`)
- Data: `useProfile(session.user.email)` → GET findProfileByEmail; `reset(profile)` populates all fields (`:65-67`); `setValue('id', profile.id)` (`:61-63`).
- `Form` (divider-separated) with `FormHeader` `Heading` **"Edit profile"**.
- **User Avatar** line (`:97-107`): `FormLineLabel` "User Avatar"; `<CustomAvatar size='96px' color='teal' url={profile?.avatarUrl} onUpload={(url) => setValue('avatarUrl', url)} />`; `Center` → `Button` wrapping `<label className="button primary block" htmlFor="avatarUrl">Upload</label>` (clicking the label opens the hidden file input with `id="avatarUrl"`).
- **Public** (`:108-112`, **UNCOMMITTED LOCAL ADDITION**): `FormControl` → `FormLabel htmlFor="isPublic"` "Public"; `Switch p='5' id="isPublic" {...register("isPublic")}`; `Text as='sup'` **"If you make your profile public it will be visible by everyone"**.
- `username` `Input placeholder="Username"` `required: "This is required"` (`:113-127`).
- `website` `Input placeholder="Website"` required (`:128-142`).
- `company` `Input placeholder="Company"` required (`:143-157`).
- `bio` `Textarea placeholder="Bio"` required; its `FormErrorMessage` prints `errors.company.message` (copy/paste bug, `:169`) (`:158-172`).
- `programmingLanguages`: `Controller` + `chakra-react-select` `Select isMulti options={programmingLanguages} placeholder="Pick programming languages" closeMenuOnSelect={false}` with `FormLabel` "Programming Languages" (`:173-196`).
- `FormFooter` → `Button colorScheme="blue" type="submit" isLoading` **"Save"** → `useUpdateProfile().mutate(values)` → **PUT `/api/v1/profile/updateById/:id`** body = whole form state (`id, username, company, website, avatarUrl, bio, isPublic, programmingLanguages[]` plus every other field copied in by `reset(profile)` such as `authorEmail, createdAt, updatedAt, experiences`) → onSuccess toast **"Your profile has been updated"** + invalidate `"profile"`; onError generic (`:69-84`).

**PasswordForm** (`components/auth/PasswordForm.tsx`)
- `Form`; `FormHeader` `Heading` **"Change password"**. `newPassword` `Input type="password" placeholder="New Password"` `required: "This is required"` (`:60-75`); `confirmPassword` `Input type="password" placeholder="Confirm Password"` `validate: value !== watch("newPassword") → "Your passwords do no match"` (sic, `:86-90`); no min-length. `Button colorScheme="blue" type="submit" isLoading` **"Save"** → `useUpdatePassword().mutate(newPassword)` → **MOCK** (`api/authApi.ts:108-114`, resolves `true` after 2 s; Supabase is never called) → toast **"Your password has been updated"** success; onError generic (`:35-51`).

**DangerZone** (`components/auth/DangerZone.tsx`)
- `Page slideFade` → `FormHeader`: `Heading fontSize="lg" fontWeight="semibold"` **"Delete your account"** + `Button colorScheme="red" type="submit"` **"Delete Account"** → opens `AlertDialog` (`:57-68`).
- Dialog: header **"Delete Profile"**, body **"Are you sure? You can't undo this action afterwards."**, **"Cancel"**, `Button colorScheme="red" isLoading={deleteProfile.isLoading}` **"Delete"** (`:69-99`) → `useDeleteProfile().mutate(profile.id)` → **DELETE `/api/v1/profile/delete/:id`** with header `Authorization: token <access_token>` (`api/authApi.ts:84-91`) → onSuccess toast `{ position: 'top', description: "Your profile has been deleted", status: "success" }` then `signOut()` from AuthContext (`supabaseClient.auth.signOut()`), which fires `SIGNED_OUT` → toast "Signed out" → `RequireAuth` redirects to `/signin`; onError generic (`:28-45`). Only the backend profile row is deleted; the Supabase auth user is not. Invalidates `"profile"` (`hooks/auth/useDeleteProfile.ts:9`).

**ExperienceList** (`components/profile/ExperienceList.tsx`)
- Data: `useExperiences(profile?.id)` → **GET `/api/v1/experience/experienceByProfileId/:profileId`** (key `["experiences", profileId]`). `isLoading` → `Loading`; `isError` → `Result "Oops!"` (`:73-85`).
- `Card mt="8"`: header `Text` **"Experiences"** + `Button leftIcon={<AddIcon />}` **"Add"** → opens `AddModal` (`:101-111`). Body: `data.length === 0` → `Empty "Experiences will show up here!"`, else `TableContainer` → `Table variant='simple'` columns **Title, Description, Company, Location, From - To, Current**; cells `title, description, company, location, moment(from).format('l') + '-' + moment(to).format('l')` (e.g. `2/19/2023-3/1/2023`), `current ? '✅' : '❌'` (`:116-141`).
- `AddModal` (`components/shared/AddModal.tsx`) props: `modalHeader="Add Experience"`, `fields=["title","description","company","location"]`, `dateFields=["from","to"]` (`:31-33`). Modal: `preserveScrollBarGap size base sm / md md isCentered`, overlay `backdropFilter: blur(4px)`, `ModalContent p={12}`, `ModalCloseButton`. Each text field → `Input name=placeholder=field` rule `required: "This is required"`, `isDisabled={formState.isSubmitting}`; each date field → `Input type='date'` same rule; `Checkbox id="current"` **"Current position?"**; `Button type="submit" isLoading={formState.isSubmitting}` **"Save"** (`AddModal.tsx:35-83`). `isInvalid`/error text use `errors.inputs[index]` which never exists → field errors are never displayed (the `required` rule still blocks submission).
- Submit (`:51-71`): `useAddExperience().mutate(values)` → **POST `/api/v1/experience/create`** body `{ title, description, company, location, from, to, current, profileId }` → onSuccess toast **"experience has been added"** + invalidate `"experiences"`; onError generic. Immediately after calling mutate (not awaiting): `onClose()`, `reset()`, re-`setValue('profileId')`.

**EducationList** (`components/profile/EducationList.tsx`) — identical structure: `useEducations(profile?.id)` → **GET `/api/v1/education/educationByProfileId/:profileId`** (key `["educations", profileId]`); header **"Education"**; `AddModal` header **"Add Education"**, `fields=["school","description","degree","fieldOfStudy"]`, `dateFields=["from","to"]`, checkbox **"Current position?"**; **POST `/api/v1/education/create`** → toast **"education has been added"**; table header labels **School, Description, Company, Location, From - To, Current** (`:119-126`) while cells render `school, description, degree, fieldOfStudy, dates, current` (`:131-136`, headers 3–4 mislabelled); empty → `Empty "Education will show up here!"`.

### 3.14 Admin header UserSearch (`components/user/UserSearch.tsx`, `components/shared/Search.tsx`)
- `SearchTrigger`: `IconButton aria-label="Search" icon={<Search2Icon color="muted" />} variant="ghost"` → opens `Modal`.
- `SearchResults`: `ModalContent overflow="hidden"` with `chakra.input aria-autocomplete="list" autoComplete="off" autoCorrect="off" spellCheck="false" maxLength={64} h="68px" pl="68px" placeholder="Search the users"` and `Search2Icon color="primary" boxSize="20px"`; results area only when `query.length > 1` (`Search.tsx:103`): `Loading` while loading; `VStack` of children.
- `useSearchUsers(query)` (**MOCK**, 1 s, case-insensitive `includes` on `"First Last"`), `enabled: query.length > 1` (`hooks/user/useSearchUsers.ts:6`), key `["users", query]`.
- Each result: `Link to={`/admin/users/${id}`}` → `SearchResultsItem title="First Last" description={email}` (`Flex bg gray.100/gray.600 borderRadius="lg" px 4 py 2 _hover bg primary.500/primary.200 color white/gray.900` + `ArrowForwardIcon`; click closes modal). `data.length === 0` → `SearchEmpty` `Text fontSize="sm"` **"No result found!"**.

---

## 4. Auth flows

| Flow | Trigger | Implementation | Side effects |
|---|---|---|---|
| Supabase client | module load | `createClient(REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY)` default options (`config/supabase-client.ts:6`) → session persisted by supabase-js in `localStorage`, auto-refresh, `detectSessionInUrl` for OAuth/magic-link callbacks | — |
| Boot | `AuthProvider` mount (`providers/AuthProvider.tsx:16-23`) | `supabaseClient.auth.getSession()`; `setSession/setUser`; `loading=false`; children not rendered until then (`:64`) | — |
| Auth state listener | `supabaseClient.auth.onAuthStateChange` (`:25-46`) | For **every** event: if `session.user.app_metadata.provider === 'github'` → `createOrVerifyProfile(session.user.email)` → **POST `/api/v1/profile/createProfileBySocial/:email`** (fire-and-forget, result unused) (`:26-29`). `SIGNED_OUT` → toast `{ description: "Signed out", status: "info" }` + `localStorage.removeItem('user')` (nothing in `src/` ever writes a `'user'` key) (`:30-36`). `SIGNED_IN` → toast `{ description: "Signed in", status: "info" }` (`:37-42`). Then `setSession/setUser` | Context value `{ session, user, signOut: () => supabaseClient.auth.signOut() }` (`:55-59`); `useAuth()` hook (`:70-72`) |
| Sign up (email/password) | Signin Tab 1 in "Register" mode | `signUpWithEmailAndPassword(email, password)` (`api/authApi.ts:58-68`): `supabaseClient.auth.signUp({ email, password })`, throw on error, then `addProfile({ authorEmail: email })` → **POST `/api/v1/profile/create`** body `{ authorEmail }` (profile created immediately, independent of e-mail confirmation) | onSuccess `navigate(from, { replace: true })` |
| Sign in (email/password) | Signin Tab 1 default mode | `signInWithEmailAndPassword` → `supabaseClient.auth.signInWithPassword({ email, password })` (`:50-56`) | `SIGNED_IN` toast; onSuccess socket emit/listen (uncommitted) + `navigate(from, { replace: true })` |
| Magic link | Signin Tab 2 | `signInWithMagicLink(email)` (`:41-48`): `supabaseClient.auth.signInWithOtp({ email })`, throw on error, then `addProfile({ authorEmail: email })` → **POST `/api/v1/profile/create`** (awaited inside the same mutation on every request) | success toast "Account confirmed." / "Check your email for the login link"; `navigate(from, replace)` |
| GitHub OAuth | OAuthButtonGroup "GitHub" | `signInWithOAuth()` → `supabaseClient.auth.signInWithOAuth({ provider: 'github' })` (`:34-39`), no `redirectTo`; on return the listener above creates/verifies the profile via `createProfileBySocial` | Google/Twitter buttons only `console.log` |
| Sign out | Nav "Logout", ProfileMenu "Sign out", DangerZone success | `useSignOut` → `signOut()` → `supabaseClient.auth.signOut()` (`:103-106`); DangerZone uses context `signOut` | `SIGNED_OUT` toast "Signed out"; ProfileMenu navigates `/signin`; Nav does not navigate; `RequireAuth` redirects admin pages to `/signin` once `user` becomes undefined |
| Password update | Profile → Password tab | **MOCK** `updatePassword(newPassword)` resolves `true` after 2 s (`:108-114`); `supabase.auth.updateUser` is never called | toast "Your password has been updated" |
| Profile creation on first login | see rows above | Email/password & magic link → `POST /profile/create` at request time; GitHub → `POST /profile/createProfileBySocial/:email` on every auth-state event while provider is github | — |
| Account deletion | Profile → Danger Zone | `deleteProfileById(id)` → `supabaseClient.auth.getSession()` → **DELETE `/api/v1/profile/delete/:id`** with `Authorization: token <access_token>` (`:84-91`) → toast "Your profile has been deleted" (top) → `signOut()` | Supabase auth user remains |
| Route guard / redirect-after-login | `RequireAuth` + Signin | `Navigate to="/signin" state={{ from: location }} replace`; Signin reads `location.state.from.pathname` default `/` | — |
| Session persistence | supabase-js default | localStorage (`sb-<ref>-auth-token`); context re-hydrated by `getSession()` on reload | — |
| Mock auth user | `fetchAuthUser()` (`:15-21`) | resolves `{ id: "123", email: "john@smith.com", firstName: "John", lastName: "Smith" }` after 1 s — **never called** | — |

Auth header format sent by the frontend: `Authorization: token <supabase access_token>` (only on `POST /posts/create` and `DELETE /profile/delete/:id`). Backend `auth` middleware (`backend/src/middleware/auth.ts:7,15`) takes `header.split(' ')[1]` and `jwt.verify(token, SUPABASE_JWT_SECRET)`; it is applied only to `POST /api/v1/posts/create` (`backend/src/api/posts.ts:109`) — the profile delete route has no middleware (`backend/src/api/profile.ts:84`).

---

## 5. Avatar / storage

**CustomAvatar** (`components/shared/CustomAvatar.tsx`; used only in ProfileForm)
- Props `{ url, onUpload, disabled, size, color }` (untyped `any`).
- Display: `Flex justifyContent="center" alignItems="center" h="120px" w="full" overflow="hidden"` → `Box position="relative" w={size} h={size}` with `_before` pseudo-element pulse ring (`width/height 300%`, `borderRadius 50%`, `bgColor={color}` = `'teal'`, animation `2.25s pulseRing cubic-bezier(0.455, 0.03, 0.515, 0.955) -0.4s infinite`; keyframes `0% scale(0.33)`, `40%,50% opacity 0`, `100% opacity 0`, `:9-20, 70-87`) → `Avatar src={avatarUrl} size="full" position="absolute" top={0}` (`:88`).
- Download (`:22-37`): when `url` prop set → `supabaseClient.storage.from('images').download(path)` → `URL.createObjectURL(blob)` → state; errors → `console.log('Error downloading image: ', …)`.
- Upload (`:39-65`): hidden `Input type="file" id="avatarUrl" accept="image/*" style visibility hidden/position absolute` `disabled={uploading || disabled}` (`:92-103`); on change: if no file → `throw new Error('You must select an image to upload.')`; `fileExt = file.name.split('.').pop()`; **`fileName = `${Math.random()}.${fileExt}``** (e.g. `0.8213…​.png`); `filePath = fileName` (bucket root, no user folder); `supabaseClient.storage.from('images').upload(filePath, file)` (no upsert, no size/MIME check beyond the `accept` attribute); then `onUpload(filePath)` (ProfileForm stores it into form field `avatarUrl`) and `downloadImage(filePath)`; any error → `alert(error.message)`. The avatar path is persisted only when the Profile form is saved (PUT updateById). Old files are never deleted.

**ProfileAvatar** (`components/shared/ProfileAvatar.tsx`; used in Nav, ProfileMenu, BlogAuthor, Developers)
- Props `{ avatarName: string; url?: string; avatarSize?: string; mr?: string }` (`url?` is **UNCOMMITTED**: was `string | undefined`).
- When `url` set → `supabaseClient.storage.from('images').download(url)` → object URL → `Avatar mr src name={avatarName} size={avatarSize}` (`:15-32`). `avatarName` is always `truncate(email)` (first 10 chars + "...") so initials fallback derives from the e-mail prefix. Each mounted instance downloads its own blob; no caching layer; object URLs never revoked; errors `console.log`.
- Bucket name everywhere: **`images`**; access via the storage download API with the anon key (not public URLs).

Related unused constant: `UPLOAD_PICTURE_DISABLED_TEXT = 'You must create your profile first'` (`utils/constants.ts:25`).

---

## 6. Backend API surface as consumed by the frontend

Base: `${process.env.REACT_APP_BACKEND_URL}/api/v1`. All calls use `axios` with default headers (`Content-Type: application/json`); "Auth" = `Authorization: token <supabase access_token>` obtained via `supabaseClient.auth.getSession()` at call time.

| # | Method | URL template | Auth header | Request body | api function (file:line) | Hook / key | Response usage |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/profile` | no | — | `fetchProfiles` (`api/authApi.ts:98`) | `useProfiles` `"profiles"` | `Profile[]` → Developers cards |
| 2 | GET | `/profile/findProfileByEmail/:email` | no | — | `fetchProfileByEmail` (`:93`) | `useProfile(email)` `["profile", email]` enabled `!!email` | current user's `Profile` (id, username, avatarUrl, authorEmail…) used by Nav, ProfileMenu, forms, Novu subscriberId |
| 3 | POST | `/profile/create` | no | `{ authorEmail }` | `addProfile` (`:74`) | inside `signUpWithEmailAndPassword`, `signInWithMagicLink` | ignored |
| 4 | POST | `/profile/createProfileBySocial/:email` | no | none | `createOrVerifyProfile` (`:70`) | `AuthProvider` (github sessions) | ignored (returns raw axios response) |
| 5 | PUT | `/profile/updateById/:id` | no | full ProfileForm values (`id, username, company, website, avatarUrl, bio, isPublic, programmingLanguages[]` + fields copied from the loaded profile) | `updateProfile` (`:79`) | `useUpdateProfile` → invalidates `"profile"` | toast only |
| 6 | DELETE | `/profile/delete/:id` | **yes** | — | `deleteProfileById` (`:84`) | `useDeleteProfile` → invalidates `"profile"` | toast + sign out |
| 7 | GET | `/posts` | no | — | `fetchPosts` (`api/postApi.ts:7`) | `usePosts` `"posts"` | `Post[]` with `profile, comments, likes, tags` → feed |
| 8 | GET | `/posts/postsByProfileId/:profileId` | no | — | `fetchPostsByProfileId` (`:12`) | `usePostByProfileId` `["posts", profileId]` | admin Posts table |
| 9 | GET | `/posts/post/:id` | no | — | `fetchPostById` (`:17`) | `usePost` `["posts", id]` | post detail / admin edit form (**note**: same key shape as #8, so post id *n* and profile id *n* share a cache entry) |
| 10 | POST | `/posts/create` | **yes** | `{ title, content, published, type, tags: Tag[], profileId }` | `addPost` (`:22`) | `useAddPost` → invalidates `"posts"` | toast, navigate, socket emit |
| 11 | PUT | `/posts/updateById/:id` | no | full form state incl. loaded post fields | `updatePost` (`:31`) | `useUpdatePost` → invalidates `"posts"` | toast |
| 12 | DELETE | `/posts/deleteById/:id` | no | — | `deletePostById` (`:36`) | `useRemovePost` → invalidates `"posts"` | toast |
| 13 | POST | `/comments/create` | no | `{ text, profileId, postId }` | `addComment` (`api/commentApi.ts:6`) | `useAddComment` → invalidates `"comments"` | toast, reset, socket emit |
| 14 | GET | `/comments/commentsByPostId/:postId` | no | — | `fetchCommentsByPostId` (`:11`) | `useCommentsByPostId` `["comments", postId]` | `Comment[]` (with `profile`) list |
| 15 | POST | `/likes/create` | no | `{ postId, profileId }` | `addLike` (`api/likeApi.ts:6`; wraps errors in `new AxiosError(error)`) | `useAddLike` → invalidates `"posts"` | toast; error text from `response.data.error` |
| 16 | POST | `/experience/create` | no | `{ title, description, company, location, from, to, current, profileId }` | `addExperience` (`api/experienceApi.ts:6`) | `useAddExperience` → invalidates `"experiences"` | toast |
| 17 | GET | `/experience/experienceByProfileId/:profileId` | no | — | `fetchExperiencesByProfileId` (`:11`) | `useExperiences` `["experiences", profileId]` | table |
| 18 | POST | `/education/create` | no | `{ school, description, degree, fieldOfStudy, from, to, current, profileId }` | `addEducation` (`api/educationApi.ts:6`) | `useAddEducation` → invalidates `"educations"` | toast |
| 19 | GET | `/education/educationByProfileId/:profileId` | no | — | `fetchEducationsByProfileId` (`:11`) | `useEducations` `["educations", profileId]` | table |

Supabase SDK calls (not HTTP to the Express backend): `auth.getSession` (AuthProvider, `addPost`, `deleteProfileById`), `auth.onAuthStateChange`, `auth.signUp`, `auth.signInWithPassword`, `auth.signInWithOtp`, `auth.signInWithOAuth({ provider: 'github' })`, `auth.signOut`, `storage.from('images').upload`, `storage.from('images').download`.

React-query configuration: `new QueryClient()` defaults (`index.tsx:14`) — staleTime 0, refetch on window focus, 3 retries. Mutation hooks and their invalidations are listed in the table. Keys in use: `"profile"`, `["profile", email]`, `"profiles"`, `"posts"`, `["posts", id]`, `["posts", profileId]`, `"comments"`, `["comments", postId]`, `"experiences"`, `["experiences", profileId]`, `"educations"`, `["educations", profileId]`, `"users"`, `["users", id]`, `["users", query]`, `"userStats"`.

---

## 7. Realtime (socket.io)

Client: `export const socket = io(`${process.env.REACT_APP_BACKEND_URL}`)` created at module evaluation of `utils/constants.ts:27-29` — a connection is opened for every visitor as soon as any importer loads (Posts feed, PostForm, CommentForm, LikeButton, Signin, types/post), regardless of auth. Default transports/options. No disconnect handling.

| Direction | Event | Payload | Where | UI behaviour | Server counterpart (`backend/src/app.ts`) |
|---|---|---|---|---|---|
| emit | `createPost` | `{ post: { id?, title, content, profileId, published, type, tags }, username: profile?.username }` | `components/post/PostForm.tsx:69` after successful POST create | none locally | `:27-33` → `socket.broadcast.emit('postBroadcasted', data)` to all *other* sockets (Novu post notification call is commented out) |
| on | `postBroadcasted` | same object as above | `pages/post/Posts.tsx:38-42` (registered in `useEffect([toggleChip])`, never `off`) | `if (payload.post.published) toggleChip()` → shows "New posts" chip; clicking refetches | — |
| emit | `addComment` | `{ post: Post, profile: Profile, comment: { text, profileId, postId } }` | `components/comments/CommentForm.tsx:49` after successful POST | none locally | `:35-40` → `socket.broadcast.emit('commentBroadcasted', data)` **and** `sendCommentNotification(data.post.id, data.post.profileId, data.profile.authorEmail)` (Novu) |
| on | `commentBroadcasted` | — | **not listened anywhere in the frontend** | — | emitted by server |
| emit | `new-user-add` | `email: string` | `pages/auth/Signin.tsx:97` on password sign-in success — **UNCOMMITTED LOCAL ADDITION** | none | **no handler on the server** |
| on | `get-users` | `users` (any) | `pages/auth/Signin.tsx:98-100` — **UNCOMMITTED LOCAL ADDITION** | `console.log('users online', users)` | **never emitted by the server** |
| emit (dead) | `createTask` | `{ task: string, userId: localStorage.getItem("1") }` | `pages/admin/WebSocket.tsx:13` (own `io("http://localhost:8080")`, `:5`) — component never routed | — | no handler |

Live socket events in routed code: 3 emits + 2 listeners (5), of which 2 (the `new-user-add`/`get-users` pair) are uncommitted and have no backend; 1 server broadcast (`commentBroadcasted`) is unused; 1 dead emit (`createTask`).

---

## 8. Notifications (Novu)

- Package `@novu/notification-center` (REFERENCE `^0.12.0`, PRIMARY `^2.0.0`). Only usage: `components/shared/Nav.tsx:15-19, 89-108`.
- Mounted only inside the landing `Nav` and only when `session` is truthy; absent from AdminLayout pages.
- `NovuProvider subscriberId={`${profile?.id}`}` — the numeric backend profile id stringified (renders as the string `"undefined"` until the profile query resolves); `applicationIdentifier='vTbMIBFNZdXt'` hard-coded (no env var, no HMAC `subscriberHash`).
- `PopoverNotificationCenter showUserPreferences={false} footer={() => <></>} colorScheme={colorMode} allowedNotificationActions={true} onNotificationClick={(n) => navigate(`/posts/${n.payload.postId}`)}`; child `({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />`.
- Server side trigger (`backend/src/functions/commentNotification.ts:5-13`): `novu.trigger('comment-template', { to: { subscriberId: `${postProfileId}` }, payload: { username, postId } })`, called from the socket `addComment` handler (`backend/src/app.ts:39`) with `postProfileId = data.post.profileId` (post author) and `username = data.profile.authorEmail` (commenter's e-mail). Notifications are therefore produced only when the comment is added through the UI (REST create + socket emit), and the clicked notification deep-links to `/posts/:postId`.
- Home page feature list item "Notification Provider with Novu" (`pages/Home.tsx:25`).
- No other notification UI (no in-app notification list page, no e-mail/push configuration in the frontend).

---

## 9. Types (`src/types`) and constants (`utils/constants.ts`)

| Type (file) | Fields (`?` = optional) |
|---|---|
| `AuthUser` (`types/authUser.ts`) | `id: string; email: string; firstName: string; lastName: string` — used only by the mock `fetchAuthUser` |
| `Comment` (`types/comment.ts`) | `id: number; createdAt?: Date; text: string; profileId: number; postId: number; profile: Profile` |
| `Education` (`types/education.ts`) | `id: number; createdAt?: Date; updatedAt?: Date; school: string; description: string; degree: string; fieldOfStudy: string; from: Date; to: Date; current?: boolean; profileId: number` |
| `Experience` (`types/experience.ts`) | `id: number; createdAt?: Date; updatedAt?: Date; title: string; description: string; company: string; location: string; from: Date; to: Date; current?: boolean; profileId: number` |
| `Like` (`types/like.ts`) | `id: number; createdAt?: Date; profileId: number; postId: number` |
| `Post` (`types/post.ts`) | `id: number; createdAt: Date; updatedAt: Date; title: string; content: string; published: boolean; viewCount: number; profile: Profile; profileId: number; type: PostType; comments?: Comment[]; likes?: Like[]; tags?: Tag[]` |
| `Profile` (`types/profile.ts`) | `id: number; createdAt?: Date; updatedAt?: Date; avatarUrl?: string; bio?: string; username?: string; website?: string; company?: string; authorEmail: string; isPublic?: boolean; experiences?: Experience[]; programmingLanguages?: ProgrammingLanguage[]` |
| `ProgrammingLanguage extends OptionBase` (`types/programmingLanguage.ts`) | `label: string; value: string`; exported list `programmingLanguages` (15): python/Python, typescript/TypeScript, javascript/JavaScript, ruby/Ruby, java/Java, php/PHP, golang/GoLang, c++/C++, c#/C#, clojure/Clojure, scala/Scala, kotlin/Kotlin, solidity/Solidity, rust/Rust, .net/.NET |
| `Tag extends OptionBase` (`types/tag.ts`) | `label: string; value: string`; exported list `tags` (14): engineering/Engineering, computerscience/Computer Science, product/Product, productivity/Productivity, algorithms/Algorithms, joblife/Job Life, tech/Tech, security/Security, industrial/Industrial, it/IT, hardware/Hardware, programming/Programming, devops/DevOps, cybersecurity/Cybersecurity |
| `User` (`types/user.ts`) | `id: string; createdAt: Date; disabled: boolean; email: string; firstName: string; lastModifiedAt: Date; lastName: string; role: string` — mock admin users only |
| `UserStats` (`types/userStats.ts`) | `count: number; countByRole: { admin: number; guest: number; member: number }; countByStatus: { active: number; disabled: number }; recentlyAdded: User[]; recentlyUpdated: User[]` |

Constants (`utils/constants.ts`):
- `PostTypes = { FUNNY: 'FUNNY', TECH: 'TECH', RANDOM: 'RANDOM', NEWS: 'NEWS', SERIOUS: 'SERIOUS' }` (`:3-9`); `type PostType = (typeof PostTypes)[keyof typeof PostTypes]` (`:19`).
- `POST_TYPE_OPTIONS` (`:11-17`), display order: `{FUNNY,"Funny"}, {SERIOUS,"Serious"}, {NEWS,"News"}, {RANDOM,"Random"}, {TECH,"Tech"}`.
- UI texts: `DISABLED_PROFILE_TEXT = 'you must be logged in to see your profile'` (unused); `DELETE_BUTTON_TEXT = 'You can delete this post'` (unused); `LIKE_BUTTON_TEXT = 'Smash the like button!'`; `LIKE_BUTTON_TEXT_DISABLED = 'you must be logged in to like the post'`; `UPLOAD_PICTURE_DISABLED_TEXT = 'You must create your profile first'` (unused) (`:21-25`).
- `socket = io(REACT_APP_BACKEND_URL)` (`:27-29`).

Other helpers: `utils/functions.ts` (`truncate`, `getRandomColor`), `utils/contextUtils.ts` (`createCtx` typed context factory used by AppShell and Search), `utils/eventBus.ts` (document CustomEvent bus — unused).

---

## 10. MOCKED / FAKE features

| Feature | Where | Mock behaviour | What the UI shows |
|---|---|---|---|
| Admin users list | `api/userApi.ts:166-172` `fetchUsers` | resolves after 1 s the hard-coded array of **11 users** (`:4-115`: Rhys Arriaga Admin; Laura Core Member; Joshua Jagger Member; Jason Jimenez Member disabled; Rhonda Mcguire Member disabled; Aaron Moreno Member; Carley Murray Member; Cherise Owen Member; Nathan Romero Member; Olivia Spence Guest; Elisha Wade Guest; ids "1"–"11", `createdAt` Feb–Dec 2022) | `/admin/users` table, 5 per page (3 pages) |
| Get user by id | `fetchUserById` (`:150-156`) | 1 s, `users.find` by string id | `/admin/users/:id` form prefill |
| User stats | `fetchUserStats` → `getUserStats` (`:121-140, 158-164`) | 1 s; counts by role/status; `recentlyAdded` = first 3 after **ascending** sort by `createdAt` (i.e. the 3 oldest), `recentlyUpdated` = first 3 after ascending `lastModifiedAt`; `.sort` mutates the shared array | `/admin` dashboard numbers: Total 11, Active 9, Disabled 2, Member 7, Guest 2, Admin 1, 81.8 % |
| Add user | `addUser` (`:142-148`) | 2 s, returns `{ ...user, id: random 1–10000 }`, not stored | toast "… has been added", list unchanged |
| Update user | `updateUser` (`:196-202`) | 2 s echo | toast "… has been updated" |
| Remove user | `removeUser` (`:174-180`) | 2 s, returns id, not removed | toast "… has been removed", row persists after refetch |
| Search users | `searchUsers` (`:182-194`) | 1 s, case-insensitive substring on `"First Last"` | admin header search modal |
| Change password | `api/authApi.ts:108-114` `updatePassword` | 2 s, resolves `true`; ignores the argument | Profile → Password tab success toast "Your password has been updated" |
| Auth user | `fetchAuthUser` (`:15-21`) | 1 s, John Smith | never rendered |
| Role label | `Nav.tsx:123-125` | literal text "Admin" under the username | shown for every logged-in user |
| "Connect" button | `Developers.tsx:93-104` | no handler | button does nothing (REFERENCE label "Follow") |
| Google / Twitter OAuth | `Signin.tsx:144-146, 150-152` | `console.log` only | buttons rendered, no auth |
| Help card links | `pages/admin/Post.tsx:79-83`, `pages/admin/User.tsx:79-83` | `ChakraLink` without `href` | "Read documentation", "Chakra UI documentation" inert |
| Footer "Documentation" / "Github" | `Footer.tsx:18-19` | → `/` and `https://github.com/` | generic targets |
| PromoBanner | `PromoBanner.tsx:24` | static text "We just launched our new product." | dismissible, non-persistent |
| Realtime online users | `Signin.tsx:97-100` (uncommitted) | emits/listens to events the server does not implement | console only |

---

## 11. Dead / unused code

Import sweep method: for every file under `src/`, grep all `.ts/.tsx` for `from '…/<basename>'` excluding the file itself (run over PRIMARY). Files with **zero** importers:

| File | Evidence | Notes |
|---|---|---|
| `components/shared/Brand.tsx` | 0 importers; symbol `Brand` appears only in its own file | Circle logo component |
| `components/shared/ColorModeSwitcher.tsx` | 0 importers | CRA Chakra template leftover; superseded by `DarkModeSwitch` |
| `layouts/InnerLayout.tsx` | 0 importers; `InnerLayout` referenced only in its own file | alternative layout with "Back to home" navbar |
| `pages/admin/WebSocket.tsx` | 0 importers; route commented at `App.tsx:61`, sidebar link commented at `AdminLayout.tsx:25` | opens a second socket to `http://localhost:8080`, emits `createTask` |
| `utils/eventBus.ts` | 0 importers; `eventBus` symbol only in its own file | document CustomEvent bus |
| `logo.svg` (786 B) | no `import … logo.svg` anywhere | CRA default asset |
| `App.test.tsx`, `test-utils.tsx` | `test-utils` imported only by `App.test.tsx`; `setupTests.ts` is loaded by Jest config, `react-app-env.d.ts` by TS | test-only, not dead but not app code |

Exported-but-unused symbols inside used files: `fetchAuthUser` and the mock `authUser` object (`api/authApi.ts:8-21`); commented-out `onAuthStateChanged` (`:23-32`); `AuthUser` type (used only by `fetchAuthUser`); `DISABLED_PROFILE_TEXT`, `DELETE_BUTTON_TEXT`, `UPLOAD_PICTURE_DISABLED_TEXT` (`utils/constants.ts:21,22,25`); `PostTypes` object is used only inside `constants.ts` itself; `Profile.experiences`, `Profile.isPublic`, `Post.viewCount`, `Post.updatedAt` fields are never rendered; `PostFormProps` extra props (uncommitted) never read; `AddModal` prop `reset` is received but its call is commented out (`AddModal.tsx:24`); `Developers.tsx` destructures `company`, `website` without using them; `pages/post/Post.tsx:22` `isUpdate` fallback branch "Add post" is unreachable; `Navbar.tsx:17` requests a `"Navbar"` multi-style config that the stock theme does not define; `Illustration.tsx` is used only through `NotFoundImage`. The Novu post-notification path on the backend is commented (`backend/src/app.ts:32`).

---

## 12. Static content

- **Home** (`pages/Home.tsx`): headings/copy and the 18-item feature list as listed in §3.1.
- **Privacy** (`pages/Privacy.tsx`, 110 lines, `Section variant="prose"` → `Container maxW="2xl"`): `SectionTag` **"Updated on Apr 12, 2022"**, `SectionTitle` **"Privacy Policy"**, `SectionDescription` "The protection of your personal data is important for us. This is the reason we explain, in this document, what we collect and what may happen when using this website and related resources." Sections (`Heading as="h2" fontSize="3xl"`): **"What we collect"** with h3 sub-sections "Creation of an account" (collects e-mail address and password), "Analytics" (may use Google Analytics…), "Social Media" (Facebook Connect / Google Sign-in features may collect identifiers…); **"Purpose"** with `UnorderedList`: "To create an account.", "To ensure quality and improve our services.", "To fix problems with our services.", "To monitor and analyze web traffic."; **"Changes"** ("If we change our Privacy Policy we will post those changes on this page."); **"Contact us"** ending with the literal placeholder **"please contact us at ..."** (`:100-103`). Generic template text, not tailored.
- **Terms** (`pages/Terms.tsx`, 70 lines, prose variant): `SectionTag` **"Updated on Apr 12, 2022"**, `SectionTitle` **"Terms of Service"**, description "By using the site, you agree to these terms of service; If you do not agree, do not use the site." Sections: **"General"** (two paragraphs: agreement to Terms Of Use…; no liability for damages…), **"Changes"**, **"Contact us"** with placeholder **"please contact us at ..."** (`:60-63`).
- **404** (`pages/NotFound.tsx`): illustration + "Oops" + "Sorry, we couldn’t find the page you’re looking for." + "Back to home" (§3.7).
- **Footer**: see §2 — internal `/admin`, `/`, `/terms`, `/privacy`, `/license` (unrouted); external `https://github.com/`; copyright "© 2023 DevConnector. All rights reserved."; tagline "Admin dashboard built with React & ChakraUI".
- **Cookie banner** text and **Promo banner** text: §2.
- **Signin** copy: "Sign in to your account" / "Register a new account", "Don't have an account?" / "Already a User?", "Sign up" / "Log in", tabs "Username/Password" / "Magic Link", "or continue with", "Send magic link", "Sending magic link ...".
- **index.html** (`frontend/public/index.html`): `<html lang="en">`, `<title>DevConnector</title>`, `<meta name="DevConnector" content="Social Network for Developers" />` (non-standard meta name), `theme-color #000000`, favicon `favicon.ico`, `apple-touch-icon logo192.png`, `<link rel="manifest" href="%PUBLIC_URL%/manifest.json">`, `<noscript>You need to enable JavaScript to run this app.</noscript>`.
- **PWA**: `public/manifest.json` is the untouched CRA default (`short_name "React App"`, `name "Create React App Sample"`, icons favicon.ico 64/32/24/16, logo192.png, logo512.png, `start_url "."`, `display "standalone"`, `theme_color "#000000"`, `background_color "#ffffff"`). Service worker: `serviceWorker.ts` is the stock CRA register/unregister module and `index.tsx:28` calls **`serviceWorker.unregister()`** → no offline/PWA caching. `reportWebVitals()` is called with no handler (`index.tsx:33`) → no-op. `public/robots.txt` present (67 B).
- **Nginx** (`frontend/nginx/nginx.conf`): static SPA serving with `try_files $uri $uri/ /index.html`, gzip on, port 80.

---

## 13. Theming / UX

- **Theme**: `ChakraProvider theme={theme}` with the stock `theme` export (`App.tsx:3,28`); `grep extendTheme src/` → no results. `ColorModeScript` without props (`index.tsx:19`) → stock config (`initialColorMode: 'light'`, `useSystemColorMode: false`); color mode persisted by Chakra under `localStorage['chakra-ui-color-mode']`.
- **Undefined design tokens referenced** (resolve to no valid CSS under the stock theme): color `"muted"` (27 usages: ProfileMenu, Search, Section, Footer, DarkModeSwitch, Terms, Privacy, Home, NotFound, Signin, Dashboard), `"primary"` / `"primary.200"` / `"primary.500"` (Brand bg, SectionTag color, Search icon & hover bg, Illustration fill, PromoBanner gradient), `"surface"` (PromoBanner text), shadows `"dark-sm"` (Navbar, AppShell sidebar) and `"md-dark"` (Signin card). Standard tokens used: `gray.*`, `blue.*`, `green.400`, `red.400`, `whiteAlpha.*`, `blue.200`, `teal`, `lightblue`.
- **Dark mode**: every surface uses `useColorModeValue(light, dark)` pairs (Nav bg white/gray.800; borders gray.100/gray.700; AppShell/NavItem gray.100/gray.900; Banner white/gray.700; form card gray.100/gray.700; comment input gray.100/gray.600; search item gray.100/gray.600; Developers follow button gray.400/gray.900; Illustration fills). Toggles listed in §2.
- **Responsive breakpoints used**: `base`, `sm`, `md`, `lg`, `xl` (Chakra defaults). Key switches: sidebar ↔ drawer at `md` (`AppShell.tsx:175`); Nav links/Login/Register hidden below `md`; Limiter paddings `base 4 / md 10 / lg 24 / xl 60`; Footer row at `lg`; Dashboard grids `lg 3` and `xl 2`; admin form grid `xl 3`; Home features `md 3`; Developers grid `auto-fill minmax(300px, 1fr)`; Signin container paddings at `sm`/`md`; Section paddings `base 16 / md 24`.
- **Icon libraries**: `@chakra-ui/icons` — `ArrowBackIcon, ArrowDownIcon, ArrowForwardIcon, AddIcon, CheckIcon, DeleteIcon, EditIcon, ExternalLinkIcon, HamburgerIcon, InfoOutlineIcon, MoonIcon, SunIcon, Search2Icon, WarningIcon`; `react-icons/bi` — `BiCog, BiExit, BiMoon, BiSun, BiUser`; `react-icons/gi` — `GiHamburgerMenu`; `react-icons/fi` — `FiChevronDown, FiGrid, FiMessageCircle, FiSettings, FiUser, FiUsers, FiUserPlus`; `react-icons/hi` — `HiOutlineThumbUp, HiOutlineChat, HiEye, HiEyeOff`; `react-icons/fa` — `FaMoon, FaSun` (dead file only); custom `createIcon`: `GoogleIcon` (multi-colour), `GitHubIcon` (currentColor), `TwitterIcon` (#03A9F4) (`components/shared/ProviderIcons.tsx`).
- **Animations**: framer-motion `motion.div` page transitions via `Page` — `fade` (Home, NotFound, Privacy, Terms, Signin, Developers) and `slideFade` (Dashboard, admin Users/User/Posts/Post/Profile, DangerZone, PostForm, landing Posts/Post); framer-motion `useScroll` for Navbar shadow; Chakra transitions `Fade` (Nav logged-out buttons), `ScaleFade` (CookieBanner, "New posts" chip `initialScale 0.9`), `Collapse` (PromoBanner); Emotion `keyframes` pulse ring on CustomAvatar; CSS `transition="200ms all"` on Nav Limiter; hover `translateY(-2px)` + shadow on Developers button; `ModalOverlay backdropFilter: blur(4px)` in AddModal.
- **Date formatting**: `moment` — `components/profile/EducationList.tsx:135` and `ExperienceList.tsx:135` (`format('l')`, locale short date e.g. `2/19/2023`, joined with `-`), `pages/post/Posts.tsx:112` and `pages/post/Post.tsx:62,73` (`format('Do MMMM YYYY')`, e.g. `19th February 2023`); `date-fns` — `pages/admin/Dashboard.tsx:19,196,221` `formatDistanceToNow` (e.g. `over 1 year`, no suffix).
- **Toasts**: Chakra `useToast` defaults (bottom, 5 s) except `position: 'top'` on DangerZone success, LikeButton error, Signin magic-link success and GitHub error (`duration: 5000, isClosable: true` on the Signin ones).
- **Tables/Cards**: Chakra `Table variant="simple"` in `Box overflowX="auto"` / `TableContainer`; Chakra `Card/CardHeader/CardBody/CardFooter` throughout admin and Developers; `Tabs variant="soft-rounded"` (Profile) and default `Tabs align='center' isLazy` (Signin).
- **Forms**: react-hook-form everywhere (`register`, `Controller` for chakra-react-select multi-selects, `setValue` for hidden ids, `reset` for edit prefill, `formState.isValid` gating on Signin/CommentForm buttons; `mode: "onBlur"` only on the magic-link form).
- **Fonts**: Chakra defaults; no custom font loading.

---

## 14. Tests present

| File | What it does |
|---|---|
| `src/App.test.tsx` (`:6-10`) | `test("renders learn react link")`: renders `<App />` with the custom `render` from `test-utils` (wraps in `ChakraProvider theme={theme}`) and asserts `screen.getByText(/learn chakra/i)` is in the document. No element in `src/` contains the text "learn chakra" (grep returns only this test), so the assertion cannot pass against the current app; the render also instantiates `BrowserRouter`, `AuthProvider` (Supabase client) and the socket. |
| `src/test-utils.tsx` | `AllProviders` wrapper (`ChakraProvider theme={theme}`) and `customRender` exported as `render`. |
| `src/setupTests.ts` | `import "@testing-library/jest-dom"`. |

No other `*.test.*`/`*.spec.*` files exist under `src/`.

---

## 15. Uncommitted local additions (PRIMARY vs REFERENCE, `diff -w`)

| File | Change in PRIMARY only |
|---|---|
| `components/auth/ProfileForm.tsx` | imports `Switch`, `Text`; `FormValues.isPublic: boolean`; new "Public" `FormControl` with `Switch id="isPublic" {...register("isPublic")}` and `Text as='sup'` "If you make your profile public it will be visible by everyone" (`:108-112`). |
| `components/post/PostForm.tsx` | `PostFormProps` gains optional `onSubmitSuccess`, `onSubmitError`, `submitButtonText`, `isSubmitting`, `readOnly`, `showPublishToggle` (`:28-33`) — declared, not implemented. |
| `components/post/PostTable.tsx` | `<Table variant={'simple'}>` → `<Table variant="simple">` (cosmetic). |
| `components/shared/Blog.tsx` | `BlogAuthorProps.avatarUrl: string \| undefined` → `avatarUrl?: string`. |
| `components/shared/ProfileAvatar.tsx` | `url: string \| undefined` → `url?: string`. |
| `components/shared/Nav.tsx` | logged-in menu gains `<Link to="/"><c.MenuItem>Home</c.MenuItem></Link>` after the first divider (`:146`). |
| `pages/auth/Signin.tsx` | `import { socket } from "../../utils/constants"`; in `handleSignIn.onSuccess`: `socket.emit("new-user-add", values.email)` and `socket.on("get-users", users => console.log('users online', users))` (`:37, 97-100`). |
| `pages/developers/Developers.tsx` | removed imports `Heading`, `IconButton`, `BsThreeDotsVertical`; added `Badge`, `FiUserPlus`; `SimpleGrid spacing 4 → 8`; card header rewritten: `Box ml='3'` with bold `username` + green outline `Badge` "Developer" and separate `Text fontSize='sm'` e-mail (REFERENCE: `Heading size="sm"` "{username} - {authorEmail}" and `Text` "{company} - {website}" inside a `Flex flex="1" gap="4"`, plus a `BsThreeDotsVertical` "See menu" `IconButton`, now a comment at `:72`); bio fallback `' Biography'` → `''`; footer button "Follow" → "Connect" with `leftIcon={<FiUserPlus />}`. |
| `frontend/package.json` (outside `src/`) | dependency version bumps listed in the preamble (notably `@chakra-ui/react` 2→3, `react-router-dom` 6→7, `framer-motion` 6→12, `@novu/notification-center` 0.12→2.0, `chakra-react-select` 4→6, `react-icons` 3→5, TypeScript 4.9→5.9). |

No file exists only in one snapshot; all other 119 `src/` files are byte-identical modulo CRLF.
