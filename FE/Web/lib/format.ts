export function formatCurrency(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value?: string) {
  if (!value) return { display: "", iso: "" };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { display: "", iso: "" };
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return {
    display: `${day}/${month}/${year}`,
    iso: `${year}-${month}-${day}`,
  };
}

export function isApiId(id: string) {
  return /^[a-f\d]{24}$/i.test(id);
}
