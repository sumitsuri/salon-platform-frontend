import { GuestVoiceReviewItem } from "@/lib/api";

export const CATEGORY_LABELS: Record<string, string> = {
  SERVICE: "Service",
  AMBIENCE: "Ambience",
  STAFF: "Staff",
  CLEANLINESS: "Cleanliness",
  VALUE_FOR_MONEY: "Value",
};

export const TAG_LABELS: Record<string, string> = {
  WAIT_TIME: "Wait time",
  STAFF_ATTITUDE: "Staff attitude",
  SERVICE_QUALITY: "Service quality",
  CLEANLINESS: "Cleanliness",
  VALUE_FOR_MONEY: "Value for money",
  OTHER: "Other",
};

export type ReviewListFilters = {
  customer: string;
  maxRatingExclusive: string;
  minRating: string;
  exactRating: string;
  dateFrom: string;
  dateTo: string;
};

export type ReviewSortKey = "dateDesc" | "dateAsc" | "ratingDesc" | "ratingAsc";

export const EMPTY_REVIEW_FILTERS: ReviewListFilters = {
  customer: "",
  maxRatingExclusive: "",
  minRating: "",
  exactRating: "",
  dateFrom: "",
  dateTo: "",
};

export function ratingTone(rating: number): {
  badge: string;
  row: string;
  bar: string;
} {
  if (rating <= 1) {
    return {
      badge: "bg-red-100 text-red-800 ring-red-200 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900/50",
      row: "border-l-4 border-l-red-500 bg-red-50/40 dark:bg-red-950/10",
      bar: "bg-red-500",
    };
  }
  if (rating === 2) {
    return {
      badge: "bg-orange-100 text-orange-900 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900/40",
      row: "border-l-4 border-l-orange-500 bg-orange-50/35 dark:bg-orange-950/10",
      bar: "bg-orange-500",
    };
  }
  if (rating === 3) {
    return {
      badge: "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/40",
      row: "border-l-4 border-l-amber-500 bg-amber-50/35 dark:bg-amber-950/10",
      bar: "bg-amber-400",
    };
  }
  if (rating === 4) {
    return {
      badge: "bg-lime-100 text-lime-900 ring-lime-200 dark:bg-lime-950/40 dark:text-lime-200 dark:ring-lime-900/40",
      row: "border-l-4 border-l-lime-500 bg-lime-50/30 dark:bg-lime-950/10",
      bar: "bg-lime-500",
    };
  }
  return {
    badge: "bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/40",
    row: "border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10",
    bar: "bg-emerald-500",
  };
}

export function formatReviewDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function filterReviews(reviews: GuestVoiceReviewItem[], filters: ReviewListFilters): GuestVoiceReviewItem[] {
  return reviews.filter((review) => {
    if (filters.customer.trim()) {
      const q = filters.customer.trim().toLowerCase();
      const name = review.customerFirstName?.toLowerCase() ?? "";
      const branch = review.branchName?.toLowerCase() ?? "";
      if (!name.includes(q) && !branch.includes(q)) return false;
    }
    if (filters.exactRating) {
      if (review.overallRating !== Number(filters.exactRating)) return false;
    }
    if (filters.minRating) {
      if (review.overallRating < Number(filters.minRating)) return false;
    }
    if (filters.maxRatingExclusive) {
      if (review.overallRating >= Number(filters.maxRatingExclusive)) return false;
    }
    if (filters.dateFrom) {
      const from = new Date(`${filters.dateFrom}T00:00:00`);
      if (new Date(review.submittedAt) < from) return false;
    }
    if (filters.dateTo) {
      const to = new Date(`${filters.dateTo}T23:59:59.999`);
      if (new Date(review.submittedAt) > to) return false;
    }
    return true;
  });
}

export function sortReviews(reviews: GuestVoiceReviewItem[], sortKey: ReviewSortKey): GuestVoiceReviewItem[] {
  const copy = [...reviews];
  copy.sort((a, b) => {
    switch (sortKey) {
      case "dateAsc":
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      case "ratingDesc":
        return b.overallRating - a.overallRating || new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      case "ratingAsc":
        return a.overallRating - b.overallRating || new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      case "dateDesc":
      default:
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    }
  });
  return copy;
}

export function activeFilterCount(filters: ReviewListFilters): number {
  return Object.values(filters).filter((v) => v !== "").length;
}
