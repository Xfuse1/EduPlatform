import GroupCard from './GroupCard'

type GroupListProps = {
  groups: Array<{
    id: string
    name: string
    subject: string
    gradeLevel: string
    days: string[]
    timeStart: string
    timeEnd: string
    maxCapacity: number
    monthlyFee: number
    color: string
    room: string | null
    studentCount: number
  }>
}

export default function GroupList({ groups }: GroupListProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} />
      ))}
    </div>
  )
}
