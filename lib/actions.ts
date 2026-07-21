"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createSession,
  destroySession,
  getSession,
  createPending,
  getPending,
  destroyPending,
} from "./auth";
import * as data from "./data";
import type { User, Visibility } from "./data";
import { CATEGORIES } from "./categories";
import { sendOtpEmail } from "./email";

type FormState = { error?: string; ok?: boolean } | null;

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const VISIBILITIES: Visibility[] = ["private", "friends", "public"];

// Generate a 6-digit code, store its hash + expiry on the user, and email it.
async function issueOtp(user: User): Promise<void> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const otpHash = await bcrypt.hash(code, 10);
  await data.setUserOtp(user.id, otpHash, Date.now() + OTP_TTL_MS);
  await sendOtpEmail(user.email, code);
}

export async function signup(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!email.includes("@")) return { error: "Enter a valid email." };
  if (!name) return { error: "Enter your name." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const existing = await data.findUserByEmail(email);
  if (existing?.emailVerified) {
    return { error: "An account with that email already exists." };
  }

  const hash = await bcrypt.hash(password, 10);
  let user: User;
  if (existing) {
    // Unverified retry — let the latest details win, then re-send a code.
    await data.updateProfile(existing.id, name, existing.bio);
    await data.updatePassword(existing.id, hash);
    user = { ...existing, name, passwordHash: hash };
  } else {
    user = await data.createUser(email, name, hash);
  }

  await issueOtp(user);
  await createPending(user.id);
  redirect("/verify");
}

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  const user = await data.findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  if (!user.emailVerified) {
    await issueOtp(user);
    await createPending(user.id);
    redirect("/verify");
  }

  await createSession(user.id, user.name);
  redirect("/");
}

export async function verifyOtp(_prev: FormState, form: FormData): Promise<FormState> {
  const userId = await getPending();
  if (!userId) redirect("/login");

  const user = await data.findUserById(userId);
  if (!user) {
    await destroyPending();
    redirect("/login");
  }

  const code = String(form.get("code") ?? "").trim();
  if (!user.otpHash || !user.otpExpires) return { error: "Request a new code." };
  if (Date.now() > user.otpExpires) return { error: "That code expired. Resend a new one." };
  if ((user.otpAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
    return { error: "Too many attempts. Resend a new code." };
  }
  if (!(await bcrypt.compare(code, user.otpHash))) {
    await data.incrementOtpAttempts(user.id);
    return { error: "That code isn't right." };
  }

  await data.markEmailVerified(user.id);
  await destroyPending();
  await createSession(user.id, user.name);
  redirect("/");
}

export async function resendOtp() {
  const userId = await getPending();
  if (!userId) redirect("/login");
  const user = await data.findUserById(userId);
  if (!user) {
    await destroyPending();
    redirect("/login");
  }
  await issueOtp(user);
  redirect("/verify");
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
  const raw = String(form.get("visibility") ?? "private") as Visibility;
  const visibility: Visibility = VISIBILITIES.includes(raw) ? raw : "private";

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
    visibility,
  });
  revalidatePath(`/category/${category}`);
  return { ok: true };
}

export async function deleteWin(form: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const id = String(form.get("id") ?? "");
  const category = String(form.get("category") ?? "");
  await data.deleteWin(id, session.userId);
  revalidatePath(`/category/${category}`);
}

// ---------- profile ----------

export async function updateProfile(
  _prev: FormState,
  form: FormData
): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const name = String(form.get("name") ?? "").trim();
  const bio = String(form.get("bio") ?? "").trim().slice(0, 300);
  if (!name) return { error: "Enter your name." };

  await data.updateProfile(session.userId, name, bio);
  // Session carries the name (baked into the JWT) — refresh it if it changed.
  if (name !== session.name) await createSession(session.userId, name);
  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true };
}

export async function changePassword(
  _prev: FormState,
  form: FormData
): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");

  const user = await data.findUserById(session.userId);
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "Current password is incorrect." };
  }
  if (next.length < 8) return { error: "New password must be at least 8 characters." };

  await data.updatePassword(user.id, await bcrypt.hash(next, 10));
  return { ok: true };
}

// ---------- friends ----------

export async function sendFriendRequest(
  _prev: FormState,
  form: FormData
): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { error: "Enter a valid email." };

  const err = await data.sendFriendRequest(session.userId, email);
  if (err) return { error: err };
  revalidatePath("/friends");
  return { ok: true };
}

export async function acceptFriend(form: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const otherId = String(form.get("otherId") ?? "");
  await data.acceptFriendRequest(session.userId, otherId);
  revalidatePath("/friends");
  revalidatePath(`/u/${otherId}`);
}

export async function removeFriend(form: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const otherId = String(form.get("otherId") ?? "");
  await data.removeFriendship(session.userId, otherId);
  revalidatePath("/friends");
  revalidatePath(`/u/${otherId}`);
}

// Friend request from a profile page, where we have the target's id not email.
export async function requestFriend(form: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const otherId = String(form.get("otherId") ?? "");
  const other = await data.findUserById(otherId);
  if (other) await data.sendFriendRequest(session.userId, other.email);
  revalidatePath("/friends");
  revalidatePath(`/u/${otherId}`);
}
