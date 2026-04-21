# Analytics & Tracking Implementation Guide

This guide provides step-by-step instructions to integrate analytics tracking into your high school LMS frontend.

## Overview

You now have **4 production-ready React hooks** for tracking 12 distinct events:

| Hook | Purpose | Events |
|------|---------|--------|
| `useAnalytics` | Session tracking | Login, Logout (explicit/tab close/app background/inactivity) |
| `useEngagementTracking` | Content interactions | Lesson viewed, Video watched, Assignment viewed/submitted |
| `useTeacherTracking` | Teacher activities | Lesson uploaded, Assignment created, Feedback given |
| `useSystemTracking` | Performance & errors | Error reporting, Page load time |
| `useFeedbackTracking` | User feedback | Bug reports, Feature requests, General feedback |

**Total events tracked**: 12  
**Database tables**: 5 (user_sessions, content_interactions, teacher_activities, system_performance, feedback)

---

## ✅ Hooks Setup (Already Done)

All hooks are located in `/src/hooks/`:

```
src/hooks/
├── useAnalytics.ts              # Session management
├── useEngagementTracking.ts     # Content engagement
├── useTeacherTracking.ts        # Teacher activities
├── useSystemTracking.ts         # Performance/errors
└── useFeedbackTracking.ts       # User feedback
```

---

## 1. Session Tracking (Adoption Metrics)

### `useAnalytics` Hook

**Handles automatically:**
- ✅ Login on auth success
- ✅ Logout on explicit sign-out
- ✅ Logout on tab/window close
- ✅ Logout on app background (Visibility API)
- ✅ Logout on inactivity timeout (15 minutes default)

### Integration in App.tsx

```tsx
import { useAnalytics } from '@/hooks/useAnalytics';

export function App() {
  const { trackLogin, trackLogout, resetInactivityTimer } = useAnalytics();
  
  // Hook automatically initializes on user login
  // No manual calls needed – it handles all logout scenarios
  
  return (
    <div className="app">
      {/* Your app */}
    </div>
  );
}
```

### Integration in Sign-Out Button

```tsx
// components/nav-user.tsx (or wherever your logout button is)
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAnalytics } from '@/hooks/useAnalytics';

export function NavUser() {
  const navigate = useNavigate();
  const { trackLogout } = useAnalytics();

  const handleSignOut = async () => {
    await trackLogout('explicit_logout');
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <button onClick={handleSignOut}>
      Sign Out
    </button>
  );
}
```

### Database Payload (Auto Inserted)

```json
{
  "user_id": "auth_user_uuid",
  "login_time": "2026-04-21T10:15:00.000Z",
  "logout_time": "2026-04-21T11:00:00.000Z",
  "session_duration": "2700 seconds"
}
```

### Query Sessions for Dashboard

```sql
-- Get daily active users (DAU)
SELECT 
  DATE(login_time) as date,
  COUNT(DISTINCT user_id) as daily_active_users
FROM public.user_sessions
WHERE login_time >= NOW() - INTERVAL '7 days'
GROUP BY DATE(login_time)
ORDER BY date DESC;

-- Get average session duration per user
SELECT 
  user_id,
  COUNT(*) as total_sessions,
  AVG(EXTRACT(EPOCH FROM session_duration)) as avg_duration_seconds
FROM public.user_sessions
WHERE logout_time IS NOT NULL
GROUP BY user_id
ORDER BY avg_duration_seconds DESC;
```

---

## 2. Content Engagement (Lesson/Video/Assignment Tracking)

### `useEngagementTracking` Hook

**Provides 4 tracking functions:**
- `trackLessonViewed(lessonId)`
- `trackVideoWatched(videoStoragePath, durationSeconds)`
- `trackAssignmentViewed(assignmentId)`
- `trackAssignmentSubmitted(assignmentId)`

### Integration in Lesson Component

```tsx
// pages/LessonDetail.tsx
import { useEngagementTracking } from '@/hooks/useEngagementTracking';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';

export function LessonDetail() {
  const { lessonId } = useParams();
  const { trackLessonViewed } = useEngagementTracking();

  useEffect(() => {
    // Track when lesson is opened
    if (lessonId) {
      trackLessonViewed(lessonId);
    }
  }, [lessonId, trackLessonViewed]);

  return (
    <div className="lesson">
      <h1>Lesson Content</h1>
      {/* Lesson content here */}
    </div>
  );
}
```

