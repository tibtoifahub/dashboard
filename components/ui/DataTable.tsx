"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable
} from "@tanstack/react-table";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
}

export function DataTable<TData>({ columns, data }: DataTableProps<TData>) {
  const { t } = useTranslation();
  const [pageSize, setPageSize] = useState(50);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize
      }
    }
  });

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border-2 border-slate-200 bg-white shadow-md">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gradient-to-r from-slate-700 to-slate-600 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="min-h-[52px] align-top px-4 py-3 text-left font-semibold"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {table.getRowModel().rows.map((row, idx) => (
              <tr 
                key={row.id} 
                className={`border-t border-slate-100 transition-colors ${
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                } hover:bg-blue-50 hover:shadow-sm`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-left align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">
                  {t("common.noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <div>
          {t("common.page")} {table.getState().pagination.pageIndex + 1} {t("common.of")} {table.getPageCount() || 1}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t("common.previous")}
          </button>
          <button
            className="rounded border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t("common.next")}
          </button>
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1.5 font-medium hover:bg-slate-50 transition-colors"
            value={pageSize}
            onChange={(e) => {
              const size = Number(e.target.value);
              setPageSize(size);
              table.setPageSize(size);
            }}
          >
            {[25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} {t("common.perPage")}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

