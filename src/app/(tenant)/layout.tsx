export const dynamic = "force-dynamic";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(46,134,193,0.12),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#eef5fb_100%)]">{children}</div>;
}
