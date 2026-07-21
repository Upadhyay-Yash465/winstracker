"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addWin } from "@/lib/actions";

export default function AddWinForm({ category }: { category: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addWin, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  // Close and clear the form after a successful save.
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      formRef.current?.reset();
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  if (!open) {
    return (
      <div className="add-win">
        <button className="btn" type="button" onClick={() => setOpen(true)}>
          + Add a win
        </button>
      </div>
    );
  }

  return (
    <div className="add-win">
      <form ref={formRef} action={action} className="add-win-form">
        <input type="hidden" name="category" value={category} />

        <div className="row">
          <div>
            <label htmlFor="title">The win</label>
            <input id="title" name="title" required placeholder="What happened?" />
          </div>
          <div>
            <label htmlFor="date">Date</label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={new Date(
                Date.now() - new Date().getTimezoneOffset() * 60000
              )
                .toISOString()
                .slice(0, 10)}
            />
          </div>
        </div>

        <label htmlFor="description">A little about it</label>
        <textarea id="description" name="description" placeholder="Talk about what happened." />

        <label htmlFor="feeling">How it made you feel</label>
        <input id="feeling" name="feeling" placeholder="Describe what you felt in the moment." />

        <label htmlFor="proud">What made you proud of it</label>
        <textarea id="proud" name="proud" placeholder="What makes this an accomplishment?" />

        <label htmlFor="visibility">Who can see this</label>
        <select id="visibility" name="visibility" defaultValue="private">
          <option value="private">Private — only me</option>
          <option value="friends">Friends</option>
          <option value="public">Anyone on Wins</option>
        </select>

        {state?.error && <p className="error">{state.error}</p>}

        <div className="form-actions">
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save win"}
          </button>
          <button className="btn-ghost" type="button" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
