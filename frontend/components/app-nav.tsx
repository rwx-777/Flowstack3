import Link from "next/link";

const links = [
  { href: "/login", label: "Login" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inbox", label: "Inbox" },
  { href: "/calendar", label: "Calendar" },
  { href: "/clients", label: "Clients" }
];

export function AppNav() {
  return (
    <header className="header">
      <h1>Flowstack3</h1>
      <nav>
        <ul className="nav-list">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
