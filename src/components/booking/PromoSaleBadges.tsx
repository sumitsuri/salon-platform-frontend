import { formatCurrency } from "@/lib/utils";
import { BillPreview } from "@/lib/api";

/**
 * A visit can include a membership/package sale with zero (or unrelated) service lines — the
 * grand total already accounts for it (via billPreview), but nothing on the row said so, making
 * these sales look missing when scanning a branch's booking list.
 */
export function PromoSaleBadges({ billPreview }: { billPreview?: BillPreview }) {
  if (!billPreview) return null;
  const badges: { key: string; label: string; amount: number }[] = [];
  if (billPreview.membershipFeeAmount && billPreview.membershipFeeAmount > 0) {
    badges.push({
      key: "membership",
      label: billPreview.membershipFeeLabel || "Membership sold",
      amount: billPreview.membershipFeeAmount,
    });
  }
  if (billPreview.packageFeeAmount && billPreview.packageFeeAmount > 0) {
    badges.push({
      key: "package",
      label: billPreview.packageFeeLabel || "Package sold",
      amount: billPreview.packageFeeAmount,
    });
  }
  if (badges.length === 0) return null;
  return (
    <>
      {badges.map((badge) => (
        <span
          key={badge.key}
          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          title={formatCurrency(badge.amount)}
        >
          {badge.label}
        </span>
      ))}
    </>
  );
}
