import Link from "next/link";

export default function Home() {
  return (
    <section className="panel">
      <h2>Professional Services Workflow Automation</h2>
      <p>
        Multi-tenant SaaS platform with Microsoft SSO, AI-assisted email drafting,
        calendar automation, and task orchestration.
      </p>
      <div className="actions">
        <Link href="/login" className="button">Sign in with Microsoft</Link>
        <Link href="/dashboard" className="button secondary">Open Dashboard</Link>
      </div>
    </section>
  );
}
