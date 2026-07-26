import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { formatCurrency, saleCostTotal, saleGrossTotal, type PeriodPreset } from "@/lib/domain";
import { buildReportSummary, periodDays, resolvePeriod, salesInPeriod } from "@/lib/reports";
import { inventoryItems, movements, productionBatches, purchases } from "@/lib/sample-data";

export async function GET(request: NextRequest) {
  const preset = (request.nextUrl.searchParams.get("preset") ?? "week") as PeriodPreset;
  const from = request.nextUrl.searchParams.get("from") ?? undefined;
  const to = request.nextUrl.searchParams.get("to") ?? undefined;
  const { start, end } = resolvePeriod(preset, from, to);
  const summary = buildReportSummary(start, end);
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "ERP POS Cafeteria";
  workbook.created = new Date();
  workbook.modified = new Date();

  const resumen = workbook.addWorksheet("Resumen");
  resumen.columns = [
    { header: "Indicador", key: "label", width: 28 },
    { header: "Valor", key: "value", width: 28 }
  ];
  resumen.addRows([
    { label: "Periodo inicio", value: start.toISOString() },
    { label: "Periodo fin", value: end.toISOString() },
    { label: "Total vendido", value: summary.revenue },
    { label: "Numero de ventas", value: summary.saleCount },
    { label: "Ticket promedio", value: summary.averageTicket },
    { label: "Producto mas vendido", value: summary.bestSeller },
    { label: "Producto menos vendido", value: summary.slowestSeller },
    { label: "Utilidad bruta", value: summary.grossProfit }
  ]);

  const ventas = workbook.addWorksheet("Ventas");
  ventas.columns = [
    { header: "Dia", key: "day", width: 18 },
    { header: "Fecha", key: "date", width: 16 },
    { header: "Estado", key: "status", width: 14 },
    { header: "Total vendido", key: "revenue", width: 18 },
    { header: "Ventas", key: "count", width: 12 },
    { header: "Utilidad bruta", key: "grossProfit", width: 18 }
  ];
  periodDays(start, end).forEach((day) => {
    const dateStart = new Date(`${day.date}T00:00:00`);
    const dateEnd = new Date(`${day.date}T23:59:59`);
    const daySales = salesInPeriod(dateStart, dateEnd);
    const revenue = daySales.reduce((total, sale) => total + saleGrossTotal(sale), 0);
    const cost = daySales.reduce((total, sale) => total + saleCostTotal(sale), 0);
    ventas.addRow({
      day: day.label,
      date: day.date,
      status: day.isFuture ? "Pendiente" : "Disponible",
      revenue,
      count: daySales.length,
      grossProfit: revenue - cost
    });
  });

  const inventario = workbook.addWorksheet("Inventario");
  inventario.columns = [
    { header: "Codigo", key: "code", width: 18 },
    { header: "Articulo", key: "name", width: 28 },
    { header: "Categoria", key: "category", width: 18 },
    { header: "Cantidad final", key: "quantity", width: 16 },
    { header: "Unidad", key: "unit", width: 12 },
    { header: "Costo promedio", key: "averageCost", width: 18 },
    { header: "Estado", key: "status", width: 16 }
  ];
  inventario.addRows(inventoryItems);

  const compras = workbook.addWorksheet("Compras");
  compras.columns = [
    { header: "Fecha", key: "date", width: 24 },
    { header: "Proveedor", key: "supplier", width: 24 },
    { header: "Factura", key: "invoice", width: 18 },
    { header: "Producto", key: "product", width: 28 },
    { header: "Cantidad", key: "quantity", width: 14 },
    { header: "Precio unitario", key: "unitCost", width: 18 },
    { header: "IVA", key: "tax", width: 12 },
    { header: "Total", key: "total", width: 18 }
  ];
  purchases.forEach((purchase) => {
    purchase.lines.forEach((line) => {
      compras.addRow({
        date: purchase.purchasedAt,
        supplier: purchase.supplierName,
        invoice: purchase.invoiceNumber,
        product: line.itemName,
        quantity: line.quantity,
        unitCost: line.unitCost,
        tax: line.taxRate,
        total: line.quantity * line.unitCost - line.discount
      });
    });
  });

  const produccion = workbook.addWorksheet("Produccion");
  produccion.columns = [
    { header: "Fecha", key: "producedAt", width: 24 },
    { header: "Producto", key: "productName", width: 28 },
    { header: "Cantidad", key: "quantityProduced", width: 16 },
    { header: "Costo", key: "totalCost", width: 18 },
    { header: "Responsable", key: "responsible", width: 18 }
  ];
  produccion.addRows(productionBatches);

  const movimientos = workbook.addWorksheet("Movimientos");
  movimientos.columns = [
    { header: "Fecha", key: "occurredAt", width: 24 },
    { header: "Articulo", key: "itemName", width: 28 },
    { header: "Tipo", key: "type", width: 22 },
    { header: "Cantidad", key: "quantity", width: 14 },
    { header: "Costo unitario", key: "unitCost", width: 18 },
    { header: "Referencia", key: "reference", width: 24 },
    { header: "Responsable", key: "responsible", width: 18 }
  ];
  movimientos.addRows(movements);

  workbook.worksheets.forEach((worksheet) => {
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: worksheet.columnCount }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          if (typeof cell.value === "number") {
            cell.numFmt = cell.value > 100 ? '"$"#,##0' : "0.00";
          }
        });
      }
    });
  });

  resumen.addRow({ label: "Lectura humana", value: `Total ${formatCurrency(summary.revenue)}` });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-${preset}.xlsx"`
    }
  });
}
