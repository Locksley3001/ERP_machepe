import { Search } from "lucide-react";
import { firstAllowedPath, getAccessContext } from "@/lib/permissions";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppNavigation } from "@/components/app-navigation";

export async function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const access = await getAccessContext();
  const homeHref = access.allowedModules.length ? firstAllowedPath(access.allowedModules) : "/login";

  return (
    <div className="app-shell">
      <AppNavigation allowedModules={access.allowedModules} homeHref={homeHref} />

      <div className="main-column">
        <header className="topbar">
          <div className="global-search">
            <Search size={18} />
            <input placeholder="Buscar ventas, productos, facturas o proveedores" />
          </div>
          <ThemeToggle />
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
