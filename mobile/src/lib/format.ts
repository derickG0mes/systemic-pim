export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}

export function getOrderStatus(items: { statusItem?: string }[], statusComanda: string) {
  if (statusComanda.trim().toUpperCase() === "FECHADA") return "completed" as const;
  if (items.length > 0 && items.every((item) => ["CONCLUIDO", "ENTREGUE"].includes(item.statusItem?.trim().toUpperCase() ?? ""))) {
    return "completed" as const;
  }
  if (items.some((item) => item.statusItem?.trim().toUpperCase() === "PREPARANDO")) {
    return "in_progress" as const;
  }
  return "preparing" as const;
}

export const orderStatusLabels = {
  preparing: "Preparar",
  in_progress: "Em andamento",
  completed: "Concluído",
} as const;
