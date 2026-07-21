import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { findUserById, listWinsForViewer, friendStatus } from "@/lib/data";
import { acceptFriend, removeFriend, requestFriend } from "@/lib/actions";
import { CATEGORIES } from "@/lib/categories";

const VIS_LABEL = { private: "Private", friends: "Friends", public: "Public" } as const;

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function FriendButton({ label, otherId, action }: {
  label: string;
  otherId: string;
  action: (form: FormData) => void;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="otherId" value={otherId} />
      <button className="btn-ghost" type="submit">
        {label}
      </button>
    </form>
  );
}

export default async function UserProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await findUserById(id);
  if (!user) notFound();

  const [status, wins] = await Promise.all([
    friendStatus(session.userId, id),
    listWinsForViewer(id, session.userId),
  ]);

  return (
    <main className="category-page">
      <div className="category-head">
        <h1>{user.name}</h1>
        <Link href="/friends" className="btn-ghost">
          ← Friends
        </Link>
      </div>

      {user.bio && <p className="category-blurb">{user.bio}</p>}

      <div className="friend-control">
        {status === "self" && (
          <Link href="/profile" className="btn">
            Edit your profile
          </Link>
        )}
        {status === "none" && (
          <form action={requestFriend}>
            <input type="hidden" name="otherId" value={id} />
            <button className="btn" type="submit">
              Add friend
            </button>
          </form>
        )}
        {status === "outgoing" && (
          <div className="friend-row">
            <span className="friend-name">Request sent</span>
            <FriendButton label="Cancel" otherId={id} action={removeFriend} />
          </div>
        )}
        {status === "incoming" && (
          <div className="friend-actions">
            <FriendButton label="Accept request" otherId={id} action={acceptFriend} />
            <FriendButton label="Decline" otherId={id} action={removeFriend} />
          </div>
        )}
        {status === "friends" && (
          <div className="friend-row">
            <span className="friend-name">Friends</span>
            <FriendButton label="Remove" otherId={id} action={removeFriend} />
          </div>
        )}
      </div>

      {wins.length === 0 && (
        <p className="empty">Nothing shared here yet.</p>
      )}

      {wins.map((w) => (
        <article key={w.id} className="win">
          <div className="win-top">
            <div className="win-date">{prettyDate(w.date)}</div>
            <span className={`badge badge-${w.visibility}`}>
              {CATEGORIES[w.category]?.label ?? w.category} · {VIS_LABEL[w.visibility]}
            </span>
          </div>
          <h2>{w.title}</h2>
          {w.description && <p className="desc">{w.description}</p>}
          {w.feeling && (
            <div className="detail">
              <span className="k">How it felt</span>
              <span className="v">{w.feeling}</span>
            </div>
          )}
          {w.proud && (
            <div className="detail">
              <span className="k">Why it mattered</span>
              <span className="v">{w.proud}</span>
            </div>
          )}
        </article>
      ))}
    </main>
  );
}
