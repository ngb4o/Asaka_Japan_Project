import Image from "next/image";
import Link from "next/link";
import { Calendar, Newspaper } from "lucide-react";
import { BackLink } from "@/components/detail/BackLink";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import { Button } from "@/components/ui/button";
import type { ApiNews } from "@/lib/api/news";
import { getImageUrl } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

type NewsDetailViewProps = {
  article: ApiNews;
};

export function NewsDetailView({ article }: NewsDetailViewProps) {
  const image = getImageUrl(article.image);
  const { display, iso } = formatDate(article.createdAt);

  return (
    <main className="min-h-screen bg-[var(--color-surface-muted)] pt-16 pb-16 md:pt-24 lg:pt-28">
      <div className="container-wide px-[var(--space-6)]">
        <BackLink href="/#news" label="tin tức" />

        <article className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]">
          {image ? (
            <div className="relative aspect-[16/10] overflow-hidden bg-[var(--color-surface-muted)] sm:aspect-[21/9]">
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
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
                aria-hidden="true"
              />
            </div>
          ) : null}

          <header
            className={`border-b border-[var(--color-border-subtle)] px-6 py-8 sm:px-10 sm:py-10 ${image ? "" : "pt-8"}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[length:var(--text-xs)] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
                <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
                Tin tức
              </span>
              {display ? (
                <>
                  <span
                    className="text-[var(--color-text-inverse)]/40"
                    aria-hidden="true"
                  >
                    •
                  </span>
                  <time
                    dateTime={iso}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-muted)] px-3 py-1 text-[length:var(--text-xs)] font-normal text-[var(--color-text-inverse)]"
                  >
                    <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {display}
                  </time>
                </>
              ) : null}
            </div>

            <h1 className="mt-4 max-w-4xl text-headline font-semibold text-[var(--color-text-primary)]">
              {article.title}
            </h1>
          </header>

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <MarkdownContent
              content={article.content}
              className="max-w-none [&_h2]:mt-8 [&_h2]:text-[length:var(--text-xl)] [&_h2]:font-semibold [&_h2]:text-[var(--color-text-primary)] [&_h2:first-child]:mt-0 [&_h3]:mt-6 [&_h3]:text-[length:var(--text-lg)] [&_h3]:font-semibold [&_h3]:text-[var(--color-text-primary)] [&_p+p]:mt-4 [&_ul]:mt-4"
            />
          </div>

          <footer className="border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-6 py-6 sm:px-10 sm:py-8">
            <p className="text-[length:var(--text-sm)] font-normal text-[var(--color-text-inverse)]">
              Cần tư vấn giải pháp bảo vệ thực vật? Liên hệ đội ngũ ASAKA JAPAN.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                asChild
                size="lg"
                className="h-11 px-6 text-[length:var(--text-sm)] bg-[var(--color-text-secondary)] text-white hover:bg-[#016502] sm:h-12"
              >
                <Link href="/#contact">Liên hệ tư vấn</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 px-6 text-[length:var(--text-sm)] sm:h-12"
              >
                <Link href="/#news">Xem thêm tin tức</Link>
              </Button>
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}
