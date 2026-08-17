"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AntrahqLoading } from "@/components/brand/AntrahqLoading";
import { buildWalkInUrl } from "@/lib/navigation-scope";

/** Bookings merged into Visits → History tab. Keep this route for deep links. */
export default function ManagerBookingsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const customerId = searchParams.get("customerId") || undefined;
    const detailBookingId = searchParams.get("detailBookingId") || undefined;
    router.replace(
      buildWalkInUrl({
        tab: "history",
        customerId,
        detailBookingId,
      })
    );
  }, [router, searchParams]);

  return <AntrahqLoading label="Loading..." />;
}
