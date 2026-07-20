import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsDetailView } from "@/components/news/NewsDetailView";
import { getNewsById, getNewsExcerpt } from "@/lib/api/news";

type NewsDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewsDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await getNewsById(id);

  if (!article) {
    return { title: "Không tìm thấy tin tức" };
  }

  const description =
    getNewsExcerpt(article.content || "") ||
    `Tin tức ${article.title} từ ASAKA JAPAN.`;

  return {
    title: article.title,
    description,
    openGraph: {
      title: article.title,
      description,
      ...(article.image
        ? { images: [{ url: article.image, alt: article.title }] }
        : {}),
    },
  };
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params;
  const article = await getNewsById(id);

  if (!article) {
    notFound();
  }

  return <NewsDetailView article={article} />;
}
