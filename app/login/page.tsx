import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="login-page">
      <section className="login-panel">
        <h1>Acceso al sistema</h1>
        <p>Ingresa con Supabase Auth para proteger ventas, inventario y reportes.</p>
        <LoginForm />
      </section>
    </div>
  );
}
