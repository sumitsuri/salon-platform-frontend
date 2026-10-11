"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Card, DataTable, TablePagination } from "@/components/ui";

type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  mobileLabel?: string;
};

type Props<T> = {
  title: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  emptyMessage: string;
  toolbar?: ReactNode;
  defaultPageSize?: number;
};

export function UsageStandardTable<T>({
  title,
  rows,
  columns,
  rowKey,
  emptyMessage,
  toolbar,
  defaultPageSize = 10,
}: Props<T>) {
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [rows, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages - 1);

  const pageItems = useMemo(
    () => rows.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [rows, safePage, pageSize],
  );

  const headers = useMemo(() => columns.map((c) => c.header), [columns]);

  return (
    <Card padding={false} className="min-w-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{title}</p>
        {toolbar}
      </div>

      {rows.length === 0 ? (
        <p className="p-6 text-sm text-center text-[var(--text-tertiary)]">{emptyMessage}</p>
      ) : (
        <>
          <DataTable
            headers={headers}
            mobile={
              <div className="divide-y divide-[var(--border)]">
                {pageItems.map((row) => (
                  <div key={rowKey(row)} className="p-4 space-y-2">
                    {columns.map((col) => (
                      <div key={col.id} className="flex justify-between gap-3 text-sm">
                        <span className="text-[var(--text-tertiary)] shrink-0">
                          {col.mobileLabel ?? col.header}
                        </span>
                        <span className="text-[var(--text-primary)] text-right min-w-0">{col.cell(row)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            }
          >
            {pageItems.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)]/50"
              >
                {columns.map((col) => (
                  <td key={col.id} className="px-4 py-3 align-top text-sm text-[var(--text-primary)]">
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </DataTable>
          <TablePagination
            page={safePage}
            size={pageSize}
            totalPages={totalPages}
            totalElements={rows.length}
            onPageChange={setPage}
            onSizeChange={setPageSize}
          />
        </>
      )}
    </Card>
  );
}
