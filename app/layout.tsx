import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP POS Cafeteria",
  description: "Sistema POS/ERP para cafeterias, bubble tea, mochis, corn dogs y postres.",
  applicationName: "ERP POS Cafeteria",
  appleWebApp: {
    capable: true,
    title: "ERP POS"
  }
};

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
        <PwaRegister />
      </body>
    </html>
  );
}
