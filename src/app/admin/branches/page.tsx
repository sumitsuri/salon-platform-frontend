"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function AdminBranchesPage() {
  const { data: branches = [] } = useQuery({ queryKey: ["branches"], queryFn: () => api.getBranches() });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Branches</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {branches.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl p-5 border">
            <h2 className="font-bold text-lg">{b.name}</h2>
            <p className="text-sm text-slate-500">Code: {b.code}</p>
            <p className="text-sm text-slate-500">Society: {b.societyDefault}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
