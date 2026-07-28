import { Suspense } from "react";
import WalkInPage from "./walk-in-client";
import { AntrahqLoading } from "@/components/brand/AntrahqLoading";

export default function Page() {
  return (
    <Suspense fallback={<AntrahqLoading label="Loading..." />}>
      <WalkInPage />
    </Suspense>
  );
}
