import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

const DEFAULT_REQUEST_TIMEOUT_MS = 20000;

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);

  // If caller already provided a signal, forward abort to ours
  const externalSignal = init?.signal;
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    fetch: fetchWithTimeout
  }
});

// Create a channel for connection monitoring
const connectionChannel = supabase.channel('connection-monitor');

// Set up connection monitoring
connectionChannel
  .on('system', { event: 'disconnected' }, () => {
    console.log('WebSocket disconnected. Attempting to reconnect...');
  })
  .on('system', { event: 'connected' }, () => {
    console.log('WebSocket reconnected successfully');
  })
  .subscribe();

export default supabase;