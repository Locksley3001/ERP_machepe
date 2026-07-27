export function parseLocalizedNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value ?? "").trim();
  if (!raw) {
    return 0;
  }

  const clean = raw.replace(/[^\d.,-]/g, "");

  if (clean.includes(",")) {
    return Number(clean.replace(/\./g, "").replace(",", ".")) || 0;
  }

  if (clean.includes(".")) {
    const parts = clean.split(".");
    const looksLikeThousands = parts.length > 1 && parts[0] !== "0" && parts.slice(1).every((part) => part.length === 3);
    return Number(looksLikeThousands ? parts.join("") : clean) || 0;
  }

  return Number(clean) || 0;
}

export function formatNumber(value: number, maximumFractionDigits = 3) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits
  }).format(value);
}

export function formatMoneyInput(value: unknown) {
  const parsed = parseLocalizedNumber(value);
  return parsed ? formatNumber(parsed, 0) : "";
}

export function formatMoneyTyping(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return formatNumber(Number(digits), 0);
}
