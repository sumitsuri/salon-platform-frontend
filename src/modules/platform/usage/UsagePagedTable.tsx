"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ListPageArrows } from "@/components/employee/ListPageArrows";
import { Card, DataTable } from "@/components/ui";
import { useClientPagedList, DEFAULT_LIST_PAGE_SIZE } from "@/lib/use-client-paged-list";

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
  pageSize?: number;
  filterSlot?: ReactNode;
};

export function UsagePagedTable<T>({
  title,
  rows,
  columns,
  rowKey,
  emptyMessage,
  pageSize = DEFAULT_LIST_PAGE_SIZE,
  filterSlot,
}: Props<T>) {
  const [pageSizeState, setPageSizeState] = useState(pageSize);
  const pager = useClientPagedList(rows, pageSizeState);

  const headers = useMemo(() => columns.map((c) => c.header), [columns]);

  return (
    <Card padding={false} className="min-w-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{title}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {filterSlot}
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            Rows
            <select
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
              value={pageSizeState}
              onChange={(e) => setPageSizeState(Number(e.target.value))}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="p-6 text-sm text-center text-[var(--text-tertiary)]">{emptyMessage}</p>
      ) : (
        <>
          <DataTable
            headers={headers}
            mobile={
              <div className="divide-y divide-[var(--border)]">
                {pager.pageItems.map((row) => (
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
            {pager.pageItems.map((row) => (
              <tr key={rowKey(row)} className="border-b border-[var(--border)] last:border-0">
                {columns.map((col) => (
                  <td key={col.id} className="px-4 py-2.5 align-top text-[var(--text-primary)]">
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </DataTable>
          {pager.showPager && (
            <ListPageArrows
              page={pager.page}
              totalPages={pager.totalPages}
              hasPrev={pager.hasPrev}
              hasNext={pager.hasNext}
              onPrev={pager.goPrev}
              onNext={pager.goNext}
            />
          )}
        </>
      )}
    </Card>
  );
}
