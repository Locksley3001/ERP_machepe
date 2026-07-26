# ERP POS Cafeteria

Sistema web POS/ERP construido con Next.js, React, TypeScript, Supabase/PostgreSQL, ExcelJS y Chart.js.

## Ejecutar en local

1. Instala dependencias:

```bash
npm install
```

2. Copia variables de entorno:

```bash
cp .env.example .env.local
```

3. Completa `.env.local` con las llaves de Supabase.

4. Inicia el servidor:

```bash
npm run dev
```

5. Abre `http://localhost:3000`.

La aplicacion funciona sin Supabase configurado usando datos semilla locales. Cuando agregues Supabase, el middleware protege los modulos operativos y habilita autenticacion real.

## Estructura

- `app/`: rutas Next.js, dashboard, login y API routes.
- `components/`: shell visual, tablas, POS, graficos y formularios.
- `lib/`: dominio, datos, reportes y clientes Supabase.
- `supabase/migrations/`: esquema PostgreSQL versionado.
- `public/`: icono y service worker PWA.
- `MANUAL_DEL_SISTEMA.txt`: guia completa de uso, conexion y mantenimiento.

## Comandos

```bash
npm run dev
npm run build
npm run typecheck
```

## Despliegue

El destino recomendado para esta arquitectura es Vercel. El prompt original tambien menciona Render; se documenta como alternativa en el manual, pero Next.js con App Router y PWA se despliega de forma mas natural en Vercel.
