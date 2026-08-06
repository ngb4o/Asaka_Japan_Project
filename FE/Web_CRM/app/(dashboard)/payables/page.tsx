import { redirect } from "next/navigation";

/** Legacy URL — công nợ NCC đã gộp vào /receivables?tab=ncc */
export default function PayablesRedirectPage() {
  redirect("/receivables?tab=ncc");
}
