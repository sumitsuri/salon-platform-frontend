"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { api, PublicReviewContext, SubmitPublicReviewResult } from "@/lib/api";

const TAG_LABELS: Record<string, string> = {
  WAIT_TIME: "Wait time",
  STAFF_ATTITUDE: "Staff attitude",
  SERVICE_QUALITY: "Service quality",
  CLEANLINESS: "Cleanliness",
  VALUE_FOR_MONEY: "Value for money",
  OTHER: "Something else",
};

type Props = {
  token: string;
  context: PublicReviewContext;
};

export function PublicReviewForm({ token, context }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitPublicReviewResult | null>(null);

  const displayRating = hover ?? rating ?? 0;
  const showRecoveryFields = rating != null && rating <= 3;

  const tagOptions = useMemo(
    () => context.improvementTagOptions?.map((tag) => ({ id: tag, label: TAG_LABELS[tag] ?? tag })) ?? [],
    [context.improvementTagOptions],
  );

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function submit() {
    if (rating == null) {
      setError("Please choose a rating.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await api.submitPublicReview({
        token,
        overallRating: rating,
        improvementTags: showRecoveryFields ? tags : undefined,
        comment: comment.trim() || undefined,
      });
      setResult(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  if (context.alreadySubmitted) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center space-y-2">
        <p className="text-lg font-semibold">Thank you!</p>
        <p className="text-sm text-muted-foreground">
          You already shared feedback for your visit at {context.branchName}.
        </p>
        {context.submittedRating != null && (
          <p className="text-sm font-medium">Your rating: {context.submittedRating}/5</p>
        )}
      </div>
    );
  }

  if (result) {
    return (
      <div className="rounded-2xl border bg-card p-6 space-y-4 text-center">
        <p className="text-lg font-semibold">{result.thankYouMessage}</p>
        {result.promptGoogleReview && result.googleReviewUrl && (
          <a
            href={result.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Share on Google
          </a>
        )}
        {result.recoveryCreated && (
          <p className="text-xs text-muted-foreground">
            Your feedback was sent privately to the branch manager so we can improve.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6 space-y-5">
      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">{context.branchName}</p>
        <h1 className="text-xl font-semibold">Hi {context.customerFirstName}, how was your visit?</h1>
        <p className="text-sm text-muted-foreground">Tap a star — takes 10 seconds.</p>
      </div>

      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`Rate ${value} stars`}
            onMouseEnter={() => setHover(value)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setRating(value)}
            className="p-1"
          >
            <Star
              className={`w-10 h-10 ${
                value <= displayRating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>

      {showRecoveryFields && (
        <div className="space-y-3">
          <p className="text-sm font-medium">What could we improve?</p>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  tags.includes(tag.id) ? "bg-foreground text-background" : ""
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional comment"
            rows={3}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={submitting || rating == null}
        onClick={() => void submit()}
        className="w-full min-h-12 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit feedback"}
      </button>
    </div>
  );
}
