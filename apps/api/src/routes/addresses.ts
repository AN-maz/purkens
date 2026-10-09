import { Hono } from "hono";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { addresses, createDb } from "../db";
import { requireAuth, type Variables } from "../middleware/auth";
import type { Env } from "../env";

type Db = ReturnType<typeof createDb>;

const TEXT_FIELDS = [
  "label",
  "recipientName",
  "phone",
  "addressLine",
  "city",
  "province",
  "postalCode",
  "country",
  "countryCode",
] as const;

type AddressInput = Partial<Record<(typeof TEXT_FIELDS)[number], string>>;

async function clearOtherDefaults(db: Db, userId: string, exceptId?: string) {
  const condition = exceptId
    ? and(eq(addresses.userId, userId), ne(addresses.id, exceptId))
    : eq(addresses.userId, userId);

  await db
    .update(addresses)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(condition);
}

export const addressRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

addressRoutes.use("*", requireAuth);

addressRoutes.get("/", async (c) => {
  const user = c.get("user");
  const db = createDb(c.env.DB);

  const data = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, user.id))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));

  return c.json({ data });
});

addressRoutes.post("/", async (c) => {
  const body = (await c.req.json().catch(() => null)) as
    | (AddressInput & { isDefault?: unknown })
    | null;

  if (!body || typeof body !== "object") {
    return c.json({ error: "Invalid JSON body." }, 400);
  }

  const values: AddressInput = {};
  for (const field of TEXT_FIELDS) {
    const raw = body[field];
    if (typeof raw !== "string" || raw.trim().length === 0) {
      return c.json({ error: `${field} is required.` }, 400);
    }
    values[field] = raw.trim();
  }

  if (body.isDefault !== undefined && typeof body.isDefault !== "boolean") {
    return c.json({ error: "isDefault must be a boolean." }, 400);
  }

  const user = c.get("user");
  const db = createDb(c.env.DB);

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(addresses)
    .where(eq(addresses.userId, user.id));

  const makeDefault = body.isDefault === true || (row?.count ?? 0) === 0;
  if (makeDefault) {
    await clearOtherDefaults(db, user.id);
  }

  const [created] = await db
    .insert(addresses)
    .values({
      userId: user.id,
      label: values.label!,
      recipientName: values.recipientName!,
      phone: values.phone!,
      addressLine: values.addressLine!,
      city: values.city!,
      province: values.province!,
      postalCode: values.postalCode!,
      country: values.country!,
      countryCode: values.countryCode!.toUpperCase(),
      isDefault: makeDefault,
    })
    .returning();

  return c.json({ data: created }, 201);
});

addressRoutes.patch("/:id", async (c) => {
  const body = (await c.req.json().catch(() => null)) as
    | (AddressInput & { isDefault?: unknown })
    | null;

  if (!body || typeof body !== "object") {
    return c.json({ error: "Invalid JSON body." }, 400);
  }

  const user = c.get("user");
  const db = createDb(c.env.DB);
  const id = c.req.param("id");

  const [existing] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "Address not found." }, 404);
  }

  const updates: AddressInput & { isDefault?: boolean } = {};

  for (const field of TEXT_FIELDS) {
    if (body[field] !== undefined) {
      const raw = body[field];
      if (typeof raw !== "string" || raw.trim().length === 0) {
        return c.json({ error: `${field} must be a non-empty string.` }, 400);
      }
      updates[field] =
        field === "countryCode" ? raw.trim().toUpperCase() : raw.trim();
    }
  }

  if (body.isDefault !== undefined) {
    if (typeof body.isDefault !== "boolean") {
      return c.json({ error: "isDefault must be a boolean." }, 400);
    }
    if (body.isDefault === true) {
      await clearOtherDefaults(db, user.id, id);
    }
    updates.isDefault = body.isDefault;
  }

  const [updated] = await db
    .update(addresses)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(addresses.id, id))
    .returning();

  return c.json({ data: updated });
});

addressRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const db = createDb(c.env.DB);
  const id = c.req.param("id");

  const [existing] = await db
    .select({ id: addresses.id })
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "Address not found." }, 404);
  }

  await db.delete(addresses).where(eq(addresses.id, id));

  return c.json({ data: { id } });
});
