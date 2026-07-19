"use client";

import { useActionState, useState } from "react";
import { login, signup } from "@/lib/actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState(login, null);
  const [signupState, signupAction, signupPending] = useActionState(signup, null);

  const isLogin = mode === "login";
  const state = isLogin ? loginState : signupState;
  const pending = isLogin ? loginPending : signupPending;

  return (
    <main className="login">
      <div className="login-card">
        <h1>Wins</h1>
        <p className="sub">A quiet place to keep your wins.</p>

        <form action={isLogin ? loginAction : signupAction}>
          {!isLogin && (
            <>
              <label htmlFor="name">Name</label>
              <input id="name" name="name" required placeholder="What should we call you?" />
            </>
          )}

          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required placeholder="you@example.com" />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={isLogin ? undefined : 8}
            placeholder={isLogin ? "Your password" : "At least 8 characters"}
          />

          {state?.error && <p className="error">{state.error}</p>}

          <button className="btn" type="submit" disabled={pending}>
            {pending ? "One moment…" : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="login-switch">
          <button
            className="btn-ghost"
            type="button"
            onClick={() => setMode(isLogin ? "signup" : "login")}
          >
            {isLogin ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
