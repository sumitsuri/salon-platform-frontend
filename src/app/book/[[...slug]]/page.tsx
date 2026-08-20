import { BOOK_SHELL_SLUG, BOOK_STATIC_PATHS } from "@/lib/book-routes";
import { BookDynamicEntry } from "@/components/book/BookDynamicEntry";

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
