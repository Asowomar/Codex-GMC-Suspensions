import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { scanId: string } }) {
  const scan = await prisma.scan.findUnique({
    where: { id: params.scanId },
    include: {
      pages: { take: 10 },
    },
  });

  if (!scan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: scan.id,
    status: scan.status,
    progress: scan.progress,
    score: scan.score,
    topIssues: scan.topIssues,
    sheetUrl: scan.sheetUrl,
    errorMessage: scan.errorMessage,
    pagesPreview: scan.pages.map((p) => ({ url: p.url, severitySummary: p.severitySummary })),
  });
}
