import type { Metadata } from "next";
import { BOOK_SHELL_SLUG, BOOK_STATIC_PATHS } from "@/lib/book-routes";
import { BookDynamicEntry } from "@/components/book/BookDynamicEntry";

/** Public booking pages are meant to be found by guests — override the app-wide noindex. */
export const metadata: Metadata = {
  title: "Book an appointment",
  description: "Book your salon or spa appointment online in a few taps.",
  robots: { index: true, follow: true },
};

export function generateStaticParams() {
  const paths: { slug?: string[] }[] = [{ slug: [BOOK_SHELL_SLUG] }];

  const tenants = new Set<string>();
  for (const { tenantSlug, branchCode } of BOOK_STATIC_PATHS) {
    tenants.add(tenantSlug);
    paths.push({ slug: [tenantSlug, branchCode] });
  }
  for (const tenantSlug of tenants) {
    paths.push({ slug: [tenantSlug] });
  }

  return paths;
}

export default function BookCatchAllPage() {
  return (
    <main className="book-flow-page">
      <BookDynamicEntry />
    </main>
  );
}
