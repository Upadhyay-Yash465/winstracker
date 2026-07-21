"use client";

import { useActionState } from "react";
import { verifyOtp, resendOtp } from "@/lib/actions";

export default function VerifyForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(verifyOtp, null);

  return (
    <div className="login-card">
      <h1>Check your email</h1>
      <p className="sub">
        We sent a 6-digit code to <strong>{email}</strong>.
      </p>

      <form action={action}>
        <label htmlFor="code">Verification code</label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          placeholder="000000"
        />

        {state?.error && <p className="error">{state.error}</p>}

        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Verifying…" : "Verify"}
        </button>
      </form>

      <div className="login-switch">
        <form action={resendOtp}>
          <button className="btn-ghost" type="submit">
            Resend code
          </button>
        </form>
      </div>
    </div>
  );
}
