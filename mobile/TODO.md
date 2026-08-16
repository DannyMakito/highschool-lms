# Student Discussion Screens - Implementation Progress

## Screens to Create

### 1. `mobile/app/(tabs)/subjects/[id]/discussions.tsx` (Discussion List)
- [x] Pull discussions from MessagingContext.getSubjectDiscussions()
- [x] Pinned/General/Closed sections
- [x] Search bar
- [x] Discussion cards with unread badges
- [x] Floating "+" button
- [x] Navigation to detail/create screens

### 2. `mobile/app/(tabs)/subjects/[id]/discussions/create.tsx` (Create Discussion)
- [x] Form with title, content, scheduling, settings
- [x] KeyboardAvoidingView for keyboard handling
- [x] Markdown hint placeholder
- [x] Submit → addDiscussion() → navigate back

### 3. `mobile/app/(tabs)/subjects/[id]/discussions/[discussionId].tsx` (Discussion Detail)
- [ ] Header with title, author, dates
- [ ] Subscribe toggle
- [ ] Content display
- [ ] Threaded replies with indentation
- [ ] Like/unlike on replies
- [ ] "Post before viewing" logic
- [ ] Mark as read on mount
- [ ] Real-time updates
