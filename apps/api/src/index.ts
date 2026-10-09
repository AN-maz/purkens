import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { createDb, products } from "./db";
import type { Env } from "./env";
import { productRoutes } from "./routes/products";

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

app.route("/products", productRoutes);

export default app;
