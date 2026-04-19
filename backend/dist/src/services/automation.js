import { addDays } from "./date.js";
export function deriveAutomationActions(parsed, subject) {
    if (parsed.intent === "schedule_meeting") {
        const start = addDays(new Date(), 1);
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        return [{ type: "event", title: `Meeting: ${subject}`, startTime: start, endTime: end }];
    }
    if (parsed.intent === "follow_up") {
        const dueDate = addDays(new Date(), parsed.entities.followUpDays ?? 3);
        return [{ type: "task", title: `Follow up: ${subject}`, dueDate }];
    }
    return [];
}
