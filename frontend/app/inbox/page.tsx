import { recentEmails } from "../../lib/mock-data";

export default function InboxPage() {
  return (
    <section className="stack">
      <h2>Inbox View</h2>
      {recentEmails.map((email) => (
        <article key={email.id} className="card">
          <h3>{email.subject}</h3>
          <p><strong>AI Reply Draft:</strong> {email.aiDraft}</p>
        </article>
      ))}
    </section>
  );
}
