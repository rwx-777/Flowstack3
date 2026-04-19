export type ParsedEmail = {
  intent: "schedule_meeting" | "follow_up" | "general";
  entities: {
    clientName?: string;
    urgency: "low" | "medium" | "high";
    followUpDays?: number;
  };
  summary: string;
};

export class LLMService {
  async analyze(body: string): Promise<ParsedEmail> {
    const lower = body.toLowerCase();
    const followUpMatch = lower.match(/follow up in (\d+) day/);

    if (lower.includes("schedule") && lower.includes("meeting")) {
      return {
        intent: "schedule_meeting",
        entities: { urgency: lower.includes("urgent") ? "high" : "medium" },
        summary: "Client requested meeting scheduling."
      };
    }

    if (followUpMatch) {
      return {
        intent: "follow_up",
        entities: { urgency: "medium", followUpDays: Number(followUpMatch[1]) },
        summary: "Client asked for a timed follow-up."
      };
    }

    return {
      intent: "general",
      entities: { urgency: lower.includes("urgent") ? "high" : "low" },
      summary: "General inbound client message."
    };
  }

  async generateReply(parsed: ParsedEmail): Promise<string> {
    switch (parsed.intent) {
      case "schedule_meeting":
        return "Thanks for your message. We can schedule a meeting and will share available slots shortly.";
      case "follow_up":
        return "Thank you. We have logged your request and will follow up within the requested timeline.";
      default:
        return "Thank you for reaching out. We have received your message and will respond soon.";
    }
  }
}

export const llmService = new LLMService();
