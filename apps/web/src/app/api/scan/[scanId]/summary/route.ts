import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { scanId: string } }) {
  const scan = await prisma.scan.findUnique({ where: { id: params.scanId } });
  if (!scan?.summaryHtml) {
    return new Response("Summary not found", { status: 404 });
  }
  return new Response(scan.summaryHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
