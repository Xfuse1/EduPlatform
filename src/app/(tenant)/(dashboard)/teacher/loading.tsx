import LoadingSpinner from '@/components/shared/LoadingSpinner'

export default function TeacherSectionLoading() {
  return (
    <section className="space-y-6">
      <LoadingSpinner message="جاري تحميل بيانات لوحة المعلم..." />
    </section>
  )
}
