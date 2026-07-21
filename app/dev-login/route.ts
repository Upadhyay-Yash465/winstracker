// Temporary dev-only helper for local preview. DELETE before deploy.
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";

export async function GET() {
  if (process.env.NODE_ENV !== "development") redirect("/login");
  await createSession("000000000000000000000000", "Preview");
  redirect("/");
}
