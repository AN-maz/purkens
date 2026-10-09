import { Hono } from "hono";
import { requireAuth, type Variables } from "../middleware/auth";
import type { Env } from "../env";

export const meRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

meRoutes.get("/", requireAuth, (c) => {
  return c.json({ data: c.get("user") });
});
