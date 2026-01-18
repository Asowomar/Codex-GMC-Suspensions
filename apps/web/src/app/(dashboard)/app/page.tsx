import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardHome() {
  const session = await auth();
  const scansCount = await prisma.scan.count({
    where: { user: { email: session?.user?.email || undefined } },
  });

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-display text-2xl">Welcome back</h2>
        <p className="text-sm text-slate-600">You have {scansCount} scans in your workspace.</p>
        <div className="mt-4 flex gap-3">
          <a href="/app/new-scan" className="rounded-2xl bg-ink text-white px-4 py-2">
            New scan
          </a>
          <a href="/app/scans" className="rounded-2xl border border-slate-300 px-4 py-2">
            View scans
          </a>
        </div>
      </div>
    </div>
  );
}
