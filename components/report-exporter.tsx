"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { ActionFeedbackOverlay, feedbackDuration } from "@/components/action-feedback-overlay";
import type { PeriodPreset } from "@/lib/domain";

type FeedbackStatus = "success" | "error";

function waitForFeedback() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, feedbackDuration);
  });
}

export function ReportExporter() {
  const [preset, setPreset] = useState<PeriodPreset>("week");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ status: FeedbackStatus; message: string } | null>(null);

  async function exportReport() {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/export?preset=${preset}`);
      if (!response.ok) {
        throw new Error("No se pudo exportar el reporte.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reporte-${preset}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      setFeedback({ status: "success", message: "Reporte exportado." });
      await waitForFeedback();
      setFeedback(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "No se pudo exportar el reporte.";
      setFeedback({ status: "error", message: errorMessage });
      await waitForFeedback();
      setFeedback(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="exporter">
      {feedback ? <ActionFeedbackOverlay status={feedback.status} message={feedback.message} /> : null}
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
