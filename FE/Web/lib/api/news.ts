import { apiRequest, getImageUrl } from "@/lib/api/client";

export type ApiNews = {
  id: string;
  title: string;
  slug: string;
  content: string;
  image?: string;
  displayOrder?: number;
  status: "active" | "inactive";
  createdAt?: string;
};

export type PaginatedNews = {
  items: ApiNews[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type NewsCard = {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  dateIso: string;
  image: string;
  alt: string;
  displayOrder: number;
};

function stripMarkdown(text: string) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value?: string) {
  if (!value) {
    return { display: "", iso: "" };
  }

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

export function mapNewsToCard(item: ApiNews): NewsCard {
  const excerpt = stripMarkdown(item.content || "").slice(0, 160);
  const { display, iso } = formatDate(item.createdAt);

  return {
    id: item.id,
    title: item.title,
    excerpt:
      excerpt ||
      "Cập nhật tin tức và hoạt động mới nhất từ ASAKA JAPAN.",
    date: display,
    dateIso: iso,
    image: getImageUrl(item.image),
    alt: item.title,
    displayOrder: item.displayOrder ?? 0,
  };
}

export async function getLatestNews(limit = 6): Promise<NewsCard[]> {
  const query = new URLSearchParams({
    status: "active",
    page: "1",
    limit: String(limit),
  });

  const result = await apiRequest<PaginatedNews>(`/news?${query.toString()}`);
  return (result.items || [])
    .map(mapNewsToCard)
    .sort(
      (a, b) =>
        a.displayOrder - b.displayOrder || a.title.localeCompare(b.title, "vi")
    );
}
