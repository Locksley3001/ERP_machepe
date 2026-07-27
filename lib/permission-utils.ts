import type { ModuleKey } from "@/lib/domain";
import { navigationItems } from "@/lib/navigation";

export const defaultEmployeeModules: ModuleKey[] = ["pos"];

export const allModules = navigationItems.map((item) => item.key);

export function modulePath(module: ModuleKey) {
  return module === "dashboard" ? "/" : `/${module}`;
}

export function firstAllowedPath(allowedModules: ModuleKey[]) {
  return modulePath(allowedModules[0] ?? "pos");
}

export function isModuleKey(value: string): value is ModuleKey {
  return allModules.includes(value as ModuleKey);
}

export function moduleFromPath(pathname: string): ModuleKey | null {
  if (pathname === "/") {
    return "dashboard";
  }

  const segment = pathname.split("/").filter(Boolean)[0];
  return segment && isModuleKey(segment) ? segment : null;
}
