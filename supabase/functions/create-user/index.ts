import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type UserBody = {
  role: 'teacher' | 'student';
  name: string;
  email: string;
  pin: string;
  // Teacher only
  subjects?: string[];
  // Student only
  administrationNumber?: string;
  admissionYear?: string;
  gender?: string;
  gradeId?: string;
  registerClassId?: string;
  status?: string;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "*";
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    const apiKey = req.headers.get("apikey");
    const jwt = authHeader || apiKey;

    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing authentication token" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client for privileged ops
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Create a regular client to verify the user's identity
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${jwt}` } }
    });

    const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser();
    
    if (callerErr || !caller) {
      console.error("Auth Error:", callerErr);
      return new Response(JSON.stringify({ error: "Invalid or expired token", details: callerErr?.message }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const { data: callerProfile, error: profileFetchErr } = await admin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .maybeSingle(); // Use maybeSingle to avoid 406 if missing

    if (profileFetchErr) {
      console.error("Profile Fetch Error:", profileFetchErr);
      return new Response(JSON.stringify({ error: "Failed to fetch caller profile", details: profileFetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    if (!callerProfile || callerProfile.role !== "principal") {
      console.error("Forbidden access attempt by:", caller.id, "Role:", callerProfile?.role);
      return new Response(JSON.stringify({ error: "Forbidden: Principal access only", role: callerProfile?.role }), {
        status: 403,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const body = (await req.json()) as UserBody;
    console.log("Request Body:", JSON.stringify(body));

    if (!body?.role || !body?.name?.trim() || !body?.email?.trim() || !body?.pin) {
      console.error("Missing fields in body");
      return new Response(JSON.stringify({ error: "Missing required fields", body }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Step 1: Create Supabase Auth User
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.pin,
      email_confirm: true,
      user_metadata: { full_name: body.name, role: body.role },
    });

    if (createErr || !created?.user) {
      console.error("Auth Create Error:", createErr);
      return new Response(JSON.stringify({ error: "Auth creation failed", details: createErr?.message }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const userId = created.user.id;
    console.log("Auth User Created:", userId);

    // Step 2: Create Profile Record
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .insert({
        id: userId,
        full_name: body.name,
        email: body.email,
        role: body.role,
        pin: body.pin,
      })
      .select("id, created_at")
      .maybeSingle();

    if (profileErr) {
      console.error("Profile Insert Error:", profileErr);
      await admin.auth.admin.deleteUser(userId); // Rollback
      return new Response(JSON.stringify({ error: "Profile insertion failed", details: profileErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    console.log("Profile Created for:", userId);

    // Step 3: Role-specific Data Updates
    if (body.role === 'teacher') {
      const subjects = body.subjects || [];
      if (subjects.length > 0) {
        const { error: tsError } = await admin.from("teacher_subjects").insert(
          subjects.map((subjectId) => ({ teacher_id: userId, subject_id: subjectId })),
        );
        if (tsError) {
          console.error("Teacher Subjects Insert Error:", tsError);
          // Rollback
          await admin.auth.admin.deleteUser(userId);
          await admin.from("profiles").delete().eq("id", userId);
          return new Response(JSON.stringify({ error: "Teacher subjects assignment failed", details: tsError.message }), {
            status: 400,
            headers: { ...corsHeaders, "content-type": "application/json" },
          });
        }
      }
    } else if (body.role === 'student') {
      const { error: studentErr } = await admin.from("students").insert({
        id: userId,
        administration_number: body.administrationNumber,
        admission_year: body.admissionYear,
        gender: body.gender,
        grade_id: body.gradeId,
        register_class_id: body.registerClassId,
        status: body.status || 'active'
      });

      if (studentErr) {
        console.error("Student Record Insert Error:", studentErr);
        // Rollback
        await admin.auth.admin.deleteUser(userId);
        await admin.from("profiles").delete().eq("id", userId);
        return new Response(JSON.stringify({ error: "Student record insertion failed", details: studentErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ 
      id: userId, 
      created_at: profile?.created_at,
      pin: body.pin 
    }), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
