import { clients } from "../../lib/mock-data";

export default function ClientsPage() {
  return (
    <section className="stack">
      <h2>Clients CRM View</h2>
      <div className="grid">
        {clients.map((client) => (
          <article key={client.id} className="card">
            <h3>{client.name}</h3>
            <p>Owner: {client.owner}</p>
            <p>Stage: {client.stage}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