### Integration in Video Player Component

```tsx
// components/VideoPlayer.tsx
import { useEngagementTracking } from '@/hooks/useEngagementTracking';

export function VideoPlayer({ videoStoragePath, videoDuration }) {
  const { trackVideoWatched } = useEngagementTracking();

  const handleVideoEnd = () => {
    // Track video completion based on storage path
    trackVideoWatched(videoStoragePath, Math.floor(videoDuration));
  };

  return (
    <video 
      src={videoStoragePath} 
      onEnded={handleVideoEnd}
      controls
    >
      Your browser does not support the video tag.
    </video>
  );
}
```

### Integration in Assignment Component

```tsx
// components/AssignmentCard.tsx
import { useEngagementTracking } from '@/hooks/useEngagementTracking';

export function AssignmentCard({ assignment }) {
  const { trackAssignmentViewed, trackAssignmentSubmitted } = 
    useEngagementTracking();

  useEffect(() => {
    // Track when student opens assignment
    trackAssignmentViewed(assignment.id);
  }, [assignment.id, trackAssignmentViewed]);

  const handleSubmit = async (submission) => {
    // Submit logic here
    await submitAssignment(submission);
    
    // Track submission
    trackAssignmentSubmitted(assignment.id);
  };

  return (
    <div className="assignment">
      <h3>{assignment.title}</h3>
      <button onClick={() => handleSubmit()}>Submit</button>
    </div>
  );
}
```

### Database Payload (Auto Inserted)

```json
{
  "user_id": "auth_user_uuid",
  "content_type": "lesson|video|assignment",
  "content_id": "lesson_uuid | video_storage_path | assignment_uuid",
  "action": "viewed|watched|submitted",
  "duration": "95 seconds",
  "timestamp": "2026-04-21T10:22:00.000Z"
}
```

### Query Engagement Metrics

```sql
-- Get lesson views per student
SELECT 
  user_id,
  content_id as lesson_id,
  COUNT(*) as views,
  MAX(timestamp) as last_viewed
FROM public.content_interactions
WHERE content_type = 'lesson'
GROUP BY user_id, content_id
ORDER BY views DESC;

-- Get assignment submission rate
SELECT 
  content_id as assignment_id,
  COUNT(DISTINCT CASE WHEN action = 'viewed' THEN user_id END) as views,
  COUNT(DISTINCT CASE WHEN action = 'submitted' THEN user_id END) as submissions,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN action = 'submitted' THEN user_id END) / 
    COUNT(DISTINCT CASE WHEN action = 'viewed' THEN user_id END),
    2
  ) as submission_rate_percent
FROM public.content_interactions
WHERE content_type = 'assignment'
GROUP BY content_id;

-- Get video watch duration (avg per video)
SELECT 
  content_id as video_path,
  COUNT(*) as watches,
  AVG(EXTRACT(EPOCH FROM duration)) as avg_watch_time_seconds
FROM public.content_interactions
WHERE content_type = 'video'
GROUP BY content_id
ORDER BY avg_watch_time_seconds DESC;
```

---

## 3. Teacher Activity Tracking (Driver Metrics)

### `useTeacherTracking` Hook

**Provides 3 tracking functions:**
- `trackLessonUploaded(lessonId)`
- `trackAssignmentCreated(assignmentId)`
- `trackFeedbackGiven(assignmentId)`

### Integration in Lesson Upload

```tsx
// components/LessonUploader.tsx
import { useTeacherTracking } from '@/hooks/useTeacherTracking';

export function LessonUploader() {
  const { trackLessonUploaded } = useTeacherTracking();

  const handleLessonCreate = async (lessonData) => {
    const { data, error } = await supabase
      .from('lessons')
      .insert(lessonData)
      .select()
      .single();

    if (!error && data) {
      // Track lesson upload
      trackLessonUploaded(data.id);
    }
  };

  return (
    <form onSubmit={handleLessonCreate}>
      {/* Form fields */}
    </form>
  );
}
```

### Integration in Assignment Creation

