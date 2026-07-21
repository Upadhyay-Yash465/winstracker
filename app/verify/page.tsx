import { redirect } from "next/navigation";
import { getPending } from "@/lib/auth";
import { findUserById } from "@/lib/data";
import VerifyForm from "@/components/VerifyForm";

export default async function VerifyPage() {
  const userId = await getPending();
  if (!userId) redirect("/login");
  const user = await findUserById(userId);
  if (!user) redirect("/login");

  return (
    <main className="login">
      <VerifyForm email={user.email} />
    </main>
  );
}
