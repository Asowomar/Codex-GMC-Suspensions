import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2),
  pattern: z.string().min(1),
  patternType: z.enum(["KEYWORD", "REGEX"]),
  appliesTo: z.enum(["PRODUCT", "POLICY", "ANY"]).default("ANY"),
  severity: z.enum(["HIGH", "MEDIUM", "LOW", "REVIEW"]),
  message: z.string().min(2),
  enabled: z.boolean().optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).optional(),
  pattern: z.string().min(1).optional(),
  patternType: z.enum(["KEYWORD", "REGEX"]).optional(),
  appliesTo: z.enum(["PRODUCT", "POLICY", "ANY"]).optional(),
  severity: z.enum(["HIGH", "MEDIUM", "LOW", "REVIEW"]).optional(),
  message: z.string().min(2).optional(),
  enabled: z.boolean().optional(),
});

function toCsvValue(value: string | number | boolean | null | undefined) {
  const raw = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, "\"\"")}"`;
  }
  return raw;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rules = await prisma.customRule.findMany({ orderBy: { createdAt: "desc" } });
  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  if (format === "csv") {
    const header = ["name", "pattern", "patternType", "appliesTo", "severity", "message", "enabled"];
    const rows = rules.map((rule) =>
      [
        rule.name,
        rule.pattern,
        rule.patternType,
        rule.appliesTo,
        rule.severity,
        rule.message,
        rule.enabled,
      ].map(toCsvValue)
    );
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    return new Response(csv, {
      status: 200,
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  }
  if (format === "json") {
    return new Response(JSON.stringify(rules, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
  return NextResponse.json({ rules });
}

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
  const rule = await prisma.customRule.create({
    data: {
      name: parsed.data.name,
      pattern: parsed.data.pattern,
      patternType: parsed.data.patternType,
      appliesTo: parsed.data.appliesTo,
      severity: parsed.data.severity,
      message: parsed.data.message,
      enabled: parsed.data.enabled ?? true,
    },
  });
  return NextResponse.json({ rule });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = z.array(schema).safeParse(body?.rules || body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await prisma.customRule.createMany({
    data: parsed.data.map((rule) => ({
      name: rule.name,
      pattern: rule.pattern,
      patternType: rule.patternType,
      appliesTo: rule.appliesTo,
      severity: rule.severity,
      message: rule.message,
      enabled: rule.enabled ?? true,
    })),
  });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { id, ...data } = parsed.data;
  const rule = await prisma.customRule.update({
    where: { id },
    data,
  });
  return NextResponse.json({ rule });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await prisma.customRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
