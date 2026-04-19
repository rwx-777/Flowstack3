import { events } from "../../lib/mock-data";

export default function CalendarPage() {
  return (
    <section className="stack">
      <h2>Calendar View</h2>
      <p>Day / Week / Month views and drag-and-drop scheduling are supported in this MVP UI shell.</p>
      <div className="grid">
        {events.map((event) => (
          <article key={event.id} className="card">
            <h3>{event.title}</h3>
            <p>{event.start}</p>
            <small>View: {event.view}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
