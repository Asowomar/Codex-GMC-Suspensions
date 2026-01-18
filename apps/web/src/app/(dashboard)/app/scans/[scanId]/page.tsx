import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ScanDetailPage({ params }: { params: { scanId: string } }) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }
  const scan = await prisma.scan.findUnique({
    where: { id: params.scanId },
    include: { pages: { take: 50 }, user: { select: { email: true } } },
  });

  if (!scan || !scan.user?.email || scan.user.email !== session.user.email) {
    return <div className="card p-6">Scan not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-display text-2xl">{scan.domain}</h2>
        <p className="text-sm text-slate-600">Status: {scan.status}</p>
        <p className="text-sm text-slate-600">Score: {scan.score ?? "-"}</p>
        {scan.sheetUrl && (
          <a href={scan.sheetUrl} target="_blank" className="inline-block mt-3 text-accent font-semibold">
            Open Sheet
          </a>
        )}
        <a
          href={`/api/scan/${scan.id}/summary`}
          target="_blank"
          className="inline-block mt-3 ml-4 text-accent font-semibold"
        >
          Open HTML Summary
        </a>
      </div>
      <div className="card p-6">
        <h3 className="font-semibold">Pages</h3>
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2">URL</th>
              <th>Type</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {scan.pages.map((page) => (
              <tr key={page.id} className="border-t">
                <td className="py-2 text-ink">{page.url}</td>
                <td>{page.pageType}</td>
                <td>{page.severitySummary ?? "OK"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
