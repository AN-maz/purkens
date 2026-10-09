import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";
import { cartItems, carts, createDb, productPrices, products } from "../db";
import { parseCurrency, type Currency } from "../lib/currency";
import { requireAuth, type Variables } from "../middleware/auth";
import type { Env } from "../env";

type Db = ReturnType<typeof createDb>;
type Cart = typeof carts.$inferSelect;

async function getOrCreateCart(db: Db, userId: string): Promise<Cart> {
  const [existing] = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db.insert(carts).values({ userId }).returning();
  return created;
}

async function buildCartPayload(db: Db, cartId: string, currency: Currency) {
  const rows = await db
    .select({
      id: cartItems.id,
      productId: products.id,
      name: products.name,
      slug: products.slug,
      status: products.status,
      stock: products.stock,
      unitPrice: productPrices.amount,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .innerJoin(
      productPrices,
      and(
        eq(productPrices.productId, products.id),
        eq(productPrices.currency, currency),
      ),
    )
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.createdAt));

  const items = rows.map((row) => ({
    ...row,
    lineTotal: row.unitPrice * row.quantity,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return { currency, items, subtotal, totalQuantity };
}

export const cartRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

cartRoutes.use("*", requireAuth);

cartRoutes.get("/", async (c) => {
  const currency = parseCurrency(c.req.query("currency"));
  if (!currency) {
    return c.json({ error: "Invalid currency. Use IDR or USD." }, 400);
  }

  const user = c.get("user");
  const db = createDb(c.env.DB);
  const cart = await getOrCreateCart(db, user.id);

  return c.json({ data: await buildCartPayload(db, cart.id, currency) });
});

cartRoutes.post("/items", async (c) => {
  const currency = parseCurrency(c.req.query("currency"));
  if (!currency) {
    return c.json({ error: "Invalid currency. Use IDR or USD." }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const productId = body?.productId;
  const quantity = body?.quantity ?? 1;

  if (typeof productId !== "string" || productId.length === 0) {
    return c.json({ error: "productId is required." }, 400);
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return c.json({ error: "quantity must be an integer >= 1." }, 400);
  }

  const user = c.get("user");
  const db = createDb(c.env.DB);

  const [product] = await db
    .select({ id: products.id, status: products.status })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    return c.json({ error: "Product not found." }, 404);
  }
  if (product.status !== "ACTIVE") {
    return c.json({ error: "Product is not available." }, 400);
  }

  const cart = await getOrCreateCart(db, user.id);

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cart.id),
        eq(cartItems.productId, productId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(cartItems)
      .set({ quantity: existing.quantity + quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({
      cartId: cart.id,
      productId,
      quantity,
    });
  }

  return c.json({ data: await buildCartPayload(db, cart.id, currency) }, 201);
});

cartRoutes.patch("/items/:id", async (c) => {
  const currency = parseCurrency(c.req.query("currency"));
  if (!currency) {
    return c.json({ error: "Invalid currency. Use IDR or USD." }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const quantity = body?.quantity;

  if (!Number.isInteger(quantity) || quantity < 1) {
    return c.json({ error: "quantity must be an integer >= 1." }, 400);
  }

  const user = c.get("user");
  const db = createDb(c.env.DB);
  const itemId = c.req.param("id");

  const [item] = await db
    .select({ id: cartItems.id, cartId: cartItems.cartId })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .where(and(eq(cartItems.id, itemId), eq(carts.userId, user.id)))
    .limit(1);

  if (!item) {
    return c.json({ error: "Cart item not found." }, 404);
  }

  await db
    .update(cartItems)
    .set({ quantity, updatedAt: new Date() })
    .where(eq(cartItems.id, item.id));

  return c.json({ data: await buildCartPayload(db, item.cartId, currency) });
});

cartRoutes.delete("/items/:id", async (c) => {
  const currency = parseCurrency(c.req.query("currency"));
  if (!currency) {
    return c.json({ error: "Invalid currency. Use IDR or USD." }, 400);
  }

  const user = c.get("user");
  const db = createDb(c.env.DB);
  const itemId = c.req.param("id");

  const [item] = await db
    .select({ id: cartItems.id, cartId: cartItems.cartId })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .where(and(eq(cartItems.id, itemId), eq(carts.userId, user.id)))
    .limit(1);

  if (!item) {
    return c.json({ error: "Cart item not found." }, 404);
  }

  await db.delete(cartItems).where(eq(cartItems.id, item.id));

  return c.json({ data: await buildCartPayload(db, item.cartId, currency) });
});
