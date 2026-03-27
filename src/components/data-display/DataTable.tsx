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
        'overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={joinClasses(
                    'px-5 py-4 text-start text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400',
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
                      'px-5 py-4 align-top text-sm text-slate-700 dark:text-slate-200',
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
