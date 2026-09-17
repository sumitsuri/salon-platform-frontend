"use client";

import { CustomersDirectoryPanel } from "@/components/customer/CustomersDirectoryPanel";
import { AdminPageShell } from "@/components/admin/AdminPageShell";

export default function AdminCustomersPage() {
  return (
    <AdminPageShell>
      <CustomersDirectoryPanel scope="admin" />
    </AdminPageShell>
  );
}
