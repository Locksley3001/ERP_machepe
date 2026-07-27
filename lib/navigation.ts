import {
  AlertTriangle,
  Archive,
  BarChart3,
  BookOpen,
  Boxes,
  ClipboardList,
  Factory,
  FileClock,
  History,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck
} from "lucide-react";
import type { ModuleKey } from "@/lib/domain";

export type NavigationItem = {
  key: ModuleKey;
  href: string;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
};

export const navigationItems: NavigationItem[] = [
  {
    key: "dashboard",
    href: "/",
    label: "Dashboard",
    description: "Indicadores de ventas, utilidad, inventario y operacion.",
    icon: LayoutDashboard
  },
  {
    key: "pos",
    href: "/pos",
    label: "POS",
    description: "Venta rapida, carrito, pagos, descuentos y facturas.",
    icon: Store
  },
  {
    key: "suppliers",
    href: "/suppliers",
    label: "Proveedores",
    description: "Directorio unico para compras y abastecimiento.",
    icon: Truck
  },
  {
    key: "inventory",
    href: "/inventory",
    label: "Inventario",
    description: "Materias primas, empaques, activos, herramientas y equipos.",
    icon: Boxes
  },
  {
    key: "purchases",
    href: "/purchases",
    label: "Compras",
    description: "Entradas con factura que actualizan inventario e historial.",
    icon: ShoppingBag
  },
  {
    key: "production",
    href: "/production",
    label: "Produccion",
    description: "Transformacion de insumos en productos preparados.",
    icon: Factory
  },
  {
    key: "menu",
    href: "/menu",
    label: "Carta",
    description: "Productos vendibles, categorias, precios y favoritos.",
    icon: Receipt
  },
  {
    key: "recipes",
    href: "/recipes",
    label: "Recetas",
    description: "Versiones de recetas con ingredientes y empaques.",
    icon: BookOpen
  },
  {
    key: "movements",
    href: "/movements",
    label: "Movimientos",
    description: "Trazabilidad completa de entradas, salidas y ajustes.",
    icon: History
  },
  {
    key: "costs",
    href: "/costs",
    label: "Costos",
    description: "Costo de receta, empaque, margen y rentabilidad.",
    icon: BarChart3
  },
  {
    key: "reports",
    href: "/reports",
    label: "Reportes",
    description: "Centro de exportacion Excel con periodos completos.",
    icon: ClipboardList
  },
  {
    key: "reconstruction",
    href: "/reconstruction",
    label: "Historial",
    description: "Reconstruccion exacta de cualquier dia pasado.",
    icon: FileClock
  },
  {
    key: "alerts",
    href: "/alerts",
    label: "Alertas",
    description: "Bajo stock, agotados, vencimientos y baja rotacion.",
    icon: AlertTriangle
  },
  {
    key: "audit",
    href: "/audit",
    label: "Seguridad",
    description: "Usuarios, roles, permisos y registro de actividad.",
    icon: ShieldCheck
  }
];

export function findNavigationItem(key: string) {
  return navigationItems.find((item) => item.key === key);
}
