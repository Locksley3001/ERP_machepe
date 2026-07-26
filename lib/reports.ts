import { saleCostTotal, saleGrossTotal, sumBy, type PeriodPreset } from "@/lib/domain";
import type { AppData } from "@/lib/app-data";

export type PeriodDay = {
  date: string;
  label: string;
  isFuture: boolean;
};

export type ReportSummary = {
  revenue: number;
  grossProfit: number;
  saleCount: number;
  averageTicket: number;
  bestSeller: string;
  slowestSeller: string;
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function mondayOf(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(copy, diff);
}

export function resolvePeriod(preset: PeriodPreset, from?: string, to?: string, now = new Date()) {
  if (preset === "custom" && from && to) {
    return { start: startOfDay(new Date(from)), end: endOfDay(new Date(to)) };
  }

  if (preset === "last_24_hours") {
    return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
  }

  if (preset === "yesterday") {
    const yesterday = addDays(now, -1);
    return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
  }

  if (preset === "week") {
    const start = mondayOf(now);
    return { start, end: endOfDay(addDays(start, 6)) };
  }

  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  if (preset === "year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
    };
  }

  return { start: startOfDay(now), end: endOfDay(now) };
}

export function periodDays(start: Date, end: Date, now = new Date()): PeriodDay[] {
  const days: PeriodDay[] = [];
  for (let cursor = startOfDay(start); cursor <= end; cursor = addDays(cursor, 1)) {
    days.push({
      date: cursor.toISOString().slice(0, 10),
      label: cursor.toLocaleDateString("es-CO", { weekday: "long", day: "2-digit", month: "short" }),
      isFuture: cursor > now
    });
  }
  return days;
}

export function salesInPeriod(sales: AppData["sales"], start: Date, end: Date) {
  return sales.filter((sale) => {
    const soldAt = new Date(sale.soldAt);
    return soldAt >= start && soldAt <= end;
  });
}

export function buildReportSummary(sales: AppData["sales"], start: Date, end: Date): ReportSummary {
  const scopedSales = salesInPeriod(sales, start, end);
  const revenue = sumBy(scopedSales, saleGrossTotal);
  const cost = sumBy(scopedSales, saleCostTotal);
  const productTotals = new Map<string, number>();

  scopedSales.forEach((sale) => {
    sale.lines.forEach((line) => {
      productTotals.set(line.productName, (productTotals.get(line.productName) ?? 0) + line.quantity);
    });
  });

  const ranked = [...productTotals.entries()].sort((a, b) => b[1] - a[1]);

  return {
    revenue,
    grossProfit: revenue - cost,
    saleCount: scopedSales.length,
    averageTicket: scopedSales.length ? revenue / scopedSales.length : 0,
    bestSeller: ranked[0]?.[0] ?? "Sin ventas",
    slowestSeller: ranked.at(-1)?.[0] ?? "Sin ventas"
  };
}

export function reconstructDay(data: AppData, date: string) {
  const targetStart = startOfDay(new Date(date));
  const targetEnd = endOfDay(new Date(date));
  const daySales = salesInPeriod(data.sales, targetStart, targetEnd);
  const dayMovements = data.movements.filter((movement) => {
    const occurredAt = new Date(movement.occurredAt);
    return occurredAt >= targetStart && occurredAt <= targetEnd;
  });

  return {
    date,
    sales: daySales,
    movements: dayMovements,
    purchases: data.purchases.filter((purchase) => {
      const purchasedAt = new Date(purchase.purchasedAt);
      return purchasedAt >= targetStart && purchasedAt <= targetEnd;
    }),
    production: data.productionBatches.filter((batch) => {
      const producedAt = new Date(batch.producedAt);
      return producedAt >= targetStart && producedAt <= targetEnd;
    }),
    openingInventory: data.inventoryItems.map((item) => {
      const deltaToday = sumBy(
        dayMovements.filter((movement) => movement.itemId === item.id),
        (movement) => movement.quantity
      );
      return { itemName: item.name, quantity: item.quantity - deltaToday, unit: item.unit };
    }),
    closingInventory: data.inventoryItems.map((item) => ({ itemName: item.name, quantity: item.quantity, unit: item.unit })),
    summary: buildReportSummary(data.sales, targetStart, targetEnd)
  };
}
