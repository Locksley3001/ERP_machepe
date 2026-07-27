import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { allModules } from "@/lib/permission-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const permissionSchema = z.object({
  profileId: z.string().uuid(),
  module: z.enum(allModules as [string, ...string[]]),
  canAccess: z.boolean()
});

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const admin = createAdminClient();

  if (!supabase || !admin) {
    return NextResponse.json({ error: "Supabase no esta configurado." }, { status: 500 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesion." }, { status: 401 });
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (currentProfile?.role !== "admin" || !currentProfile.active) {
    return NextResponse.json({ error: "Solo un administrador puede editar permisos." }, { status: 403 });
  }

  const parsed = permissionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Permiso invalido." }, { status: 400 });
  }

  const { error } = await admin.from("profile_permissions").upsert(
    {
      profile_id: parsed.data.profileId,
      module: parsed.data.module,
      can_access: parsed.data.canAccess,
      updated_at: new Date().toISOString()
    },
    { onConflict: "profile_id,module" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
