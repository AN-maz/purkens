import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { createAuth } from "../auth";
import { createDb, users } from "../db";
import type { Env } from "../env";

export type Role = "CUSTOMER" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export type Variables = {
  user: AuthUser;
};

export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDb(c.env.DB);
  const [row] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  c.set("user", {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: (row?.role as Role) ?? "CUSTOMER",
  });

  await next();
});

export const requireAdmin = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const user = c.get("user");

  if (user.role !== "ADMIN") {
    return c.json({ error: "Forbidden" }, 403);
  }

  await next();
});
