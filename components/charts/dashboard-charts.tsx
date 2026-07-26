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

export function DashboardCharts() {
  return (
    <div className="chart-grid">
      <section className="panel">
        <h2>Ventas por dia</h2>
        <div className="chart-box">
          <Line
            options={chartOptions}
            data={{
              labels: ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"],
              datasets: [
                {
                  label: "Ventas",
                  data: [320000, 410000, 260000, 0, 0, 0, 0],
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
              labels: ["Bubble Tea Taro", "Mochi fresa", "Corn Dog queso"],
              datasets: [
                {
                  label: "Unidades",
                  data: [7, 2, 0],
                  backgroundColor: ["#14b8a6", "#f59e0b", "#64748b"]
                }
              ]
            }}
          />
        </div>
      </section>
    </div>
  );
}
