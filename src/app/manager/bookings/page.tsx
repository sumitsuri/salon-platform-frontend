"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AntrahqLoading } from "@/components/brand/AntrahqLoading";

/** Bookings merged into Visits → History tab. Keep this route for deep links. */
export default function ManagerBookingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/manager/walk-in?tab=history");
  }, [router]);
  return <AntrahqLoading label="Loading..." />;
}
