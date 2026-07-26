import { NextResponse } from "next/server";
import { hasSupabasePublicEnv } from "@/lib/supabase/config";

export function GET() {
  return NextResponse.json({
    ok: true,
    app: "erp-pos-cafeteria",
    supabaseConfigured: hasSupabasePublicEnv(),
    timestamp: new Date().toISOString()
  });
}
