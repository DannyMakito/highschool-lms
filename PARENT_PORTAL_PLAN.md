# Parent Portal Plan

## Goal
Build a dedicated mobile parent portal for the LMS so parents can log in securely, switch between linked children, and view each child's school activity in a read-only experience.

This portal will be a separate mobile app that reuses the existing Supabase backend and school data model.

## Why A Separate App
- The current LMS is a web-first Vite + React app.
- Parents will mostly use phones, so the UI, session storage, and navigation should be native-mobile friendly.
- Keeping the parent portal separate reduces risk to the existing teacher, student, and principal portals.

## Recommended Tech Stack
- Expo + React Native + TypeScript
- Expo Router for navigation
- Supabase for auth, profiles, child links, and data access
- TanStack Query for server-state caching
- expo-secure-store for session persistence on iOS and Android
- NativeWind or a similar utility-first styling layer
- zod + react-hook-form for auth forms and simple settings forms

## Mobile App Folder Layout
Create a new top-level app folder named `parent-mobile/`.

```txt
parent-mobile/
  app/
    _layout.tsx
    (auth)/
      login.tsx
      forgot-pin.tsx
    (tabs)/
      home.tsx
      children.tsx
      notifications.tsx
      profile.tsx
    child/
      [childId].tsx
      [childId]/
        grades.tsx
        attendance.tsx
        assignments.tsx
        announcements.tsx
  src/
    components/
    features/
      auth/
      children/
      grades/
      attendance/
      announcements/
      notifications/
    hooks/
    lib/
      supabase.ts
      auth.ts
      storage.ts
    types/
    theme/
  assets/
  app.config.ts
  package.json
```

## Auth Workflow
### Login
1. Parent enters email and PIN.
2. App calls Supabase Auth with password-style sign-in.
3. Supabase returns a session.
4. App stores the session securely on device with `expo-secure-store`.
5. App fetches the parent profile from `profiles`.
6. App fetches linked children through a parent-child join table.
7. App routes the parent to the main dashboard.

### Session Rehydration
- On app launch, the app checks for a saved session.
- If present, it refreshes the session and loads the parent profile again.
- If the session is invalid, the app returns to the login screen.

### Role Rules
- A parent account should have its own `role = parent` in `profiles`.
- The app should not infer access from UI state alone.
- Database row-level security must enforce that the parent can only see linked children.

## Data Model
Add a clear parent relationship model in Supabase.

### New / Updated Tables
- `profiles`
  - add support for `parent`
  - store display name, email, PIN, avatar, and role
- `parent_students`
  - links one parent to one or more children
  - columns: `parent_id`, `student_id`

### Data Access Rules
- Parent can read only their own profile.
- Parent can read only children linked through `parent_students`.
- Parent can read only attendance, grades, assignments, announcements, and notifications for linked children.

## Parent Experience
### Home Screen
- Show a summary card for each linked child.
- Include attendance, recent marks, upcoming items, and alerts.
- Show a child switcher when the parent has multiple children.

### Child Detail Screen
- View one child at a time.
- Include tabs or sections for:
  - grades
  - attendance
  - assignments
  - announcements
  - notifications

### Read-Only First Release
- The first version should be read-only.
- No parent messaging, editing, or admin actions until the core portal is stable.

## Backend Changes Needed
- Extend auth role handling to include `parent`.
- Extend the user creation flow so the principal can create parent accounts.
- Add a parent-child linking flow in the admin/principal portal.
- Add RLS helpers for parent access checks.
- Add queries or views that return parent-safe child summaries.

## Deployment Plan
### Development
- Run the mobile app locally with Expo.
- Keep the parent app pointed at a Supabase dev or staging project.

### iOS And Android Beta
- Use EAS Build to produce installable builds.
- Use TestFlight for iOS beta distribution.
- Use internal Android testing or direct install links for Android beta.

### Production
- Publish iOS through the App Store.
- Publish Android through Google Play.
- Use EAS Update for small JS/UI fixes after release.

## Supabase Dashboard Checklist
Do these in the Supabase dashboard before the parent app goes live:
- Confirm Email auth is enabled for password-based sign-in.
- Keep the existing `profiles` table as the source of truth for parent accounts.
- Run the parent portal SQL migration from `supabase/migrations/011_parent_portal_support.sql`.
- Deploy the updated `create-user` edge function after adding parent support.
- Add parent-child links from the principal/admin workflow.
- Verify row-level security allows principals to manage links and parents to read only their family data.
- If you add forgot-PIN or PIN reset later, configure the redirect URL and recovery flow for the mobile app.

## Phase Breakdown
### Phase 1
- Scaffold the Expo app.
- Add login and session persistence.
- Add parent role support in the backend.

### Phase 2
- Add linked children loading.
- Add home dashboard and child selector.
- Add grades and attendance views.

### Phase 3
- Add assignments, announcements, and notifications.
- Add polish, accessibility, and offline-friendly caching.

### Phase 4
- Beta test on iOS via TestFlight.
- Fix auth edge cases and performance issues.
- Prepare App Store and Play Store release.

## Open Questions
- Should principals create parent accounts manually, or should parents be invited by SMS/email?
- Do parents need to see all linked children in one account, or should there be a switcher only?
- Should the parent portal be strictly read-only in v1?
- Which school data is visible to parents on day one: grades only, or grades plus attendance and assignments?

## Next Scaffold Step
After this plan is approved, scaffold `parent-mobile/` and wire up:
- Expo Router
- Supabase client setup
- secure session storage
- login screen
- parent dashboard shell
