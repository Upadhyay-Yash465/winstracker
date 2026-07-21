import { MongoClient, ObjectId, type Db } from "mongodb";
import dns from "node:dns";

// ponytail: some local networks block direct SRV DNS queries (mongodb+srv needs
// them), so point at a public resolver in dev. Vercel resolves SRV natively.
if (!process.env.VERCEL) dns.setServers(["8.8.8.8", "1.1.1.1"]);

export type Visibility = "private" | "friends" | "public";

export type Win = {
  id: string;
  userId: string;
  category: string;
  title: string;
  description: string;
  feeling: string;
  proud: string;
  date: string; // yyyy-mm-dd
  createdAt: string; // ISO
  visibility: Visibility;
};

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  emailVerified: boolean;
  bio: string;
  otpHash?: string;
  otpExpires?: number; // epoch ms
  otpAttempts?: number;
};

export type FriendStatus = "self" | "none" | "friends" | "incoming" | "outgoing";

type Friendship = {
  requesterId: string;
  addresseeId: string;
  status: "pending" | "accepted";
  createdAt: string;
};

export type PublicUser = { id: string; name: string; bio: string };

const uri = process.env.MONGODB_URI;

// Cache the client across hot reloads in dev.
const g = globalThis as unknown as {
  _mongo?: Promise<MongoClient>;
  _mem?: { users: User[]; wins: Win[]; friendships: Friendship[] };
};

function getDb(): Promise<Db> {
  g._mongo ??= new MongoClient(uri!).connect();
  return g._mongo.then((c) => c.db("wins-tracker"));
}

// ponytail: no MONGODB_URI -> in-memory store so the MVP runs before Mongo is
// linked. Data resets on restart. Delete this branch once Mongo is connected.
const mem = (g._mem ??= { users: [], wins: [], friendships: [] });

// ---------- users ----------

function mapUser(doc: Record<string, unknown>): User {
  return {
    id: (doc._id as ObjectId).toString(),
    email: doc.email as string,
    name: doc.name as string,
    passwordHash: doc.passwordHash as string,
    emailVerified: Boolean(doc.emailVerified),
    bio: (doc.bio as string) ?? "",
    otpHash: doc.otpHash as string | undefined,
    otpExpires: doc.otpExpires as number | undefined,
    otpAttempts: doc.otpAttempts as number | undefined,
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  if (!uri) return mem.users.find((u) => u.email === email) ?? null;
  const db = await getDb();
  const doc = await db.collection("users").findOne({ email });
  return doc ? mapUser(doc) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  if (!uri) return mem.users.find((u) => u.id === id) ?? null;
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const doc = await db.collection("users").findOne({ _id: new ObjectId(id) });
  return doc ? mapUser(doc) : null;
}

export async function createUser(
  email: string,
  name: string,
  passwordHash: string
): Promise<User> {
  if (!uri) {
    const user: User = {
      id: crypto.randomUUID(),
      email,
      name,
      passwordHash,
      emailVerified: false,
      bio: "",
    };
    mem.users.push(user);
    return user;
  }
  const db = await getDb();
  const res = await db.collection("users").insertOne({
    email,
    name,
    passwordHash,
    emailVerified: false,
    bio: "",
    createdAt: new Date(),
  });
  return {
    id: res.insertedId.toString(),
    email,
    name,
    passwordHash,
    emailVerified: false,
    bio: "",
  };
}

export async function setUserOtp(
  userId: string,
  otpHash: string,
  otpExpires: number
): Promise<void> {
  if (!uri) {
    const u = mem.users.find((x) => x.id === userId);
    if (u) Object.assign(u, { otpHash, otpExpires, otpAttempts: 0 });
    return;
  }
  const db = await getDb();
  await db
    .collection("users")
    .updateOne(
      { _id: new ObjectId(userId) },
      { $set: { otpHash, otpExpires, otpAttempts: 0 } }
    );
}

export async function incrementOtpAttempts(userId: string): Promise<void> {
  if (!uri) {
    const u = mem.users.find((x) => x.id === userId);
    if (u) u.otpAttempts = (u.otpAttempts ?? 0) + 1;
    return;
  }
  const db = await getDb();
  await db
    .collection("users")
    .updateOne({ _id: new ObjectId(userId) }, { $inc: { otpAttempts: 1 } });
}

export async function markEmailVerified(userId: string): Promise<void> {
  if (!uri) {
    const u = mem.users.find((x) => x.id === userId);
    if (u) {
      u.emailVerified = true;
      delete u.otpHash;
      delete u.otpExpires;
      delete u.otpAttempts;
    }
    return;
  }
  const db = await getDb();
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: { emailVerified: true },
      $unset: { otpHash: "", otpExpires: "", otpAttempts: "" },
    }
  );
}

