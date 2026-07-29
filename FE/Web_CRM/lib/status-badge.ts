type BadgeVariant = "default" | "success" | "muted" | "warning" | "danger";

/** Map common CRM status values → badge color */
export function statusBadgeVariant(status: string | null | undefined): BadgeVariant {
  switch (status) {
    case "active":
    case "paid":
    case "completed":
    case "converted":
    case "qualified":
    case "closed":
    case "locked":
    case "confirmed":
    case "import":
    case "admin":
      return "success";
    case "pending":
    case "partial":
    case "new":
    case "contacted":
    case "delivering":
    case "in_progress":
    case "settlement":
    case "draft":
      return "warning";
    case "inactive":
    case "cancelled":
    case "unpaid":
    case "export":
      return "danger";
    default:
      return "muted";
  }
}

/** Lead "closed" is negative; trip "closed" is success — use this for leads */
export function leadStatusBadgeVariant(status: string): BadgeVariant {
  if (status === "closed") return "muted";
  return statusBadgeVariant(status);
}
