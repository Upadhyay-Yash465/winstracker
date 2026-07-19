"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSession, destroySession, getSession } from "./auth";
import * as data from "./data";
import { CATEGORIES } from "./categories";

type FormState = { error: string } | null;

export async function signup(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!email.includes("@")) return { error: "Enter a valid email." };
  if (!name) return { error: "Enter your name." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (await data.findUserByEmail(email)) return { error: "An account with that email already exists." };

  const hash = await bcrypt.hash(password, 10);
  const user = await data.createUser(email, name, hash);
  await createSession(user.id, user.name);
  redirect("/");
}

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  const user = await data.findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  await createSession(user.id, user.name);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function addWin(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const category = String(form.get("category") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const feeling = String(form.get("feeling") ?? "").trim();
  const proud = String(form.get("proud") ?? "").trim();
  const date = String(form.get("date") ?? "");

  if (!(category in CATEGORIES)) return { error: "Unknown category." };
  if (!title) return { error: "Give your win a title." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a date." };

  await data.addWin({
    userId: session.userId,
    category,
    title,
    description,
    feeling,
    proud,
    date,
  });
  revalidatePath(`/category/${category}`);
  return null;
}

export async function deleteWin(form: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const id = String(form.get("id") ?? "");
  const category = String(form.get("category") ?? "");
  await data.deleteWin(id, session.userId);
  revalidatePath(`/category/${category}`);
}
