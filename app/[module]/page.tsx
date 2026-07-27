import { ModuleWorkspace } from "@/components/module-workspace";
import { getAppData } from "@/lib/app-data";
import { navigationItems } from "@/lib/navigation";
import { isModuleKey, requireModuleAccess } from "@/lib/permissions";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return navigationItems.filter((item) => item.key !== "dashboard").map((item) => ({ module: item.key }));
}

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (!isModuleKey(module) || module === "dashboard") {
    notFound();
  }

  await requireModuleAccess(module);
  const data = await getAppData();
  return <ModuleWorkspace module={module} data={data} />;
}
