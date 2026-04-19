import { prisma } from "../lib/prisma.js";
import { llmService } from "./llm.js";
import { deriveAutomationActions } from "./automation.js";
import { encryptText } from "./crypto.js";

export async function processIncomingEmail(emailId: string): Promise<void> {
  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) {
    return;
  }

  const parsed = await llmService.analyze(email.body);
  const aiResponse = await llmService.generateReply(parsed);

  await prisma.email.update({
    where: { id: email.id },
    data: {
      aiResponse,
      parsedIntent: parsed.intent,
      status: "processed",
      encryptedBody: encryptText(email.body)
    }
  });

  const actions = deriveAutomationActions(parsed, email.subject);

  for (const action of actions) {
    if (action.type === "task") {
      await prisma.task.create({
        data: {
          tenantId: email.tenantId,
          title: action.title,
          dueDate: action.dueDate,
          status: "open",
          assignedUserId: email.userId
        }
      });
    }

    if (action.type === "event") {
      await prisma.event.create({
        data: {
          tenantId: email.tenantId,
          title: action.title,
          startTime: action.startTime,
          endTime: action.endTime,
          createdByUserId: email.userId
        }
      });
    }
  }
}
