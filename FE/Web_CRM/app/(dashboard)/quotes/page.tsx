import { redirect } from "next/navigation";

/** Quotes module removed — keep route to avoid broken bookmarks. */
export default function QuotesPage() {
  redirect("/orders");
}
