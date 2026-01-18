import { createScanWorker } from "./queue";
import { processScan } from "./scanProcessor";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

createScanWorker(async (job) => {
  const { scanId } = job.data as { scanId: string };
  try {
    await processScan(scanId);
  } catch (err: any) {
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "FAILED",
        errorMessage: err?.message || "Scan failed",
      },
    });
  }
});

console.log("Worker started");
