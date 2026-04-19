import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { env, isQueueInlineMode } from "../config/env.js";
import { processIncomingEmail } from "../services/email.js";

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const emailQueue = new Queue("email-processing", { connection });

export async function enqueueEmailProcessing(emailId: string): Promise<void> {
  if (isQueueInlineMode) {
    await processIncomingEmail(emailId);
    return;
  }

  await emailQueue.add("email", { emailId });
}

export function startWorkers(): Worker[] {
  if (isQueueInlineMode) {
    return [];
  }

  const worker = new Worker(
    "email-processing",
    async (job) => {
      await processIncomingEmail(job.data.emailId);
    },
    { connection }
  );

  return [worker];
}
