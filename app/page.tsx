import { Activity, Banknote, Boxes, TrendingUp } from "lucide-react";
import { DashboardCharts } from "@/components/charts/dashboard-charts";
import { formatCurrency, saleCostTotal, saleGrossTotal, sumBy } from "@/lib/domain";
import { inventoryItems, purchases, sales } from "@/lib/sample-data";

export default function DashboardPage() {
  const revenue = sumBy(sales, saleGrossTotal);
  const cost = sumBy(sales, saleCostTotal);
  const lowStock = inventoryItems.filter((item) => item.quantity <= item.minimumQuantity).length;

  return (
    <>
      <div className="module-header">
        <div>
          <h1>Dashboard</h1>
          <p>Indicadores clave de ventas, utilidad, inventario y abastecimiento.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi icon={<Banknote size={20} />} label="Ventas" value={formatCurrency(revenue)} />
        <Kpi icon={<TrendingUp size={20} />} label="Utilidad bruta" value={formatCurrency(revenue - cost)} />
        <Kpi icon={<Boxes size={20} />} label="Alertas stock" value={String(lowStock)} />
        <Kpi icon={<Activity size={20} />} label="Compras recientes" value={String(purchases.length)} />
      </div>

      <DashboardCharts />
    </>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <section className="kpi">
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
    </section>
  );
}