```tsx
// components/AssignmentCreator.tsx
import { useTeacherTracking } from '@/hooks/useTeacherTracking';

export function AssignmentCreator() {
  const { trackAssignmentCreated } = useTeacherTracking();

  const handleAssignmentCreate = async (assignmentData) => {
    const { data, error } = await supabase
      .from('assignments')
      .insert(assignmentData)
      .select()
      .single();

    if (!error && data) {
      // Track assignment creation
      trackAssignmentCreated(data.id);
    }
  };

  return (
    <form onSubmit={handleAssignmentCreate}>
      {/* Form fields */}
    </form>
  );
}
```

### Integration in Feedback Submission

```tsx
// components/FeedbackForm.tsx
import { useTeacherTracking } from '@/hooks/useTeacherTracking';

export function FeedbackForm({ assignmentId }) {
  const { trackFeedbackGiven } = useTeacherTracking();

  const handleFeedbackSubmit = async (feedback) => {
    // Save feedback to DB
    await supabase
      .from('assignment_submissions')
      .update({ feedback, graded_at: new Date() })
      .eq('assignment_id', assignmentId);

    // Track feedback given
    trackFeedbackGiven(assignmentId);
  };

  return (
    <form onSubmit={handleFeedbackSubmit}>
      {/* Feedback fields */}
    </form>
  );
}
```

### Database Payload (Auto Inserted)

```json
{
  "teacher_id": "auth_user_uuid",
  "action": "lesson_uploaded|assignment_created|feedback_given",
  "content_id": "lesson_uuid | assignment_uuid",
  "timestamp": "2026-04-21T09:30:00.000Z"
}
```

### Query Teacher Activity

```sql
-- Get active teachers (uploading lessons/assignments weekly)
SELECT 
  teacher_id,
  WEEK(timestamp) as week,
  COUNT(DISTINCT CASE WHEN action = 'lesson_uploaded' THEN action END) as lessons,
  COUNT(DISTINCT CASE WHEN action = 'assignment_created' THEN action END) as assignments,
  COUNT(DISTINCT CASE WHEN action = 'feedback_given' THEN action END) as feedback_given
FROM public.teacher_activities
WHERE timestamp >= NOW() - INTERVAL '4 weeks'
GROUP BY teacher_id, WEEK(timestamp)
ORDER BY teacher_id, week DESC;

-- Get teacher with most activity
SELECT 
  teacher_id,
  COUNT(*) as total_actions
FROM public.teacher_activities
GROUP BY teacher_id
ORDER BY total_actions DESC
LIMIT 10;
```

---

## 4. System Performance & Error Tracking

### `useSystemTracking` Hook

**Automatically handles:**
- ✅ Global error tracking (uncaught exceptions)
- ✅ Unhandled promise rejections
- ✅ Page load time measurement via Navigation Timing API

**Manual functions:**
- `trackError(error, context?)`
- `trackPageLoadTime(page, loadTimeMs)`

### Integration in Root App Component

```tsx
// src/App.tsx
import { useSystemTracking } from '@/hooks/useSystemTracking';

export function App() {
  const { trackError, trackPageLoadTime } = useSystemTracking();

  // Hook automatically:
  // 1. Listens for global errors
  // 2. Captures unhandled promise rejections
  // 3. Measures page load times
  // 4. Sends to Supabase

  return (
    <div className="app">
      {/* Your app */}
    </div>
  );
}
```

### Manual Error Tracking in Components

```tsx
// In any component where you handle errors
import { useSystemTracking } from '@/hooks/useSystemTracking';

export function DataFetcher() {
  const { trackError } = useSystemTracking();

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
    } catch (error) {
      // Manually track errors if you want custom context
      trackError(error, { 
        page: '/dashboard',
        userAgent: navigator.userAgent 
      });
    }
  };

  return <button onClick={fetchData}>Fetch Data</button>;
}
```

### Database Payload (Auto Inserted)

```json
{
  "event_type": "error|load_time|downtime",
  "details": {
    "page": "/lessons/123",
    "message": "TypeError: Cannot read property 'name' of undefined",
    "stack": "at fetchData (component.tsx:45)",
    "userAgent": "Mozilla/5.0...",
    "load_time_ms": 1480,
    "timestamp": "2026-04-21T10:55:00.000Z"
  },
  "timestamp": "2026-04-21T10:55:00.000Z"
}
```

