import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { Router } from 'expo-router';

// ---------------------------------------------------------------------------
// Lazy accessor — expo-notifications is required on-demand to avoid the
// module-level side effect (DevicePushTokenAutoRegistration) that logs errors
// on Android Expo Go (SDK 53+). Remote push requires a development build.
// ---------------------------------------------------------------------------
type ExpoNotifications = typeof import('expo-notifications');

let _N: ExpoNotifications | null = null;
let _notificationsUnavailable = false;

function notificationsSupported(): boolean {
  if (_notificationsUnavailable) return false;
  // Android Expo Go removed remote push; requiring the module still logs ERROR.
  if (Platform.OS === 'android' && isRunningInExpoGo()) {
    _notificationsUnavailable = true;
    return false;
  }
  return true;
}

function getN(): ExpoNotifications | null {
  if (!notificationsSupported()) return null;
  if (_N) return _N;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _N = require('expo-notifications') as ExpoNotifications;
    return _N;
  } catch {
    _notificationsUnavailable = true;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Call this once from the root layout AFTER the app has mounted.
// Safe to call multiple times (no-op after first call).
// ---------------------------------------------------------------------------
let _handlerSet = false;
export function initNotifications(): void {
  if (_handlerSet) return;
  const N = getN();
  if (!N) return;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    _handlerSet = true;
  } catch {
    // Expo Go — silently ignore
  }
}

function getExpoProjectId(): string | undefined {
  const id = Constants.expoConfig?.extra?.eas?.projectId;
  if (!id || id === 'YOUR_EAS_PROJECT_ID' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return undefined;
  }
  return id;
}

export type NotificationCategory = 'assignment' | 'quiz' | 'announcement' | 'discussion' | 'grading' | 'lesson';

export interface PushNotificationPayload {
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push] Must use a physical device for push notifications');
    return null;
  }

  const N = getN();
  if (!N) return null;

  try {
    const { status: existingStatus } = await N.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await N.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission not granted');
      return null;
    }

    const projectId = getExpoProjectId();
    if (!projectId) {
      console.warn('[Push] No Expo project ID configured. Push notifications require an EAS project. Create one at https://expo.dev and add the projectId to app.json -> extra.eas.projectId');
      return null;
    }

    const { data: token } = await N.getExpoPushTokenAsync({ projectId });

    if (!token) {
      console.log('[Push] No token returned');
      return null;
    }

    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

    const { error } = await supabase.from('user_push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    );

    if (error) {
      console.error('[Push] Failed to save token:', error);
      return null;
    }

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', {
        name: 'default',
        importance: N.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
      });
    }

    return token;
  } catch (error) {
    console.error('[Push] Token registration failed:', error);
    return null;
  }
}

export async function unregisterPushTokens(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_push_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[Push] Failed to unregister tokens:', error);
  }
}

const handledNotificationIds = new Set<string>();

function navigateFromNotificationData(
  router: Router,
  data: Record<string, string> | undefined,
  replace: boolean,
): void {
  if (!data?.screen) return;

  const params = data.params ? JSON.parse(data.params) : {};
  const go = (href: string) => {
    if (replace) {
      router.replace(href as any);
    } else {
      router.push(href as any);
    }
  };

  switch (data.screen) {
    case 'assignments':
      if (params.assignmentId) {
        go(`/assignments/${params.assignmentId}`);
      } else {
        go('/(tabs)/assignments');
      }
      break;

    case 'quiz':
      if (params.quizId) {
        go(`/quiz/${params.quizId}`);
      } else {
        go('/quiz');
      }
      break;

    case 'announcements':
      go('/announcements');
      break;

    case 'discussions':
      go('/discussions');
      break;

    case 'discussion':
      if (params.subjectId && params.discussionId) {
        go(`/subjects/${params.subjectId}/discussions/${params.discussionId}`);
      } else if (params.subjectId) {
        go(`/subjects/${params.subjectId}/discussions`);
      } else {
        go('/discussions');
      }
      break;

    case 'grades':
      go('/grades');
      break;

    case 'subject':
      if (params.subjectId) {
        go(`/subjects/${params.subjectId}/outline`);
      }
      break;

    case 'lesson':
      if (params.subjectId && params.lessonId) {
        go(`/subjects/${params.subjectId}/lessons/${params.lessonId}`);
      }
      break;

    case 'tabs':
    default:
      go('/(tabs)');
      break;
  }
}

function isRecentNotificationResponse(
  response: { notification: { date?: number } },
  maxAgeMs = 60_000,
): boolean {
  const date = response.notification.date;
  if (date == null) return false;
  const timestamp = date > 1e12 ? date : date * 1000;
  return Date.now() - timestamp < maxAgeMs;
}

function handleNotificationResponse(
  router: Router,
  response: { notification: { request: { identifier: string; content: { data?: Record<string, unknown> } }; date?: number } },
  replace: boolean,
): void {
  const id = response.notification.request.identifier;
  if (handledNotificationIds.has(id)) return;
  if (replace && !isRecentNotificationResponse(response)) return;
  handledNotificationIds.add(id);

  const data = response.notification.request.content.data as Record<string, string> | undefined;
  navigateFromNotificationData(router, data, replace);
}

export function addNotificationTapHandler(router: Router): () => void {
  const N = getN();
  if (!N) return () => {};

  try {
    // Cold start: app opened from a notification tap — replace so Back has a fallback.
    void N.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationResponse(router, response, true);
      }
    });

    const subscription = N.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(router, response, false);
    });

    return () => subscription.remove();
  } catch {
    return () => {};
  }
}

export function buildNotificationPayload(
  category: NotificationCategory,
  title: string,
  body: string,
  screen?: string,
  params?: Record<string, string>,
): PushNotificationPayload {
  return {
    category,
    title,
    body,
    data: {
      screen: screen || 'tabs',
      ...(params ? { params: JSON.stringify(params) } : {}),
    },
  };
}

/**
 * Schedule an immediate local notification. Works while the app is open or
 * in the background; does NOT require an EAS push token.
 * Safe to call in Expo Go — fails silently if notifications are unavailable.
 */
export async function scheduleLocalNotification(
  payload: PushNotificationPayload,
): Promise<void> {
  const N = getN();
  if (!N) return;
  try {
    await N.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        sound: true,
      },
      trigger: null, // fire immediately
    });
  } catch {
    // Expo Go or permissions not granted — silently ignore
  }
}
