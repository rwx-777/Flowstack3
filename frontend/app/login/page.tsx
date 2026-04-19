export default function LoginPage() {
  return (
    <section className="panel">
      <h2>Login</h2>
      <p>Authenticate with Microsoft Entra ID to access your tenant workspace.</p>
      <a className="button" href="http://localhost:4000/auth/login">
        Continue with Microsoft SSO
      </a>
    </section>
  );
}
