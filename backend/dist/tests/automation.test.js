import { describe, expect, it } from "vitest";
import { deriveAutomationActions } from "../src/services/automation.js";
describe("deriveAutomationActions", () => {
    it("creates a calendar event for meeting requests", () => {
        const actions = deriveAutomationActions({
            intent: "schedule_meeting",
            entities: { urgency: "medium" },
            summary: "Meeting requested"
        }, "Quarterly review");
        expect(actions[0]?.type).toBe("event");
    });
    it("creates a follow-up task with parsed due date", () => {
        const actions = deriveAutomationActions({
            intent: "follow_up",
            entities: { urgency: "medium", followUpDays: 3 },
            summary: "Follow-up requested"
        }, "Policy renewal");
        expect(actions[0]?.type).toBe("task");
        if (actions[0]?.type === "task") {
            expect(actions[0].title).toContain("Follow up");
        }
    });
});
