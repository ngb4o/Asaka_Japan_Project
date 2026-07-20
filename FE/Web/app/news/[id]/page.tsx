import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar } from "lucide-react";
import { BackLink } from "@/components/detail/BackLink";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import { Button } from "@/components/ui/button";
import { getNewsById } from "@/lib/api/news";
import { getImageUrl } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

type NewsDetailPageProps = {
  params: Promise<{ id: string }>;
};

function stripMarkdownExcerpt(text: string, maxLength = 160) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export async function generateMetadata({
  params,
}: NewsDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await getNewsById(id);

  if (!article) {
    return { title: "Không tìm thấy tin tức" };
  }

  const description =
    stripMarkdownExcerpt(article.content || "") ||
    `Tin tức ${article.title} từ ASAKA JAPAN.`;

  return {
    title: article.title,
    description,
    openGraph: {
      title: article.title,
      description,
    },
  };
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params;
  const article = await getNewsById(id);

  if (!article) {
    notFound();
  }

  const image = getImageUrl(article.image);
  const { display, iso } = formatDate(article.createdAt);

  return (
    <main className="min-h-screen bg-[var(--color-surface-muted)] pt-24 pb-16 md:pt-28">
      <article className="container-wide px-[var(--space-6)]">
        <BackLink href="/#news" label="tin tức" />

        {image ? (
          <div className="relative mb-6 aspect-[16/10] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] sm:aspect-[21/9]">
            <Image
              src={image}
              alt={article.title}
              fill
              className="object-cover"
              sizes="100vw"
              priority
              unoptimized={
                image.startsWith("http") || image.includes("localhost")
              }
            />
          </div>
        ) : null}

        <header className="max-w-3xl">
          {display ? (
            <p className="flex items-center gap-2 text-xs font-normal text-[var(--color-text-inverse)] sm:text-[length:var(--text-sm)]">
              <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
              <time dateTime={iso}>{display}</time>
            </p>
          ) : null}
          <h1 className="mt-3 text-headline font-semibold text-[var(--color-text-primary)]">
            {article.title}
          </h1>
        </header>

        <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-8">
          <MarkdownContent content={article.content} />
        </div>
      </article>
    </main>
  );
}
