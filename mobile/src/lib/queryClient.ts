import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Create a QueryClient instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 10 minutes before data is considered stale. Prevents flickering on screen switch.
      staleTime: 1000 * 60 * 10,
      // 24 hours before data is garbage collected.
      gcTime: 1000 * 60 * 60 * 24,
      // Retry failed requests 2 times before showing an error
      retry: 2,
    },
  },
});

// 2. Create the AsyncStorage persister
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});
