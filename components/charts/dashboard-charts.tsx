"use client";

import { useMemo, useState } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from "chart.js";
import { Activity, Banknote, Boxes, TrendingUp } from "lucide-react";
import { Bar, Line } from "react-chartjs-2";
import {
  formatCurrency,
  saleCostTotal,
  saleGrossTotal,
  sumBy,
  type Purchase,
  type Sale
} from "@/lib/domain";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        boxWidth: 10
      }
    }
  }
};

type DashboardPeriod = "day" | "week" | "month";

const periodOptions: { value: DashboardPeriod; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" }
];

const hourLabels = Array.from({ length: 24 }, (_, hour) => `${hour.toString().padStart(2, "0")}:00`);
const weekLabels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const hourInMs = 60 * 60 * 1000;

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function periodRange(period: DashboardPeriod, now: Date) {
  if (period === "day") {
    const start = startOfDay(now);
    return { start, end: addDays(start, 1) };
  }

  if (period === "week") {
    const start = startOfDay(now);
    const dayOffset = start.getDay() === 0 ? 6 : start.getDay() - 1;
    start.setDate(start.getDate() - dayOffset);
    return { start, end: addDays(start, 7) };
  }

  return {
    start: new Date(now.getFullYear(), 0, 1),
    end: new Date(now.getFullYear() + 1, 0, 1)
  };
}

function isInsideRange(dateValue: string, start: Date, end: Date) {
  const date = new Date(dateValue);
  return date >= start && date < end;
}

function bucketIndex(date: Date, period: DashboardPeriod) {
  if (period === "day") {
    return date.getHours();
  }

  if (period === "week") {
    return date.getDay() === 0 ? 6 : date.getDay() - 1;
  }

  return date.getMonth();
}

function labelsForPeriod(period: DashboardPeriod) {
  if (period === "day") return hourLabels;
  if (period === "week") return weekLabels;
  return monthLabels;
}

function titleForPeriod(period: DashboardPeriod) {
  if (period === "day") return "Ventas por hora";
  if (period === "week") return "Ventas por dia";
  return "Ventas por mes";
}

export function DashboardCharts({
  sales,
  purchases,
  lowStock,
  now
}: {
  sales: Sale[];
  purchases: Purchase[];
  lowStock: number;
  now: string;
}) {
  const [period, setPeriod] = useState<DashboardPeriod>("day");

  const metrics = useMemo(() => {
    const nowDate = new Date(now);
    const { start, end } = periodRange(period, nowDate);
    const labels = labelsForPeriod(period);
    const revenueByBucket = Array.from({ length: labels.length }, () => 0);
    const productTotals = new Map<string, number>();
    const periodSales = sales.filter((sale) => isInsideRange(sale.soldAt, start, end));

    periodSales.forEach((sale) => {
      const date = new Date(sale.soldAt);
      revenueByBucket[bucketIndex(date, period)] += saleGrossTotal(sale);
      sale.lines.forEach((line) => {
        productTotals.set(line.productName, (productTotals.get(line.productName) ?? 0) + line.quantity);
      });
    });

    const recentPurchaseStart = new Date(nowDate.getTime() - hourInMs);
    const recentPurchases = purchases.filter((purchase) => {
      const purchasedAt = new Date(purchase.purchasedAt);
      return purchasedAt >= recentPurchaseStart && purchasedAt <= nowDate;
    });

    return {
      labels,
      revenue: sumBy(periodSales, saleGrossTotal),
      profit: sumBy(periodSales, saleGrossTotal) - sumBy(periodSales, saleCostTotal),
      revenueByBucket,
      recentPurchases: recentPurchases.length,
      rankedProducts: [...productTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  }, [now, period, purchases, sales]);

  const productLabels = metrics.rankedProducts.length ? metrics.rankedProducts.map(([name]) => name) : ["Sin ventas"];
  const productValues = metrics.rankedProducts.length ? metrics.rankedProducts.map(([, quantity]) => quantity) : [0];

  return (
    <>
      <div className="module-toolbar">
        <div className="segmented" role="tablist" aria-label="Periodo del dashboard">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              className={period === option.value ? "active" : undefined}
              type="button"
              onClick={() => setPeriod(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi icon={<Banknote size={20} />} label="Ventas" value={formatCurrency(metrics.revenue)} />
        <Kpi icon={<TrendingUp size={20} />} label="Utilidad bruta" value={formatCurrency(metrics.profit)} />
        <Kpi icon={<Boxes size={20} />} label="Alertas stock" value={String(lowStock)} />
        <Kpi icon={<Activity size={20} />} label="Compras recientes" value={String(metrics.recentPurchases)} />
      </div>

      <div className="chart-grid">
        <section className="panel">
          <h2>{titleForPeriod(period)}</h2>
          <div className="chart-box">
            <Line
              options={chartOptions}
              data={{
                labels: metrics.labels,
                datasets: [
                  {
                    label: "Ventas",
                    data: metrics.revenueByBucket,
                    borderColor: "#0f766e",
                    backgroundColor: "rgba(15, 118, 110, 0.16)",
                    tension: 0.35
                  }
                ]
              }}
            />
          </div>
        </section>
        <section className="panel">
          <h2>Productos mas vendidos</h2>
          <div className="chart-box">
            <Bar
              options={chartOptions}
              data={{
                labels: productLabels,
                datasets: [
                  {
                    label: "Unidades",
                    data: productValues,
                    backgroundColor: ["#14b8a6", "#f59e0b", "#64748b", "#0ea5e9", "#a855f7"]
                  }
                ]
              }}
            />
          </div>
        </section>
      </div>
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
