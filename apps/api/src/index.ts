import { Hono } from "hono";
import { cors } from "hono/cors";
import { sql } from "drizzle-orm";
import { createAuth } from "./auth";
import { createDb, products } from "./db";
import type { Env } from "./env";
import { addressRoutes } from "./routes/addresses";
import { adminRoutes } from "./routes/admin";
import { cartRoutes } from "./routes/cart";
import { meRoutes } from "./routes/me";
import { productRoutes } from "./routes/products";

const app = new Hono<{ Bindings: Env }>();

// CORS: izinkan web (WEB_URL) dan baseURL sendiri, dengan cookie.
app.use("*", (c, next) =>
  cors({
    origin: (origin) =>
      origin === c.env.WEB_URL || origin === c.env.BETTER_AUTH_URL
        ? origin
        : undefined,
    credentials: true,
  })(c, next),
);

// Better Auth handler (register, login, logout, session) di /api/auth/*
app.all("/api/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

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
app.route("/cart", cartRoutes);
app.route("/addresses", addressRoutes);
app.route("/me", meRoutes);
app.route("/admin", adminRoutes);

export default app;
