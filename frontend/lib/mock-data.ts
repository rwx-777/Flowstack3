export const overview = {
  processedEmails: 27,
  pendingTasks: 8,
  upcomingEvents: 5,
  aiDraftsReady: 19
};

export const recentEmails = [
  {
    id: "1",
    subject: "Schedule meeting with ACME Legal",
    aiDraft: "Thank you. We can schedule this and share openings this afternoon."
  },
  {
    id: "2",
    subject: "Follow up in 3 days",
    aiDraft: "Noted. We have created a follow-up task for your request."
  }
];

export const tasks = [
  { id: "t1", title: "Follow up: Policy renewal", status: "open", dueDate: "2026-04-22" },
  { id: "t2", title: "Prepare broker documentation", status: "in_progress", dueDate: "2026-04-20" }
];

export const events = [
  { id: "e1", title: "Client onboarding call", start: "2026-04-20 10:00", view: "Week" },
  { id: "e2", title: "Case review", start: "2026-04-21 15:00", view: "Month" }
];

export const clients = [
  { id: "c1", name: "ACME Legal", owner: "Jordan", stage: "Active" },
  { id: "c2", name: "Northway Brokers", owner: "Sam", stage: "Prospect" }
];
