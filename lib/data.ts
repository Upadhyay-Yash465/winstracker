import { MongoClient, ObjectId, type Db } from "mongodb";

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
};

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
};

const uri = process.env.MONGODB_URI;

// Cache the client across hot reloads in dev.
const g = globalThis as unknown as {
  _mongo?: Promise<MongoClient>;
  _mem?: { users: User[]; wins: Win[] };
};

function getDb(): Promise<Db> {
  g._mongo ??= new MongoClient(uri!).connect();
  return g._mongo.then((c) => c.db("wins-tracker"));
}

// ponytail: no MONGODB_URI -> in-memory store so the MVP runs before Mongo is
// linked. Data resets on restart. Delete this branch once Mongo is connected.
const mem = (g._mem ??= { users: [], wins: [] });

export async function findUserByEmail(email: string): Promise<User | null> {
  if (!uri) return mem.users.find((u) => u.email === email) ?? null;
  const db = await getDb();
  const doc = await db.collection("users").findOne({ email });
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    passwordHash: doc.passwordHash,
  };
}

export async function createUser(
  email: string,
  name: string,
  passwordHash: string
): Promise<User> {
  if (!uri) {
    const user: User = { id: crypto.randomUUID(), email, name, passwordHash };
    mem.users.push(user);
    return user;
  }
  const db = await getDb();
  const res = await db
    .collection("users")
    .insertOne({ email, name, passwordHash, createdAt: new Date() });
  return { id: res.insertedId.toString(), email, name, passwordHash };
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
  return docs.map((d) => ({
    id: d._id.toString(),
    userId: d.userId,
    category: d.category,
    title: d.title,
    description: d.description,
    feeling: d.feeling,
    proud: d.proud,
    date: d.date,
    createdAt: d.createdAt,
  }));
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
