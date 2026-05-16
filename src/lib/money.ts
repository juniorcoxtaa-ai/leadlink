export function coerceMoneyValue(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function fmtBRL(value: unknown) {
  return coerceMoneyValue(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

