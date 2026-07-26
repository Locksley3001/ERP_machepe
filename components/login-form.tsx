"use client";

import { LogIn } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = createClient();
    if (!supabase) {
      setMessage("Configura Supabase en .env.local para habilitar inicio de sesion real.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <form className="login-form" onSubmit={signIn}>
      <label className="field">
        <span>Correo</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      <label className="field">
        <span>Contrasena</span>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      </label>
      {message ? <p className="form-message">{message}</p> : null}
      <button className="primary-action" type="submit" disabled={loading}>
        <LogIn size={18} />
        {loading ? "Ingresando" : "Ingresar"}
      </button>
    </form>
  );
}
