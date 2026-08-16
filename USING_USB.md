# USB Testing

Use this flow on a physical Android or iPhone:

1. Copy `.env.example` to `.env` inside `parent-mobile/`.
2. Fill in your Supabase URL and anon key.
3. Run `npx expo install expo-dev-client expo-linking expo-constants expo-status-bar`.
4. Install dependencies in `parent-mobile/`.
5. Build and install the dev client with `npm run android`.
6. Start Metro with `npm run start`.
7. For Android over USB, run `adb reverse tcp:8081 tcp:8081` in another terminal if needed.

Notes:
- This setup now uses a real native dev build, which is closer to the RN flow you’re used to.
- On Windows, iPhone USB testing is still not the smooth path; use a dev build/TestFlight later.
