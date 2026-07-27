import type { Router } from 'expo-router';

/** Navigate back when possible; otherwise replace with a sensible fallback route. */
export function safeGoBack(router: Router, fallback: string = '/(tabs)'): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as any);
  }
}
