import type { ModuleKey, UserRole } from "@/lib/domain";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PermissionProfile = {
  id: string;
  fullName: string;
  role: UserRole;
  active: boolean;
};

export type PermissionRecord = {
  profileId: string;
  module: ModuleKey;
  canAccess: boolean;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: UserRole;
  active: boolean;
};

type PermissionRow = {
  profile_id: string;
  module: ModuleKey;
  can_access: boolean;
};

export async function getPermissionAdminData() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { authorized: false, profiles: [], permissions: [] };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, profiles: [], permissions: [] };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (currentProfile?.role !== "admin" || !currentProfile.active) {
    return { authorized: false, profiles: [], permissions: [] };
  }

  const admin = createAdminClient();

  if (!admin) {
    return { authorized: false, profiles: [], permissions: [] };
  }

  const [{ data: profileRows }, { data: permissionRows }] = await Promise.all([
    admin.from("profiles").select("id, full_name, role, active").order("full_name", { ascending: true }),
    admin.from("profile_permissions").select("profile_id, module, can_access")
  ]);

  return {
    authorized: true,
    profiles: ((profileRows ?? []) as ProfileRow[]).map((profile) => ({
      id: profile.id,
      fullName: profile.full_name ?? "Usuario sin nombre",
      role: profile.role,
      active: profile.active
    })),
    permissions: ((permissionRows ?? []) as PermissionRow[]).map((permission) => ({
      profileId: permission.profile_id,
      module: permission.module,
      canAccess: permission.can_access
    }))
  };
}