### Query System Health

```sql
-- Get error rate by page
SELECT 
  details->>'page' as page,
  COUNT(*) as error_count,
  DATE(timestamp) as date
FROM public.system_performance
WHERE event_type = 'error'
GROUP BY page, DATE(timestamp)
ORDER BY error_count DESC;

-- Get average page load times
SELECT 
  details->>'page' as page,
  AVG((details->>'load_time_ms')::int) as avg_load_ms,
  MAX((details->>'load_time_ms')::int) as max_load_ms
FROM public.system_performance
WHERE event_type = 'load_time'
GROUP BY page
ORDER BY avg_load_ms DESC;
```

---

## 5. User Feedback Tracking

### `useFeedbackTracking` Hook

**Provides 1 tracking function:**
- `submitFeedback(type: 'bug' | 'feature' | 'general', message: string)`

### Integration in Feedback Modal

```tsx
// components/FeedbackModal.tsx
import { useState } from 'react';
import { useFeedbackTracking } from '@/hooks/useFeedbackTracking';

export function FeedbackModal({ isOpen, onClose }) {
  const [feedbackType, setFeedbackType] = useState('general');
  const [message, setMessage] = useState('');
  const { submitFeedback } = useFeedbackTracking();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Send feedback
    await submitFeedback(feedbackType as any, message);
    
    setMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <form onSubmit={handleSubmit}>
        <div>
          <label>Feedback Type:</label>
          <select 
            value={feedbackType} 
            onChange={(e) => setFeedbackType(e.target.value)}
          >
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
            <option value="general">General Feedback</option>
          </select>
        </div>

        <div>
          <label>Message:</label>
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>

        <button type="submit">Send Feedback</button>
      </form>
    </div>
  );
}
```

### Place Feedback Button in App

```tsx
// App.tsx or in your layout
import { useState } from 'react';
import { FeedbackModal } from '@/components/FeedbackModal';

export function App() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="app">
      {/* Your app content */}
      
      <button 
        className="feedback-button"
        onClick={() => setFeedbackOpen(true)}
      >
        💬 Send Feedback
      </button>

      <FeedbackModal 
        isOpen={feedbackOpen} 
        onClose={() => setFeedbackOpen(false)} 
      />
    </div>
  );
}
```

### Database Payload (Auto Inserted)

```json
{
  "user_id": "auth_user_uuid",
  "type": "bug|feature|general",
  "message": "The video player crashed when I tried to pause",
  "timestamp": "2026-04-21T12:05:00.000Z"
}
```

### Query Feedback Analytics

```sql
-- Get feedback by type
SELECT 
  type,
  COUNT(*) as count
FROM public.feedback
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY type;

-- Get all bug reports
SELECT 
  user_id,
  message,
  timestamp
FROM public.feedback
WHERE type = 'bug'
ORDER BY timestamp DESC;
```

---

## 6. Complete Implementation Checklist

### Phase 1: Session Tracking (Week 1)
- [ ] Verify `useAnalytics` is initialized in `App.tsx`
- [ ] Call `trackLogout('explicit_logout')` in sign-out button
- [ ] Test login/logout flows in browser DevTools
- [ ] Query `user_sessions` table to confirm inserts

### Phase 2: Engagement Tracking (Week 1-2)
- [ ] Add `trackLessonViewed()` in lesson detail components
- [ ] Add `trackVideoWatched()` in video player component
- [ ] Add `trackAssignmentViewed()` in assignment list/detail
- [ ] Add `trackAssignmentSubmitted()` in submission handler
- [ ] Test with student flow

### Phase 3: Teacher Activity (Week 2)
- [ ] Add `trackLessonUploaded()` in lesson creation
- [ ] Add `trackAssignmentCreated()` in assignment creation
- [ ] Add `trackFeedbackGiven()` in grade/feedback submission
- [ ] Test with teacher flow

### Phase 4: System Tracking (Week 2)
- [ ] Verify `useSystemTracking` initializes globally
- [ ] Check browser console for error tracking
- [ ] Monitor page load times in `system_performance` table
- [ ] Create dashboard query for system health

