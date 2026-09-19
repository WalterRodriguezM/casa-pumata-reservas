"use client";

import { useActionState } from "react";
import { iniciarSesion, type LoginState } from "./actions";

const inicial: LoginState = { error: null };

export default function LoginPage() {
  const [state, action, pending] = useActionState(iniciarSesion, inicial);

  return (
    <main className="login">
      <form action={action} className="login-card" noValidate>
        <h1>
          <small>Casa Pumata</small>Iniciar sesión
        </h1>
        {state.error && (
          <div className="alert" role="alert">
            {state.error}
          </div>
        )}
        <label>
          Correo
          <input name="correo" type="email" autoComplete="email" required />
        </label>
        <label>
          Contraseña
          <input
            name="clave"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button className="btn primary" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
