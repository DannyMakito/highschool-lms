
/**
 * Diagnostic script to test Supabase connection and RLS policies
 * Run with: node diagnose-supabase.mjs
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

console.log("[DIAGNOSTIC] Starting Supabase connectivity test...");
console.log("[DIAGNOSTIC] URL:", supabaseUrl.substring(0, 20) + "...");

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log("\n=== Testing Connection ===");
    console.log("[DIAGNOSTIC] Calling supabase.auth.getUser() with anon key...");
    
    const { data, error } = await supabase.auth.getUser();
    console.log("[DIAGNOSTIC] Result:", { hasUser: !!data?.user, error: error?.message });

    console.log("\n=== Testing Profiles Table Access ===");
    
    // Test 1: Try to select with limit 1 (no RLS filtering)
    console.log("[DIAGNOSTIC] Attempting to fetch 1 profile row...");
    const start1 = Date.now();
    
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, role, full_name")
      .limit(1);
    
    const duration1 = Date.now() - start1;
    console.log(`[DIAGNOSTIC] Query completed in ${duration1}ms`);
    console.log("[DIAGNOSTIC] Result:", {
      hasData: !!profiles,
      rowCount: profiles?.length,
      error: profileError?.message,
      errorCode: profileError?.code
    });

    let singleError = null;
    
    if (profiles && profiles.length > 0) {
      console.log("[DIAGNOSTIC] ✅ Sample profile:", profiles[0]);
      
      const testId = profiles[0].id;
      console.log(`\n=== Testing Single Profile Fetch (id: ${testId}) ===`);
      
      const start2 = Date.now();
      const { data: singleProfile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", testId)
        .single();
      singleError = error;
      
      const duration2 = Date.now() - start2;
      console.log(`[DIAGNOSTIC] .single() query completed in ${duration2}ms`);
      console.log("[DIAGNOSTIC] Result:", {
        hasData: !!singleProfile,
        error: singleError?.message,
        errorCode: singleError?.code
      });
      
      if (singleProfile) {
        console.log("[DIAGNOSTIC] ✅ Single profile fetch successful:", {
          id: singleProfile.id,
          role: singleProfile.role,
          email: singleProfile.email
        });
      }
    }

    console.log("\n=== RLS Policy Check ===");
    console.log("[DIAGNOSTIC] Fetching all profile rows (checking RLS)...");
    
    const start3 = Date.now();
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    
    const duration3 = Date.now() - start3;
    console.log(`[DIAGNOSTIC] Count query completed in ${duration3}ms`);
    console.log("[DIAGNOSTIC] Result:", {
      totalProfiles: count,
      error: countError?.message,
      errorCode: countError?.code
    });

    console.log("\n=== SUMMARY ===");
    if (!profileError && !singleError && !countError) {
      console.log("✅ All tests passed! Supabase connectivity is working.");
    } else {
      console.log("❌ Some tests failed. Check errors above.");
      if (profileError?.code === "42501") {
        console.log("   → This is an RLS permission error. Check your database policies.");
      }
    }

  } catch (err) {
    console.error("❌ Test failed with exception:", err.message);
    console.error("Stack:", err.stack);
  }

  process.exit(0);
}

testConnection();
