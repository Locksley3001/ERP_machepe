import { ModuleWorkspace } from "@/components/module-workspace";
import { getAppData } from "@/lib/app-data";
import { navigationItems } from "@/lib/navigation";

export function generateStaticParams() {
  return navigationItems.filter((item) => item.key !== "dashboard").map((item) => ({ module: item.key }));
}

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const data = await getAppData();
  return <ModuleWorkspace module={module} data={data} />;
}
