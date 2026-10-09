import { Hono } from "hono";
import { requireAdmin, requireAuth, type Variables } from "../middleware/auth";
import type { Env } from "../env";

export const adminRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

adminRoutes.use("*", requireAuth, requireAdmin);

adminRoutes.get("/ping", (c) => {
  return c.json({ data: { message: "admin ok", user: c.get("user") } });
});
