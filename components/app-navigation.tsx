"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Coffee, Menu, X } from "lucide-react";
import type { ModuleKey } from "@/lib/domain";
import { navigationItems } from "@/lib/navigation";

type AppNavigationProps = {
  allowedModules: ModuleKey[];
  homeHref: string;
};

export function AppNavigation({ allowedModules, homeHref }: AppNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const visibleItems = allowedModules.length
    ? navigationItems.filter((item) => allowedModules.includes(item.key))
    : [];

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const renderBrand = () => (
    <Link className="brand" href={homeHref} aria-label="Ir al modulo principal" onClick={() => setIsOpen(false)}>
      <span className="brand-mark">
        <Coffee size={22} />
      </span>
      <span>
        <strong>ERP MACHEPE</strong>
        <small>MACHEPE</small>
      </span>
    </Link>
  );

  return (
    <aside className={`sidebar${isOpen ? " is-open" : ""}`}>
      <div className="mobile-sidebar-bar">
        <button
          type="button"
          className="mobile-menu-button"
          aria-label={isOpen ? "Cerrar menu de opciones" : "Abrir menu de opciones"}
          aria-controls="main-navigation"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          <Menu size={24} />
        </button>
        <div className="mobile-brand">{renderBrand()}</div>
      </div>

      <button
        type="button"
        className="mobile-nav-backdrop"
        aria-label="Cerrar menu de opciones"
        onClick={() => setIsOpen(false)}
      />

      <div className="sidebar-drawer" id="main-navigation">
        <div className="sidebar-drawer-head">
          {renderBrand()}
          <button
            type="button"
            className="mobile-menu-close"
            aria-label="Cerrar menu de opciones"
            onClick={() => setIsOpen(false)}
          >
            <X size={22} />
          </button>
        </div>

        <nav className="nav-list" aria-label="Modulos principales">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.key} href={item.href} className="nav-item" onClick={() => setIsOpen(false)}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
