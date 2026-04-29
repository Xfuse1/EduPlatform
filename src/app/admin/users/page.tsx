import Link from "next/link";

import { getPlatformTenants, getPlatformUsers } from "@/modules/admin/queries";

const roleOptions = [
  { value: "", label: "كل الأدوار" },
  { value: "CENTER_ADMIN", label: "مدير مؤسسة" },
  { value: "ADMIN", label: "أدمن" },
  { value: "MANAGER", label: "مشرف" },
  { value: "TEACHER", label: "معلم" },
  { value: "STUDENT", label: "طالب" },
  { value: "PARENT", label: "ولي أمر" },
  { value: "ASSISTANT", label: "مساعد" },
];

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    role?: string;
    tenantId?: string;
    page?: string;
  }>;
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const q = params.q?.trim() ?? "";
  const role = params.role?.trim() ?? "";
  const tenantId = params.tenantId?.trim() ?? "";
  const page = Math.max(Number(params.page ?? "1") || 1, 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const [usersResult, tenantsResult] = await Promise.all([
    getPlatformUsers({ search: q || undefined, role: role || undefined, tenantId: tenantId || undefined, limit, offset }),
    getPlatformTenants({ limit: 200 }),
  ]);

  const totalPages = Math.max(Math.ceil(usersResult.total / limit), 1);

  const makeUrl = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    if (tenantId) params.set("tenantId", tenantId);
    params.set("page", String(nextPage));
    return `/admin/users?${params.toString()}`;
  };

  return (
    <main className="space-y-6" dir="rtl">
      <header className="rounded-3xl border border-sky-300/20 bg-slate-900/55 p-6 backdrop-blur">
        <h1 className="text-2xl font-extrabold text-white">إدارة المستخدمين</h1>
        <p className="mt-2 text-sm text-slate-300">بحث وتصفية المستخدمين على مستوى كل المؤسسات.</p>
      </header>

      <section className="rounded-3xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur">
        <form className="grid gap-3 lg:grid-cols-4" method="GET">
          <input
            className="rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-sky-300/40"
            defaultValue={q}
            name="q"
            placeholder="ابحث بالاسم أو رقم الهاتف"
          />

          <select
            className="rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
            defaultValue={role}
            name="role"
          >
            {roleOptions.map((item) => (
              <option key={item.value || "all"} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-slate-600 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/40"
            defaultValue={tenantId}
            name="tenantId"
          >
            <option value="">كل المؤسسات</option>
            {tenantsResult.items.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>

          <button className="rounded-xl border border-sky-300/30 bg-sky-300/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-300/25" type="submit">
            تطبيق الفلاتر
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-sky-300/20 bg-slate-900/50 p-4 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-slate-300">عدد النتائج: {usersResult.total}</p>
          <p className="text-xs text-slate-400">صفحة {page} من {totalPages}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-slate-300">
                <th className="px-3 py-2 text-right font-semibold">الاسم</th>
                <th className="px-3 py-2 text-right font-semibold">الهاتف</th>
                <th className="px-3 py-2 text-right font-semibold">الدور</th>
                <th className="px-3 py-2 text-right font-semibold">المؤسسة</th>
                <th className="px-3 py-2 text-right font-semibold">الحالة</th>
                <th className="px-3 py-2 text-right font-semibold">آخر دخول</th>
              </tr>
            </thead>
            <tbody>
              {usersResult.items.map((user) => (
                <tr key={user.id} className="rounded-2xl bg-slate-950/50 text-slate-200">
                  <td className="rounded-r-xl px-3 py-3 font-bold text-white">{user.name}</td>
                  <td className="px-3 py-3">{user.phone}</td>
                  <td className="px-3 py-3">{user.role}</td>
                  <td className="px-3 py-3">
                    {user.tenant.name}
                    <span className="mr-2 text-xs text-slate-400">({user.tenant.slug})</span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        user.isActive
                          ? "border border-emerald-300/30 bg-emerald-400/10 text-emerald-300"
                          : "border border-rose-300/30 bg-rose-400/10 text-rose-300"
                      }`}
                    >
                      {user.isActive ? "نشط" : "غير نشط"}
                    </span>
                  </td>
                  <td className="rounded-l-xl px-3 py-3 text-xs text-slate-400">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("ar-EG") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Link
            href={page > 1 ? makeUrl(page - 1) : "#"}
            className={`rounded-xl border px-4 py-2 text-sm font-bold ${
              page > 1
                ? "border-slate-600 bg-slate-950/40 text-white hover:border-sky-300/35"
                : "cursor-not-allowed border-slate-800 bg-slate-900/30 text-slate-500"
            }`}
          >
            السابق
          </Link>
          <Link
            href={page < totalPages ? makeUrl(page + 1) : "#"}
            className={`rounded-xl border px-4 py-2 text-sm font-bold ${
              page < totalPages
                ? "border-slate-600 bg-slate-950/40 text-white hover:border-sky-300/35"
                : "cursor-not-allowed border-slate-800 bg-slate-900/30 text-slate-500"
            }`}
          >
            التالي
          </Link>
        </div>
      </section>
    </main>
  );
}
