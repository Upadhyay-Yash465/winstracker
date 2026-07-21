"use client";

import { useActionState } from "react";
import { updateProfile, changePassword } from "@/lib/actions";

export default function ProfileForm({
  name,
  bio,
}: {
  name: string;
  bio: string;
}) {
  const [pState, pAction, pPending] = useActionState(updateProfile, null);
  const [pwState, pwAction, pwPending] = useActionState(changePassword, null);

  return (
    <>
      <form action={pAction} className="add-win-form">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" defaultValue={name} required />

        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={bio}
          maxLength={300}
          placeholder="A line about you (friends see this on your profile)."
        />

        {pState?.error && <p className="error">{pState.error}</p>}
        {pState?.ok && <p className="saved">Saved.</p>}

        <div className="form-actions">
          <button className="btn" type="submit" disabled={pPending}>
            {pPending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>

      <form action={pwAction} className="add-win-form password-form">
        <label htmlFor="current">Current password</label>
        <input id="current" name="current" type="password" required />

        <label htmlFor="next">New password</label>
        <input
          id="next"
          name="next"
          type="password"
          minLength={8}
          required
          placeholder="At least 8 characters"
        />

        {pwState?.error && <p className="error">{pwState.error}</p>}
        {pwState?.ok && <p className="saved">Password changed.</p>}

        <div className="form-actions">
          <button className="btn" type="submit" disabled={pwPending}>
            {pwPending ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
    </>
  );
}
