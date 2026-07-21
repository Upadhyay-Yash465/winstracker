import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
} from "@/lib/data";
import { acceptFriend, removeFriend } from "@/lib/actions";
import AddFriendForm from "@/components/AddFriendForm";

export default async function FriendsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [friends, incoming, outgoing] = await Promise.all([
    listFriends(session.userId),
    listIncomingRequests(session.userId),
    listOutgoingRequests(session.userId),
  ]);

  return (
    <main className="category-page">
      <div className="category-head">
        <h1>Friends</h1>
        <Link href="/" className="btn-ghost">
          ← Home
        </Link>
      </div>

      <AddFriendForm />

      {incoming.length > 0 && (
        <section className="friend-section">
          <h2 className="friend-h">Requests</h2>
          {incoming.map((u) => (
            <div key={u.id} className="friend-row">
              <Link href={`/u/${u.id}`} className="friend-name">
                {u.name}
              </Link>
              <div className="friend-actions">
                <form action={acceptFriend}>
                  <input type="hidden" name="otherId" value={u.id} />
                  <button className="btn-ghost" type="submit">
                    Accept
                  </button>
                </form>
                <form action={removeFriend}>
                  <input type="hidden" name="otherId" value={u.id} />
                  <button className="btn-ghost" type="submit">
                    Decline
                  </button>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="friend-section">
        <h2 className="friend-h">Your friends</h2>
        {friends.length === 0 && <p className="empty">No friends yet.</p>}
        {friends.map((u) => (
          <div key={u.id} className="friend-row">
            <Link href={`/u/${u.id}`} className="friend-name">
              {u.name}
            </Link>
            <form action={removeFriend}>
              <input type="hidden" name="otherId" value={u.id} />
              <button className="btn-ghost" type="submit">
                Remove
              </button>
            </form>
          </div>
        ))}
      </section>

      {outgoing.length > 0 && (
        <section className="friend-section">
          <h2 className="friend-h">Pending</h2>
          {outgoing.map((u) => (
            <div key={u.id} className="friend-row">
              <span className="friend-name">{u.name}</span>
              <form action={removeFriend}>
                <input type="hidden" name="otherId" value={u.id} />
                <button className="btn-ghost" type="submit">
                  Cancel
                </button>
              </form>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