### Phase 5: Feedback (Week 3)
- [ ] Create feedback modal component
- [ ] Place feedback button in app layout
- [ ] Test feedback submission
- [ ] Set up dashboard to display feedback

### Phase 6: Dashboard (Week 3-4)
- [ ] Create admin dashboard page
- [ ] Add charts for DAU, engagement rate, teacher activity
- [ ] Add real-time system health indicators
- [ ] Create reports (weekly, monthly)

---

## 7. Sample Dashboard Queries

### Adoption Dashboard

```sql
-- Last 7 days of DAU
SELECT 
  DATE(login_time) as date,
  COUNT(DISTINCT user_id) as dau,
  COUNT(DISTINCT user_id)::float / 
    (SELECT COUNT(DISTINCT id) FROM public.profiles WHERE role = 'student') * 100 
  as adoption_percent
FROM public.user_sessions
WHERE login_time >= NOW() - INTERVAL '7 days'
GROUP BY DATE(login_time)
ORDER BY date DESC;
```

### Engagement Dashboard

```sql
-- Weekly engagement rate
SELECT 
  DATE_TRUNC('week', timestamp) as week,
  COUNT(DISTINCT user_id) as active_students,
  COUNT(DISTINCT CASE WHEN action IN ('submitted', 'watched') THEN user_id END) as engaged_count,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN action IN ('submitted', 'watched') THEN user_id END) /
    COUNT(DISTINCT user_id),
    2
  ) as engagement_rate_percent
FROM public.content_interactions
WHERE timestamp >= NOW() - INTERVAL '4 weeks'
GROUP BY DATE_TRUNC('week', timestamp)
ORDER BY week DESC;
```

### Teacher Activity Dashboard

```sql
-- Teachers who contributed this week
SELECT 
  p.full_name,
  ta.teacher_id,
  COUNT(DISTINCT CASE WHEN ta.action = 'lesson_uploaded' THEN 1 END) as lessons,
  COUNT(DISTINCT CASE WHEN ta.action = 'assignment_created' THEN 1 END) as assignments,
  COUNT(DISTINCT CASE WHEN ta.action = 'feedback_given' THEN 1 END) as feedback
FROM public.teacher_activities ta
JOIN public.profiles p ON p.id = ta.teacher_id
WHERE ta.timestamp >= DATE_TRUNC('week', NOW())
GROUP BY p.full_name, ta.teacher_id
ORDER BY (lessons + assignments + feedback) DESC;
```

---

## 8. Troubleshooting

### Events Not Being Inserted

1. **Check RLS Policies**: Ensure user's role is correct in `profiles` table
   ```sql
   SELECT id, email, role FROM public.profiles WHERE id = 'user_uuid';
   ```

2. **Verify Supabase Client**: Ensure `supabase` client is properly initialized
   ```tsx
   import { supabase } from '@/lib/supabase';
   console.log('Supabase client:', supabase);
   ```

3. **Check Browser Console**: Look for errors in DevTools
   ```
   [Analytics] Session started: 550e8400-e29b-41d4-a716-446655440000
   [Analytics] Lesson viewed: abc123
   ```

4. **Verify Auth Session**: Ensure user is authenticated
   ```tsx
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Auth user:', user);
   ```

### High Inactivity Timeouts

If you want to change the inactivity timeout (currently 15 minutes):

Edit `useAnalytics.ts`:
```tsx
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
```

### Videos Not Tracked

Ensure you're passing the storage path correctly:
```tsx
// ✅ Correct
trackVideoWatched('lessons/lesson-456/video.mp4', 120);

// ❌ Wrong
trackVideoWatched('uuid-of-video', 120);
```

---

## 9. Performance Considerations

- **Batch inserts**: If tracking high-frequency events, consider batching inserts
- **Offline support**: Add queue logic if users go offline (use localStorage)
- **Rate limiting**: Avoid tracking same event twice (debounce important events)

---

## Next Steps

1. ✅ Hooks are created and ready to use
2. 📋 Integrate hooks into your existing components (Phase 1-5)
3. 📊 Build admin dashboard to visualize metrics
4. 🎯 Set success criteria and track pilot metrics

**Questions?** Check the hook implementations directly for detailed comments and examples.
