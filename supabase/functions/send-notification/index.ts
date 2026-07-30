import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  category?: string;
}

async function sendExpoPush(token: string, title: string, body: string, data?: Record<string, string>): Promise<{ status: string; message?: string }> {
  const payload = {
    to: token,
    sound: 'default',
    title,
    body,
    data: data || {},
    _displayInForeground: true,
  };

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (result.errors) {
    return { status: 'error', message: result.errors[0]?.message || 'Unknown error' };
  }

  const receipt = result.data;
  if (receipt?.status === 'error') {
    return { status: 'error', message: receipt.message || 'Push send error' };
  }

  return { status: 'ok' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;
    if (!role || !['teacher', 'principal'].includes(role)) {
      return new Response('Forbidden – teacher or principal only', { status: 403, headers: corsHeaders });
    }

    const body: NotificationRequest = await req.json();

    if (!body.title || !body.body) {
      return new Response(JSON.stringify({ error: 'Missing title or body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetIds = body.userIds || (body.userId ? [body.userId] : []);
    if (targetIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No target user IDs provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role client to bypass RLS when querying other users' tokens
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: tokens, error: tokenError } = await admin
      .from('user_push_tokens')
      .select('token')
      .in('user_id', targetIds);

    if (tokenError) {
      console.error('Token fetch error:', tokenError);
      return new Response(JSON.stringify({ error: 'Failed to fetch push tokens' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No push tokens found for target users' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = await Promise.all(
      tokens.map((t) => sendExpoPush(t.token, body.title, body.body, body.data)),
    );

    const sent = results.filter((r) => r.status === 'ok').length;
    const errors = results.filter((r) => r.status === 'error');

    return new Response(
      JSON.stringify({
        sent,
        total: tokens.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('Send notification error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
