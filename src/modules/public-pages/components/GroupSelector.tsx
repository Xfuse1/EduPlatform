type GroupSelectorProps = {
  groups: Array<{
    id: string
    name: string
    subject: string
    gradeLevel: string
    timeStart: string
    timeEnd: string
    studentCount: number
    maxCapacity: number
    color: string
  }>
  value: string
  onChange: (value: string) => void
}

export default function GroupSelector({
  groups,
  value,
  onChange,
}: GroupSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {groups.map((group) => {
        const selected = value === group.id

        return (
          <button
            key={group.id}
            type="button"
            onClick={() => onChange(group.id)}
            className={`rounded-2xl border px-4 py-4 text-start transition-colors ${
              selected
                ? 'border-sky-600 bg-sky-600 text-white dark:border-sky-400 dark:bg-sky-500 dark:text-slate-950'
                : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-700'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="block text-sm font-semibold">{group.name}</span>
                <span className="mt-1 block text-xs opacity-90">
                  {group.subject} - {group.gradeLevel}
                </span>
              </div>
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: group.color }}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-xs opacity-85">
              <span>
                {group.timeStart} - {group.timeEnd}
              </span>
              <span>
                {group.studentCount} / {group.maxCapacity}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
