import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "session";
const PENDING = "pending";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-set-AUTH_SECRET-in-production"
);

export type Session = { userId: string; name: string };

export async function createSession(userId: string, name: string) {
  const token = await new SignJWT({ name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime("30d")
    .sign(secret);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { userId: payload.sub as string, name: (payload.name as string) ?? "" };
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

// Pre-verification: after signup we hold the user in a short-lived signed cookie
// (userId only — no email/code in any URL) until they enter the OTP.
export async function createPending(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime("15m")
    .sign(secret);
  (await cookies()).set(PENDING, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 15,
    path: "/",
  });
}

export async function getPending(): Promise<string | null> {
  const token = (await cookies()).get(PENDING)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.sub as string;
  } catch {
    return null;
  }
}

export async function destroyPending() {
  (await cookies()).delete(PENDING);
}
