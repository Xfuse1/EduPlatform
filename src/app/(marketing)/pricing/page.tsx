import EmptyState from '@/components/shared/EmptyState'

export default function PricingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-16">
      <EmptyState
        title="صفحة الأسعار قيد الإعداد"
        message="سيتم نشر صفحة الأسعار التسويقية مع اكتمال المحتوى العام للمنصة."
      />
    </main>
  )
}
