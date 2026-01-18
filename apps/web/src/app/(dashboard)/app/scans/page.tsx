import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function ScansPage() {
  const session = await auth();
  const scans = await prisma.scan.findMany({
    where: { user: { email: session?.user?.email || undefined } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Your scans</h2>
        <a href="/app/new-scan" className="rounded-2xl bg-ink text-white px-4 py-2">
          New scan
        </a>
      </div>
      <div className="card p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2">Domain</th>
              <th>Status</th>
              <th>Score</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {scans.map((scan) => (
              <tr key={scan.id} className="border-t">
                <td className="py-2 text-ink font-medium">
                  <a href={`/app/scans/${scan.id}`} className="hover:underline">
                    {scan.domain}
                  </a>
                </td>
                <td>{scan.status}</td>
                <td>{scan.score ?? "-"}</td>
                <td>{scan.createdAt.toISOString().slice(0, 10)}</td>
                <td className="text-right">
                  {scan.sheetUrl && (
                    <a href={scan.sheetUrl} target="_blank" className="text-accent font-semibold">
                      Open Sheet
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
