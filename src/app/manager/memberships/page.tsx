import { Suspense } from "react";
import ManagerMembershipsPage from "./memberships-client";
import { AntrahqLoading } from "@/components/brand/AntrahqLoading";

export default function Page() {
  return (
    <Suspense fallback={<AntrahqLoading label="Loading..." />}>
      <ManagerMembershipsPage />
    </Suspense>
  );
}
