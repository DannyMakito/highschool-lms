import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { subject_class_id } = await req.json();
    if (!subject_class_id) {
      return new Response(JSON.stringify({ error: "subject_class_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: sscData, error: sscError } = await supabase
      .from("student_subject_classes")
      .select("student_id")
      .eq("subject_class_id", subject_class_id);

    if (sscError) throw sscError;

    const studentIds = (sscData || []).map((d) => d.student_id);
    if (studentIds.length === 0) {
      return new Response(JSON.stringify({ data: [] }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const [studentsRes, profilesRes] = await Promise.all([
      supabase
        .from("students")
        .select("id, administration_number, gender, status")
        .in("id", studentIds),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", studentIds),
    ]);

    if (studentsRes.error) throw studentsRes.error;
    if (profilesRes.error) throw profilesRes.error;

    const studentsData = studentsRes.data || [];
    const profilesData = profilesRes.data || [];

    const classmates = studentsData.map((st) => {
      const profile = profilesData.find((p) => p.id === st.id);
      return {
        id: st.id,
        name: profile?.full_name || "",
        email: profile?.email || "",
        administrationNumber: st.administration_number || "",
        gender: st.gender || "",
        status: st.status || "",
      };
    });

    classmates.sort((a, b) => a.name.localeCompare(b.name));

    return new Response(JSON.stringify({ data: classmates }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});