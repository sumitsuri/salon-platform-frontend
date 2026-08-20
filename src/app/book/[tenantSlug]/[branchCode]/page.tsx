import { BOOK_STATIC_PATHS } from "@/lib/book-routes";
import { OnlineBookFlow } from "@/components/book/OnlineBookFlow";

export function generateStaticParams() {
  return BOOK_STATIC_PATHS.map(({ tenantSlug, branchCode }) => ({
    tenantSlug,
    branchCode,
  }));
}

export default async function BookBranchPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; branchCode: string }>;
}) {
  const { tenantSlug, branchCode } = await params;
  return (
    <main className="book-flow-page">
      <OnlineBookFlow tenantSlug={tenantSlug} branchCode={branchCode} />
    </main>
  );
}
