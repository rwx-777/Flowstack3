import { overview, recentEmails, tasks } from "../../lib/mock-data";

export default function DashboardPage() {
  return (
    <section className="stack">
      <h2>Main Dashboard</h2>
      <div className="grid">
        <article className="card"><strong>Processed emails:</strong> {overview.processedEmails}</article>
        <article className="card"><strong>Pending tasks:</strong> {overview.pendingTasks}</article>
        <article className="card"><strong>Upcoming events:</strong> {overview.upcomingEvents}</article>
        <article className="card"><strong>AI drafts ready:</strong> {overview.aiDraftsReady}</article>
      </div>

      <article className="card">
        <h3>Recent Emails</h3>
        <ul>
          {recentEmails.map((email) => (
            <li key={email.id}>{email.subject}</li>
          ))}
        </ul>
      </article>

      <article className="card">
        <h3>Tasks</h3>
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>{task.title} — {task.status}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