export async function updateProfile(
  userId: string,
  name: string,
  bio: string
): Promise<void> {
  if (!uri) {
    const u = mem.users.find((x) => x.id === userId);
    if (u) Object.assign(u, { name, bio });
    return;
  }
  const db = await getDb();
  await db
    .collection("users")
    .updateOne({ _id: new ObjectId(userId) }, { $set: { name, bio } });
}

export async function updatePassword(
  userId: string,
  passwordHash: string
): Promise<void> {
  if (!uri) {
    const u = mem.users.find((x) => x.id === userId);
    if (u) u.passwordHash = passwordHash;
    return;
  }
  const db = await getDb();
  await db
    .collection("users")
    .updateOne({ _id: new ObjectId(userId) }, { $set: { passwordHash } });
}

// ---------- wins ----------

function mapWin(d: Record<string, unknown>): Win {
  return {
    id: (d._id as ObjectId).toString(),
    userId: d.userId as string,
    category: d.category as string,
    title: d.title as string,
    description: d.description as string,
    feeling: d.feeling as string,
    proud: d.proud as string,
    date: d.date as string,
    createdAt: d.createdAt as string,
    visibility: (d.visibility as Visibility) ?? "private",
  };
}

export async function listWins(userId: string, category: string): Promise<Win[]> {
  if (!uri) {
    return mem.wins
      .filter((w) => w.userId === userId && w.category === category)
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  const db = await getDb();
  const docs = await db
    .collection("wins")
    .find({ userId, category })
    .sort({ date: -1 })
    .toArray();
  return docs.map(mapWin);
}

// Wins of `ownerId` that `viewerId` is allowed to see, across all categories.
export async function listWinsForViewer(
  ownerId: string,
  viewerId: string
): Promise<Win[]> {
  const allowed: Visibility[] | null =
    ownerId === viewerId
      ? null // owner sees everything
      : (await areFriends(ownerId, viewerId))
        ? ["friends", "public"]
        : ["public"];

  if (!uri) {
    return mem.wins
      .filter(
        (w) => w.userId === ownerId && (!allowed || allowed.includes(w.visibility))
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  const db = await getDb();
  const query: Record<string, unknown> = { userId: ownerId };
  if (allowed) query.visibility = { $in: allowed };
  const docs = await db.collection("wins").find(query).sort({ date: -1 }).toArray();
  return docs.map(mapWin);
}

export async function addWin(win: Omit<Win, "id" | "createdAt">): Promise<void> {
  const createdAt = new Date().toISOString();
  if (!uri) {
    mem.wins.push({ ...win, id: crypto.randomUUID(), createdAt });
    return;
  }
  const db = await getDb();
  await db.collection("wins").insertOne({ ...win, createdAt });
}

export async function deleteWin(id: string, userId: string): Promise<void> {
  if (!uri) {
    const i = mem.wins.findIndex((w) => w.id === id && w.userId === userId);
    if (i !== -1) mem.wins.splice(i, 1);
    return;
  }
  const db = await getDb();
  await db.collection("wins").deleteOne({ _id: new ObjectId(id), userId });
}

// ---------- friendships ----------

async function findFriendship(a: string, b: string): Promise<Friendship | null> {
  if (!uri) {
    return (
      mem.friendships.find(
        (f) =>
          (f.requesterId === a && f.addresseeId === b) ||
          (f.requesterId === b && f.addresseeId === a)
      ) ?? null
    );
  }
  const db = await getDb();
  const doc = await db.collection("friendships").findOne({
    $or: [
      { requesterId: a, addresseeId: b },
      { requesterId: b, addresseeId: a },
    ],
  });
  if (!doc) return null;
  return {
    requesterId: doc.requesterId,
    addresseeId: doc.addresseeId,
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  const f = await findFriendship(a, b);
  return f?.status === "accepted";
}

export async function friendStatus(
  userId: string,
  otherId: string
): Promise<FriendStatus> {
  if (userId === otherId) return "self";
  const f = await findFriendship(userId, otherId);
  if (!f) return "none";
  if (f.status === "accepted") return "friends";
  return f.requesterId === userId ? "outgoing" : "incoming";
}

// Returns an error message, or null on success.
export async function sendFriendRequest(
  fromId: string,
  toEmail: string
): Promise<string | null> {
  const target = await findUserByEmail(toEmail.trim().toLowerCase());
  if (!target) return "No user with that email.";
  if (target.id === fromId) return "That's you.";

  const existing = await findFriendship(fromId, target.id);
  if (existing?.status === "accepted") return "You're already friends.";
  if (existing) {
    return existing.requesterId === fromId
      ? "Request already sent."
      : "They've already sent you a request — accept it from Friends.";
  }

  const doc: Friendship = {
    requesterId: fromId,
    addresseeId: target.id,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  if (!uri) {
    mem.friendships.push(doc);
    return null;
  }
  const db = await getDb();
  await db.collection("friendships").insertOne(doc);
  return null;
}

export async function acceptFriendRequest(
  userId: string,
  requesterId: string
): Promise<void> {
  if (!uri) {
    const f = mem.friendships.find(
      (x) =>
        x.requesterId === requesterId &&
        x.addresseeId === userId &&
        x.status === "pending"
    );
    if (f) f.status = "accepted";
    return;
  }
  const db = await getDb();
  await db
    .collection("friendships")
    .updateOne(
      { requesterId, addresseeId: userId, status: "pending" },
      { $set: { status: "accepted" } }
    );
}

// Decline / cancel / unfriend — removes any friendship between the two.
export async function removeFriendship(
  userId: string,
  otherId: string
): Promise<void> {
  if (!uri) {
    mem.friendships = mem.friendships.filter(
      (f) =>
        !(
          (f.requesterId === userId && f.addresseeId === otherId) ||
          (f.requesterId === otherId && f.addresseeId === userId)
        )
    );
    g._mem!.friendships = mem.friendships;
    return;
  }
  const db = await getDb();
  await db.collection("friendships").deleteOne({
    $or: [
      { requesterId: userId, addresseeId: otherId },
      { requesterId: otherId, addresseeId: userId },
    ],
  });
}

async function usersByIds(ids: string[]): Promise<Map<string, PublicUser>> {
  const map = new Map<string, PublicUser>();
  if (ids.length === 0) return map;
  if (!uri) {
    for (const u of mem.users)
      if (ids.includes(u.id)) map.set(u.id, { id: u.id, name: u.name, bio: u.bio });
    return map;
  }
  const db = await getDb();
  const valid = ids.filter((i) => ObjectId.isValid(i)).map((i) => new ObjectId(i));
  const docs = await db.collection("users").find({ _id: { $in: valid } }).toArray();
  for (const d of docs)
    map.set(d._id.toString(), {
      id: d._id.toString(),
      name: d.name,
      bio: d.bio ?? "",
    });
  return map;
}

async function acceptedFor(userId: string): Promise<Friendship[]> {
  if (!uri) {
    return mem.friendships.filter(
      (f) =>
        f.status === "accepted" &&
        (f.requesterId === userId || f.addresseeId === userId)
    );
  }
  const db = await getDb();
  const docs = await db
    .collection("friendships")
    .find({
      status: "accepted",
      $or: [{ requesterId: userId }, { addresseeId: userId }],
    })
    .toArray();
  return docs.map((d) => ({
    requesterId: d.requesterId,
    addresseeId: d.addresseeId,
    status: d.status,
    createdAt: d.createdAt,
  }));
}

export async function listFriends(userId: string): Promise<PublicUser[]> {
  const rows = await acceptedFor(userId);
  const otherIds = rows.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  );
  const map = await usersByIds(otherIds);
  return otherIds.map((id) => map.get(id)).filter((u): u is PublicUser => !!u);
}

async function pending(
  userId: string,
  field: "addresseeId" | "requesterId"
): Promise<Friendship[]> {
  if (!uri) {
    return mem.friendships.filter(
      (f) => f.status === "pending" && f[field] === userId
    );
  }
  const db = await getDb();
  const docs = await db
    .collection("friendships")
    .find({ status: "pending", [field]: userId })
    .toArray();
  return docs.map((d) => ({
    requesterId: d.requesterId,
    addresseeId: d.addresseeId,
    status: d.status,
    createdAt: d.createdAt,
  }));
}

// People who requested to be your friend (you decide).
export async function listIncomingRequests(userId: string): Promise<PublicUser[]> {
  const rows = await pending(userId, "addresseeId");
  const ids = rows.map((f) => f.requesterId);
  const map = await usersByIds(ids);
  return ids.map((id) => map.get(id)).filter((u): u is PublicUser => !!u);
}

// People you've asked, still waiting.
export async function listOutgoingRequests(userId: string): Promise<PublicUser[]> {
  const rows = await pending(userId, "requesterId");
  const ids = rows.map((f) => f.addresseeId);
  const map = await usersByIds(ids);
  return ids.map((id) => map.get(id)).filter((u): u is PublicUser => !!u);
}
