import { apiRequest, getImageUrl, ApiClientError } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

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

export function getNewsExcerpt(content: string, maxLength = 160) {
  return stripMarkdown(content || "").slice(0, maxLength);
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

export async function getNewsById(id: string): Promise<ApiNews | null> {
  try {
    const article = await apiRequest<ApiNews>(`/news/${id}`);
    if (article.status !== "active") return null;
    return article;
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}
