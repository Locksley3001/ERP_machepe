import Link from "next/link";
import { Coffee, Search } from "lucide-react";
import { navigationItems } from "@/lib/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Ir al dashboard">
          <span className="brand-mark">
            <Coffee size={22} />
          </span>
          <span>
            <strong>ERP MACHEPE</strong>
            <small>MACHEPE</small>
          </span>
        </Link>

        <nav className="nav-list" aria-label="Modulos principales">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.key} href={item.href} className="nav-item">
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

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
