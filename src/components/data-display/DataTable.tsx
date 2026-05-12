import type { ReactNode } from 'react'

type DataTableColumn<T> = {
  key: string
  header: ReactNode
  className?: string
  render: (row: T) => ReactNode
}

type DataTableProps<T> = {
  data: T[]
  columns: DataTableColumn<T>[]
  rowKey: (row: T) => string
  emptyState?: ReactNode
  className?: string
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function DataTable<T>({
  data,
  columns,
  rowKey,
  emptyState,
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <>{emptyState ?? null}</>
  }

  return (
    <div
      className={joinClasses(
        'max-w-full overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:rounded-[28px]',
        className,
      )}
    >
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="min-w-[640px] divide-y divide-slate-200 dark:divide-slate-800 sm:min-w-full">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={joinClasses(
                    'px-3 py-3 text-start text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-5 sm:py-4',
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/70"
              >
                {columns.map((column) => (
                  <td
                    key={`${rowKey(row)}-${column.key}`}
                    className={joinClasses(
                      'px-3 py-3 align-top text-sm text-slate-700 dark:text-slate-200 sm:px-5 sm:py-4',
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
