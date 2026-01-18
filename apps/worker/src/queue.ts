import { Queue, Worker } from "bullmq";
import { env } from "./env";

export const scanQueueName = "scan-jobs";

export const connection = {
  url: env.redisUrl,
};

export function createScanQueue() {
  return new Queue(scanQueueName, { connection });
}

export function createScanWorker(processor: Worker<any, any>['processor']) {
  return new Worker(scanQueueName, processor, { connection });
}
