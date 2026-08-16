# Mobile App Student Portal Architecture Guide

This document serves as an architectural blueprint and guide for implementing the Student Portal and AI Tutor on the React Native mobile application for the LMS. It aims to mirror the functionality and UI/UX of the React web application while adhering to mobile best practices.

## 1. UI & Styling Architecture

The web app uses React, TailwindCSS, and `shadcn/ui`. For the React Native mobile app:

*   **Styling Engine:** `NativeWind` is already installed (`nativewind: ^2.0.11`) and configured. This allows you to use exactly the same Tailwind utility classes as the web app (e.g., `className="flex flex-col items-center bg-slate-900"`).
*   **Component Library:** Since `shadcn/ui` is built for the web (relying on Radix UI and DOM elements), you cannot use it directly. 
    *   **Recommendation:** Use **`react-native-reusables`** (an unofficial port of shadcn/ui to React Native using NativeWind and React Native styling) OR build your own custom primitive components (Buttons, Cards, Inputs) using `NativeWind` that visually match the shadcn components used in the web app.
    *   **Icons:** Use `lucide-react-native` to exactly match the `lucide-react` icons used in the web app.

## 2. Navigation Architecture (Routing)

The web app uses `react-router-dom`. The mobile app, being an Expo project, should use **Expo Router** (file-based routing) or **React Navigation**.
Given the requirement for a bottom tab navigation for the AI Tutor, a standard Tab setup is required.

**Proposed Tab Structure:**
1.  **Dashboard** (Matches `StudentDashboard.tsx`)
2.  **Subjects** (Matches `StudentSubjects.tsx` / `StudentSubjectOutline.tsx`)
3.  **Assignments & Quizzes** (Matches `StudentAssignments.tsx` / `StudentQuizzes.tsx`)
4.  **AI Tutor** (Replaces the web's floating `TutorWidget.tsx` slide-out panel)

## 3. Database Schema & Data Fetching (Supabase)

The web app fetches data mostly via Context Providers (`SubjectsContext.tsx`, `AuthContext.tsx`) that pull data on mount. The mobile app should adopt the same strategy to keep business logic aligned, ideally abstracting the data fetching into custom hooks.

### Relevant Supabase Tables

*   **Users/Auth:** `auth.users`
*   **Content:** 
    *   `subjects` (id, title, description, grade_tier, access_type)
    *   `topics` (id, subject_id, title)
    *   `lessons` (id, topic_id, title, video_url, resource_url, etc.)
    *   `quizzes` (id, subject_id, title, questions, points_possible)
*   **Student Data:**
    *   `student_subjects` (student_id, subject_id)
    *   `student_subject_classes` (student_id, subject_class_id)
    *   `subject_classes` (id, subject_id)
*   **Progress:**
    *   `user_lesson_progress` (user_id, lesson_id, status)
    *   `quiz_submissions` (id, quiz_id, student_id, score, answers)

### Data Fetching Flow per Screen

1.  **Auth State:** On app launch, listen to Supabase Auth (`supabase.auth.onAuthStateChange`). If logged in, wrap the app in the Providers.
2.  **Dashboard (`StudentDashboard`):**
    *   Fetch `student_subjects` and `student_subject_classes` to determine which subjects belong to the logged-in user.
    *   Fetch `subjects` filtered by the assigned IDs.
    *   Fetch `user_lesson_progress` to calculate the circular progress rings (completed lessons / total lessons).
    *   Fetch `announcements` relevant to the student.
3.  **Subject View (`StudentSubjectOutline`, `LessonView`):**
    *   Fetch `topics` and `lessons` where `subject_id` matches the selected subject.
    *   When viewing a lesson, mark it as complete by upserting to `user_lesson_progress`.
4.  **Assignments & Grades:**
    *   Fetch `quizzes` and `quiz_submissions` where `student_id = user.id`.

*Recommendation for Mobile:* Consider using `@tanstack/react-query` to cache these Supabase calls. It provides better offline support and loading state management than raw `useEffect` fetches.

## 4. AI Tutor Implementation

In the web app, the AI Tutor is a floating action button that opens a side panel (`TutorWidget.tsx` and `TutorChat.tsx`). 

### Mobile Adaptation

On mobile, side-panels can feel clunky. As per the requirements, the AI Tutor must be accessible via the **Bottom Tab Navigation**.

1.  **Context:** Port the `TutorContext.tsx` directly to mobile. It handles the message state, typing indicators, and the logic to communicate with your backend AI endpoint.
2.  **Tab Screen:** Create a new screen (e.g., `app/(tabs)/tutor.tsx`).
3.  **UI Layout (`TutorChat` equivalent):**
    *   Use a `KeyboardAvoidingView` to ensure the chat input is pushed up when the keyboard opens.
    *   Use a `FlatList` for the message history (from `TutorMessages.tsx`), inverted so new messages appear at the bottom.
    *   **Styling:** Mimic the web app's deep gradient UI.
        *   Background: `bg-slate-950`
        *   AI Message Bubbles: Gradient `from-cyan-500/20 to-blue-500/20` with `border-cyan-500/30`.
        *   User Message Bubbles: `bg-slate-800`.
4.  **Integration:** The AI tutor should maintain context across tab switches. Ensure the `TutorProvider` wraps the entire Tab Navigator, so if a student switches to the Dashboard and back to the Tutor, the chat history persists.

## 5. Next Steps for Implementation

1.  Initialize Expo Router in the `mobile` folder (if not already done).
2.  Set up the `app/(tabs)` directory with the 4 main screens (Dashboard, Subjects, Assignments, Tutor).
3.  Install `lucide-react-native` and port the primary custom UI components (Button, Card, Progress) using NativeWind.
4.  Port the Supabase context providers (`AuthContext`, `SubjectsContext`) to the mobile app, ensuring React Native async storage is used for Supabase session persistence (via `react-native-url-polyfill` and `@react-native-async-storage/async-storage`).
