const ADMIN_EMAILS = new Set(["asakajapan.company@gmail.com"]);

export function userDisplayName(user?: {
  employeeName?: string | null;
  email?: string | null;
} | null) {
  const email = String(user?.email || "")
    .trim()
    .toLowerCase();
  if (ADMIN_EMAILS.has(email)) return "Admin";
  const name = String(user?.employeeName || "").trim();
  if (name) return name;
  if (email) return email.split("@")[0] || email;
  return "bạn";
}
