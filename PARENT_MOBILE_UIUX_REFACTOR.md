# Parent Mobile UI/UX Refactor Plan

## Goal

Turn the Parent Mobile app into a compact, accessible parent portal without changing Supabase APIs, navigation routes, or business rules. The experience should prioritise the information a parent needs today: learner status, work due, assessment progress, communication, and school notices.

## Guardrails

- Preserve existing Expo Router routes and Supabase queries.
- Keep all parent-safe data and authorisation rules unchanged.
- Design for small Android screens first.
- Use the existing `@expo/vector-icons` library; do not add a second icon package.
- Use an 8px spacing scale, 14?18px radii, 48px minimum touch targets, and concise empty states.
- Validate each phase on the connected Android device before beginning the next one.

## Phase 0 ? Foundation and safety

**Scope**

- Inventory repeated visual patterns, existing routes, and current data available on each screen.
- Define shared tokens for colour, spacing, type, borders, shadows, and semantic states.
- Add reusable primitives: screen container, section card, empty state, icon action, and button variants.
- Ensure auth state redirects to sign-in after logout or session expiry.

**Acceptance criteria**

- No backend query or route changes.
- All shared controls have accessible labels and 48px touch targets.
- Sign out and expired sessions land on the sign-in screen.

## Phase 1 ? App shell and navigation

**Scope**

- Refine tab bar spacing, active states, icons, and labels.
- Standardise safe-area, page header, loading, error, and scrolling behaviour.
- Replace oversized surfaces with compact cards and subtle elevation.

**Acceptance criteria**

- Tabs remain in the same order and all current routes still work.
- Screens fit comfortably on small Android devices with predictable spacing.
- Global colours communicate meaning: blue information, green progress, orange due work, red overdue, grey empty states.

## Phase 2 ? Home dashboard

**Scope**

- Build a compact learner summary: name, grade/class, current average, homework due, tests, messages, and announcements.
- Add horizontal quick actions for Homework, Results, Chat, Attendance, and Notices.
- Add a Recent Activity feed using existing assignments, grades, announcements, and conversation data.
- Remove generic explanatory paragraphs and duplicate learner surfaces.

**Acceptance criteria**

- Key learner information is visible without scrolling on a standard Android phone where data exists.
- Empty data uses concise friendly states such as ?No homework assigned ???.
- All actions navigate to their current destinations.

## Phase 3 ? Subjects and subject detail

**Scope**

- Convert subjects into compact cards showing teacher, average, work count, and upcoming assessments where available.
- Consolidate the subject detail page into performance, upcoming work, assessments, recent results, teacher details, and a message action.
- Avoid placeholder-only cards; use compact empty states when data is absent.

**Acceptance criteria**

- Each subject uses minimal vertical space.
- The detail screen has one clear hierarchy instead of multiple large placeholder sections.
- Subject links and teacher chat routing remain unchanged.

## Phase 4 ? Messages and notices

**Scope**

- Redesign conversation rows with avatar, teacher name, subject, plain-text preview, timestamp, unread treatment, and touch feedback.
- Strip HTML from message previews before rendering.
- Present notices and notification updates as a concise activity list.

**Acceptance criteria**

- Previews never render raw tags such as `<p>`.
- Conversation rows open the existing chat route.
- Empty message and notice feeds are short and clear.

## Phase 5 ? Profile and learner management

**Scope**

- Simplify Profile into Account, Linked Learners, Settings/Notifications, and Logout.
- Show the active learner once; eliminate duplicate learner cards.
- Keep logout prominent but visually distinct from standard actions.

**Acceptance criteria**

- Account details remain readable and compact.
- Linked learners retain their existing dashboard destinations.
- Sign out redirects immediately to sign-in.

## Phase 6 ? Forms, accessibility, and performance

**Scope**

- Add reusable password fields with show/hide eye buttons and accessibility labels to sign-in, registration, and future password forms.
- Improve keyboard handling, input labels, validation visibility, and focus order.
- Memoize presentation-only components where useful and optimise lists with `FlatList` for longer feeds.
- Remove unused styles and duplicated UI patterns.

**Acceptance criteria**

