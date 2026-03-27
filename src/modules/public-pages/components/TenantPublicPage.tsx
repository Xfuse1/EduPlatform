import type { ResolvedTenant } from "@/lib/tenant";
import { TeacherLanding } from "@/modules/public-pages/components/TeacherLanding";

type TenantPublicPageProps = {
  tenant: ResolvedTenant;
  teacher: {
    id: string;
    name: string;
    logoUrl: string | null;
    themeColor: string;
    region: string | null;
    bio: string | null;
    subjects: string[];
  };
  groups: Array<{
    id: string;
    name: string;
    subject: string;
    gradeLevel: string;
    room: string | null;
    days: string[];
    timeStart: string;
    timeEnd: string;
    monthlyFee: number;
    maxCapacity: number;
    enrolledCount: number;
    remainingCapacity: number;
    color: string | null;
    isFull: boolean;
  }>;
};

export default async function TenantPublicPage(props: TenantPublicPageProps) {
  const groups = props.groups.map((group) => ({
    ...group,
    color: group.color ?? undefined,
  }));

  return <TeacherLanding groups={groups} teacher={props.teacher} />;
}
