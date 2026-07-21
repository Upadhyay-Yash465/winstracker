import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AddWinForm from "@/components/AddWinForm";
import { getSession } from "@/lib/auth";
import { deleteWin } from "@/lib/actions";
import { CATEGORIES } from "@/lib/categories";
import { listWins } from "@/lib/data";

const VIS_LABEL = { private: "Private", friends: "Friends", public: "Public" } as const;

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = CATEGORIES[slug];
  if (!category) notFound();

  const session = await getSession();
  if (!session) redirect("/login");

  const wins = await listWins(session.userId, slug);

  return (
    <main className="category-page">
      <div className="category-head">
        <h1>{category.label}</h1>
        <Link href="/" className="btn-ghost">
          ← Home
        </Link>
      </div>

      <AddWinForm category={slug} />

      {wins.length === 0 && (
        <p className="empty">No wins here yet. The first one is waiting.</p>
      )}

      {wins.map((w) => (
        <article key={w.id} className="win">
          <div className="win-top">
            <div className="win-date">{prettyDate(w.date)}</div>
            <span className={`badge badge-${w.visibility}`}>
              {VIS_LABEL[w.visibility]}
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
          <div className="win-foot">
            <form action={deleteWin}>
              <input type="hidden" name="id" value={w.id} />
              <input type="hidden" name="category" value={slug} />
              <button className="btn-ghost" type="submit">
                Remove
              </button>
            </form>
          </div>
        </article>
      ))}
    </main>
  );
}
