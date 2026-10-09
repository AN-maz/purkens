import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { createDb, products } from "./db";

export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("/health/db", async (c) => {
  const db = createDb(c.env.DB);
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products);
  return c.json({ status: "ok", products: row?.count ?? 0 });
});

export default app;
