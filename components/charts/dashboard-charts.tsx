"use client";

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
import { Bar, Line } from "react-chartjs-2";
import type { Sale } from "@/lib/domain";

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

export function DashboardCharts({ sales }: { sales: Sale[] }) {
  const labels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  const dailyRevenue = [0, 0, 0, 0, 0, 0, 0];
  const productTotals = new Map<string, number>();

  sales.forEach((sale) => {
    const date = new Date(sale.soldAt);
    const index = date.getDay() === 0 ? 6 : date.getDay() - 1;
    dailyRevenue[index] += sale.lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0) - sale.discount;
    sale.lines.forEach((line) => {
      productTotals.set(line.productName, (productTotals.get(line.productName) ?? 0) + line.quantity);
    });
  });

  const rankedProducts = [...productTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const productLabels = rankedProducts.length ? rankedProducts.map(([name]) => name) : ["Sin ventas"];
  const productValues = rankedProducts.length ? rankedProducts.map(([, quantity]) => quantity) : [0];

  return (
    <div className="chart-grid">
      <section className="panel">
        <h2>Ventas por dia</h2>
        <div className="chart-box">
          <Line
            options={chartOptions}
            data={{
              labels,
              datasets: [
                {
                  label: "Ventas",
                  data: dailyRevenue,
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
  );
}
