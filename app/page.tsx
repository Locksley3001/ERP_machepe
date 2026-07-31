import { DashboardCharts } from "@/components/charts/dashboard-charts";
import { getAppData } from "@/lib/app-data";
import { requireModuleAccess } from "@/lib/permissions";

export default async function DashboardPage() {
  await requireModuleAccess("dashboard");
  const { inventoryItems, purchases, sales } = await getAppData();
  const lowStock = inventoryItems.filter((item) => item.quantity <= item.minimumQuantity).length;

  return (
    <>
      <div className="module-header">
        <div>
          <h1>Dashboard</h1>
          <p>Indicadores clave de ventas, utilidad, inventario y abastecimiento.</p>
        </div>
      </div>

      <DashboardCharts sales={sales} purchases={purchases} lowStock={lowStock} now={new Date().toISOString()} />
    </>
  );
}
