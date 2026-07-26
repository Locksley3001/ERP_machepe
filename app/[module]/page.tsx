import { ModuleWorkspace } from "@/components/module-workspace";
import { navigationItems } from "@/lib/navigation";

export function generateStaticParams() {
  return navigationItems.filter((item) => item.key !== "dashboard").map((item) => ({ module: item.key }));
}

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <ModuleWorkspace module={module} />;
}
