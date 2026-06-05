import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getTenantBySlug } from "@/lib/tenant";
import { extractTenantSlug } from "@/lib/tenant-host";
import MarketingPage, { type MarketingPlan } from "@/modules/marketing/components/MarketingPage";
import { getPlatformConfigValue } from "@/modules/admin/actions";
import { getSubscriptionPlanConfigs, type PlanConfig } from "@/modules/payments/providers/plan-config";
import TenantPublicPage from "@/modules/public-pages/components/TenantPublicPage";
import { getPublicGroups, getPublicTenantProfile } from "@/modules/public-pages/queries";

export const dynamic = "force-dynamic";

// Subdomains that always resolve to the marketing page rather than a tenant.
// extractTenantSlug already returns "" for www/app/localhost/apex/IP/vercel;
// "api" is kept here as an extra reserved name for this route.
const IGNORED_SUBDOMAINS = new Set(["api", ""]);

const priceFormatter = new Intl.NumberFormat("ar-EG");

function formatLimit(value: number, label: string) {
  return value === Number.MAX_SAFE_INTEGER ? `${label} غير محدود` : `حتى ${priceFormatter.format(value)} ${label}`;
}

function formatMarketingPlan(plan: PlanConfig): MarketingPlan {
  const isContactPlan = plan.monthlyPrice === 0;
  const price = isContactPlan ? "تواصل معنا" : `${priceFormatter.format(plan.monthlyPrice)} جنيه`;

  return {
    key: plan.key,
    name: plan.name,
    price,
    isContactPlan,
    features: [
      formatLimit(plan.limits.students, "طالب"),
      formatLimit(plan.limits.groups, "مجموعة"),
      formatLimit(plan.limits.sessions, "حصة"),
      formatLimit(plan.limits.storage, "ميجابايت تخزين"),
    ],
  };
}

async function getMarketingPlans() {
  const plans = await getSubscriptionPlanConfigs();

  return Object.values(plans)
    .filter((plan) => plan.isActive && !plan.deletedAt)
    .map(formatMarketingPlan);
}

export default async function HomePage() {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const middlewareSlug = headerStore.get("x-tenant-slug") ?? "";
  const subdomain = middlewareSlug || extractTenantSlug(host);

  if (IGNORED_SUBDOMAINS.has(subdomain)) {
    const [plans, adminContact] = await Promise.all([
      getMarketingPlans(),
      getPlatformConfigValue("admin_contact"),
    ]);

    return <MarketingPage plans={plans} adminContact={adminContact} />;
  }

  const tenant = await getTenantBySlug(subdomain);

  if (!tenant) {
    notFound();
  }

  const [teacher, groups] = await Promise.all([
    getPublicTenantProfile(tenant.id),
    getPublicGroups(tenant.id),
  ]);

  if (!teacher) {
    notFound();
  }

  return <TenantPublicPage groups={groups} teacher={teacher} tenant={tenant} />;
}
