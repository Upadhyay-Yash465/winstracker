import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { findUserById } from "@/lib/data";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await findUserById(session.userId);
  if (!user) redirect("/login");

  return (
    <main className="category-page">
      <div className="category-head">
        <h1>Profile</h1>
        <Link href="/" className="btn-ghost">
          ← Home
        </Link>
      </div>
      <p className="category-blurb">{user.email}</p>

      <ProfileForm name={user.name} bio={user.bio} />
    </main>
  );
}
