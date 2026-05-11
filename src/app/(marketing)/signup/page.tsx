import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { SignupForm } from "./signup-form";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TeacherSignupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const phone = typeof params.phone === "string" ? params.phone : "";

  return (
    <main
      className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6"
      dir="rtl"
    >
      <Link
        href="/"
        className="absolute end-4 top-4 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-[#94A3B8] backdrop-blur transition hover:bg-white/10 sm:end-6 sm:top-6"
      >
        <ChevronRight className="h-4 w-4" />
        رجوع
      </Link>

      <div className="w-full max-w-[560px] font-[Cairo]">
        <SignupForm initialPhone={phone} />
      </div>
    </main>
  );
}
