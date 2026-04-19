import { describe, expect, it } from "vitest";
import { llmService } from "../src/services/llm.js";
describe("llmService", () => {
    it("detects scheduling intent", async () => {
        const parsed = await llmService.analyze("Please schedule a meeting for next week.");
        expect(parsed.intent).toBe("schedule_meeting");
    });
    it("detects follow-up intent and extracts days", async () => {
        const parsed = await llmService.analyze("Can you follow up in 5 days?");
        expect(parsed.intent).toBe("follow_up");
        expect(parsed.entities.followUpDays).toBe(5);
    });
});
