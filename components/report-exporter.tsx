"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import type { PeriodPreset } from "@/lib/domain";

export function ReportExporter() {
  const [preset, setPreset] = useState<PeriodPreset>("week");
  const [loading, setLoading] = useState(false);

  async function exportReport() {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/export?preset=${preset}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reporte-${preset}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="exporter">
      <label className="field">
        <span>Periodo</span>
        <select value={preset} onChange={(event) => setPreset(event.target.value as PeriodPreset)}>
          <option value="last_24_hours">Ultimas 24 horas</option>
          <option value="today">Hoy</option>
          <option value="yesterday">Ayer</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mes</option>
          <option value="year">Este ano</option>
        </select>
      </label>
      <button className="primary-action inline" type="button" onClick={exportReport} disabled={loading}>
        <Download size={18} />
        {loading ? "Generando" : "Exportar Excel"}
      </button>
    </div>
  );
}
