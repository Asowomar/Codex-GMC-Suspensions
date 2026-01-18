import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { scanQueue } from "@/lib/queue";
import { coerceUrlInput, normalizeUrl, validateSafeUrl } from "@gmc/shared";

const schema = z.object({
  domain: z.string().url(),
  mode: z.enum(["QUICK", "FULL"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const cost = parsed.data.mode === "FULL" ? 5 : 1;
  if (user.credits < cost) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  const coerced = coerceUrlInput(parsed.data.domain);
  if (!coerced) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }
  const normalized = normalizeUrl(coerced);
  if (!normalized) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }
  try {
    validateSafeUrl(normalized, normalized, true);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Domain blocked" }, { status: 400 });
  }

  const scan = await prisma.scan.create({
    data: {
      domain: normalized,
      mode: parsed.data.mode,
      status: "QUEUED",
      requestedEmail: session.user.email,
      progress: 0,
      user: { connect: { email: session.user.email } },
    },
  });

  await prisma.user.update({
    where: { email: session.user.email },
    data: { credits: { decrement: cost } },
  });

  await scanQueue.add("scan", { scanId: scan.id });

  return NextResponse.json({ scanId: scan.id });
}
