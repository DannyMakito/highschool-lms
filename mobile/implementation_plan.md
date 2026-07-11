# Replicate Web Dashboard UI & Data Fetching in Mobile App

This plan will migrate the mobile app's Dashboard (`app/(tabs)/index.tsx`) to fetch the exact same data and look exactly like the web app's `StudentDashboard.tsx`, adapted for React Native using `NativeWind` and `gluestack-ui`.

## Proposed Changes

---

### Data Contexts (Layout)

#### [MODIFY] `mobile/app/(tabs)/_layout.tsx`
- Wrap the `<Tabs>` navigator with the exact same data providers used in the web app's `StudentLayout.tsx`.
- Import data contexts directly from `src/context/` (`SubjectsProvider`, `RegistrationDataProvider`, `AssignmentsProvider`, and `MessagingProvider`).
- This ensures that all data fetching is centralized, matches the web app, and is cached correctly for the dashboard and all other tabs.

---

### UI Components

#### [NEW] `mobile/components/ui/circular-progress.tsx`
- Create a native equivalent of the web app's `CircularProgress` component.
- Use `react-native-svg` (`Svg`, `Circle`, `Text`) to draw the static progress ring.
- Map the Tailwind color classes (`text-orange-400`, `text-pink-400`, `text-green-400`) to native Hex colors for the stroke.

#### [MODIFY] Calendar usage
- Use the existing `mobile/components/ui/calendar` instead of creating a static placeholder.

---

### Dashboard Screen

#### [MODIFY] `mobile/app/(tabs)/index.tsx`
- **Data Fetching**: Remove the raw Supabase `useEffect` fetches. Import and use `useSubjects`, `useRegistrationData`, `useAssignments`, and `useAnnouncements` exactly as done in `StudentDashboard.tsx`.
- **Logic**: Replicate the memoized calculations for `lastViewed`, `assignments`, `upcomingItems`, `overallProgress`, `testProgress`, and `assignmentProgress`.
- **Top Banner ("Resume Lesson")**: Implement the prominent card showing the last accessed lesson/subject with the `Progress` bar and "Start Learning" button.
- **Overview Cards**: Implement the 3-column (stacked on mobile) layout for Lessons, Files (Assignments), and Tests using the new `CircularProgress` component.
- **My Subjects**: Implement the list of subjects, displaying the colorful initial icon, subject name, progress bar, and completed/total lessons ratio.
- **Sidebar Elements**:
  - Implement the native calendar using `mobile/components/ui/calendar`.
  - Implement the "Upcoming" list showing assignments and quizzes with their specific dates and pill badges.
  - Implement the "School Alerts" dark gradient card for announcements.
- **Styling**: Replace HTML tags (`div`, `span`, `p`, `h3`) with React Native tags (`View`, `Text`, `TouchableOpacity`, `ScrollView`) while preserving the exact `className` strings so NativeWind can apply identical styling.
- **Animations**: Stick to static components for the first pass to ensure layout stability; animations will not be included in this initial replication.
