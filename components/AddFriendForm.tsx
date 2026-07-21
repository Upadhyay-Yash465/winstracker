"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendFriendRequest } from "@/lib/actions";

export default function AddFriendForm() {
  const [state, action, pending] = useActionState(sendFriendRequest, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state?.ok) formRef.current?.reset();
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={action} className="add-win-form">
      <label htmlFor="email">Add a friend by email</label>
      <input
        id="email"
        name="email"
        type="email"
        required
        placeholder="their@email.com"
      />

      {state?.error && <p className="error">{state.error}</p>}
      {state?.ok && <p className="saved">Request sent.</p>}

      <div className="form-actions">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </button>
      </div>
    </form>
  );
}
