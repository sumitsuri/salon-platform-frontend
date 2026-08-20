import { BOOK_STATIC_PATHS } from "@/lib/book-routes";
import { BookTenantPicker } from "@/components/book/BookTenantPicker";

export function generateStaticParams() {
  const tenants = [...new Set(BOOK_STATIC_PATHS.map((p) => p.tenantSlug))];
  return tenants.map((tenantSlug) => ({ tenantSlug }));
}

export default async function BookTenantPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return (
    <main className="book-flow-page">
      <BookTenantPicker tenantSlug={tenantSlug} />
    </main>
  );
}
