import { redirect } from "next/navigation";
import type { ModuleKey } from "@/lib/domain";
import { allModules, defaultEmployeeModules, firstAllowedPath, isModuleKey } from "@/lib/permission-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export { defaultEmployeeModules, firstAllowedPath, isModuleKey, moduleFromPath, modulePath } from "@/lib/permission-utils";

export type AccessContext = {
  authenticated: boolean;
  allowedModules: ModuleKey[];
  role: "admin" | "employee" | null;
};

export async function getAccessContext(): Promise<AccessContext> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { authenticated: false, allowedModules: allModules, role: null };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { authenticated: false, allowedModules: [], role: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.active) {
    return { authenticated: true, allowedModules: [], role: null };
  }

  if (profile.role === "admin") {
    return { authenticated: true, allowedModules: allModules, role: "admin" };
  }

  const { data: permissions } = await supabase
    .from("profile_permissions")
    .select("module")
    .eq("profile_id", user.id)
    .eq("can_access", true);

  const allowedModules = (permissions ?? [])
    .map((permission) => String(permission.module))
    .filter(isModuleKey);

  return {
    authenticated: true,
    allowedModules: allowedModules.length ? allowedModules : defaultEmployeeModules,
    role: "employee"
  };
}

export async function requireModuleAccess(module: ModuleKey) {
  const access = await getAccessContext();

  if (!access.authenticated) {
    redirect("/login");
  }

  if (!access.allowedModules.includes(module)) {
    redirect(firstAllowedPath(access.allowedModules));
  }

  return access;
}
