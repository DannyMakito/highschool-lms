# Branch Merge and Unified Mobile App Plan

## Purpose

This document records the branch analysis and the recommended approach for bringing the parent portal work into `main` while keeping one role-based mobile application for students and parents.

It is a planning document only. It does not approve or perform any branch deletion, merge, database migration, or code change.

## Scope

Only these branches are relevant to the plan:

| Branch | Purpose |
| --- | --- |
| `main` | Current production/integration baseline. |
| `mobile-lms` | Student mobile app work. |
| `parent-portal` | Parent portal, parent-child access, and parent mobile work. |

`mobile-app-lms` is intentionally excluded. It is an old, already-incorporated web branch and is not the student mobile app. It should not be included in the merge plan. Deleting or archiving it is a separate repository-management decision.

## Current branch positions

Based on the refreshed remote references:

| Branch | Position relative to `origin/main` | Status |
| --- | ---: | --- |
| `main` | Baseline at `7499d0e` | Current integration base. |
| `mobile-lms` | 1 behind, 0 ahead | Already merged into `main` by pull request #5. |
| `parent-portal` | 16 behind, 9 ahead | Contains unmerged work and must be integrated with the current `main`. |

### Consequence

Do **not** merge `mobile-lms` again. Its student mobile project already exists in `main` under `mobile/`.

Do **not** merge `parent-portal` directly into production without first bringing the current `main` into an integration branch. It diverged from `main` before the student mobile work was merged.

## What is already in main: student mobile

`mobile-lms` added a dedicated Expo/React Native project under `mobile/`. It includes:

- Student sign-in and dashboard.
- Bottom-tab navigation, subjects, lessons, assignments, grades, quizzes, and discussions.
- Student tutor/AI workflow.
- Push-notification registration and navigation.
- Offline video download/playback and persistent cached data.
- Student-specific Supabase functions: `get-classmates` and `send-notification`.

The app uses Expo 54 and React Native 0.81. It should be retained as the canonical mobile-project foundation.

## What parent-portal adds

The `parent-portal` branch contributes valuable parent and platform capabilities:

- Parent account and parent-child access support.
- Parent phone-login resolution.
- Parent access-key management for staff.
- Child-scoped academics, attendance, grades, homework, announcements, discussions, and messaging.
- Homework alerts for teachers and students.
- More reliable in-app user notification triggers.

It also contains two overlapping copies of a parent mobile application:

1. `parent-mobile/`: a separate Expo project using Expo 53 and React Native 0.79.
2. Root-level mobile artifacts such as `app/`, `android/`, `app.json`, and `metro.config.js`.

The root `package.json` remains the Vite web application package, so the root-level mobile artifacts are not a self-contained mobile project. The branch also contains tracked `.npm-cache` content. These duplicate mobile artifacts and cached files should not become the long-term structure in `main`.

## Expected merge overlap

Only two changed file paths overlap between current `main` and `parent-portal`.

| File | Current main contribution | Parent-portal contribution | Required resolution |
| --- | --- | --- | --- |
| `src/App.tsx` | Student tutor route and compact/mobile tutor behaviour. | Parent-access routes, teacher homework alerts, and student homework route. | Preserve both sets of imports and routes; the changes are additive. |
| `src/layouts/StudentLayout.tsx` | Student bottom navigation and the required bottom padding. | Homework alerts provider and manual refresh button. | Retain the provider, refresh button, bottom navigation, and spacing together. |

Git may identify additional contextual conflicts after the integration branch is created, but these two files are the known direct overlap points.

## Database and notification integration

There are no identical migration filenames between the branches, but the numeric migration prefixes overlap:

- `main` contains `011_push_notifications.sql`.
- `parent-portal` contains `011_parent_portal_support.sql` and further migrations through `020`.
- `parent-portal` itself contains multiple migrations with the `018` prefix.

Before any shared Supabase deployment, normalize the migration history to a single ordered set of unique migration versions. Do not casually rename migrations that may already have been applied to a shared database. First compare the deployed Supabase migration history with the files in the integration branch.

The notification systems should be connected as one flow:

```text
LMS event
  -> create an in-app user_notifications record
  -> locate the recipient's user_push_tokens
  -> send a push notification
  -> open the destination appropriate to the signed-in role
```

This combines the parent branch's in-app notification triggers with the student mobile branch's Expo push-token infrastructure, while avoiding duplicate alerts.

## Recommended path to main

1. Start an integration branch from the latest `main`.
2. Bring `parent-portal` into that integration branch.
3. Resolve `src/App.tsx` by retaining both the student tutor/mobile additions and the parent-access/homework additions.
4. Resolve `src/layouts/StudentLayout.tsx` by retaining the homework provider, refresh button, bottom navigation, and bottom spacing.
5. Audit and normalize Supabase migrations before applying them to any shared environment.
6. Retain the parent web, access-control, and parent-child database work.
7. Do not retain the duplicate parent mobile project, root-level incomplete mobile copy, or tracked npm caches as the final mobile structure.
8. Verify web, student mobile, parent mobile, parent-child RLS, and notification flows before merging the integration branch into `main`.

## One role-based mobile app

The long-term architecture should be one Expo application based on the existing `mobile/` project. Parent features should be ported into that project rather than keeping `parent-mobile/` as a second application.

```text
mobile/
  app/(auth)/              shared sign-in and account recovery
  app/(student)/           student dashboard, subjects, assignments, tutor
  app/(parent)/            child selector and child-specific dashboard
  app/(shared)/            notifications, messages, profile, settings
  src/auth/                session and role resolution
  src/data/                Supabase API and typed domain access
  src/components/          shared mobile design system
```

### Role selection

After sign-in, resolve the role from the authenticated profile or trusted claims:

```text
student -> /(student)/home
parent  -> /(parent)/children
```

Students access only their own academic data. Parents must first select an authorised child; the selected child becomes the active context for attendance, grades, homework, announcements, subjects, messages, and discussions.

```text
Parent login
  -> authorised child list
  -> selected child context
  -> child-scoped academic and communication screens
```

Shared features such as notifications, profile, messaging, and discussions should adapt their labels, queries, and available destinations to the active role and, for parents, the selected child.

### Benefits

- One mobile binary and release pipeline.
- One push-notification and authentication system.
- One shared design system and common data layer.
- Student and parent experiences remain tailored without duplicating the entire application.
- Access rules remain enforced by Supabase RLS and parent-child relationship checks.

## Verification checklist

Before approving the final merge:

- [ ] Web build and existing roles work after the `parent-portal` integration.
- [ ] Parent sign-in, child linking, child switching, and child-scoped data access work.
- [ ] Student mobile app still supports dashboard, courses, assignments, quizzes, discussions, tutor, and offline video.
- [ ] Parent role routes open correctly in the unified mobile app.
- [ ] A parent cannot access an unauthorised learner, and a student cannot access another learner's data.
- [ ] In-app and push notifications are delivered once and open the correct destination.
- [ ] Supabase migration history is ordered and compatible with the deployed environment.
- [ ] No `.npm-cache`, dependency folders, duplicate mobile projects, or generated device artifacts remain tracked unnecessarily.
