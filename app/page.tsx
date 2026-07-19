import Link from "next/link";
import { redirect } from "next/navigation";
import Clock from "@/components/Clock";
import Quote from "@/components/Quote";
import { getSession } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { CATEGORIES } from "@/lib/categories";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="home">
      <div className="home-top">
        <form action={logout}>
          <button className="btn-ghost" type="submit">
            Sign out
          </button>
        </form>
      </div>

      <Clock />

      <h1 className="greeting">
        {greeting()}, {session.name}
      </h1>

      <nav className="categories">
        {Object.entries(CATEGORIES).map(([slug, c]) => (
          <Link key={slug} href={`/category/${slug}`} className="category-tile">
            <div className="label">{c.label}</div>
          </Link>
        ))}
      </nav>

      <Quote />
    </main>
  );
}
