# Parent Mobile

Expo scaffold for the parent portal.

## Run
1. Copy `.env.example` to `.env`.
2. Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. Install dependencies in this folder.
4. Run `npm run start`.
5. Scan the QR code with Expo Go on Android or iPhone.

## Structure
- `app/` contains Expo Router routes.
- `src/context/` handles auth and child data.
- `src/lib/` contains Supabase and helper utilities.
