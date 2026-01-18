import { Queue } from "bullmq";

const connection = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
};

export const scanQueueName = "scan-jobs";

export const scanQueue = new Queue(scanQueueName, { connection });
