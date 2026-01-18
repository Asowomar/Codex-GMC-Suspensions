import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { scanQueue } from "@/lib/queue";
import { coerceUrlInput, normalizeUrl, validateSafeUrl } from "@gmc/shared";

const schema = z.object({
  domain: z.string().url(),
  email: z.string().email(),
  consent: z.boolean(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (!parsed.data.consent) {
    return NextResponse.json({ error: "Consent required" }, { status: 400 });
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
      mode: "QUICK",
      status: "QUEUED",
      requestedEmail: parsed.data.email,
      progress: 0,
    },
  });

  await prisma.lead.create({
    data: {
      email: parsed.data.email,
      domain: parsed.data.domain,
      consent: parsed.data.consent,
      scanId: scan.id,
    },
  });

  await scanQueue.add("scan", { scanId: scan.id });

  return NextResponse.json({ scanId: scan.id });
}
