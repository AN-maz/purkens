import { Hono } from "hono";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  addresses,
  cartItems,
  carts,
  createDb,
  orderItems,
  orders,
  productPrices,
  products,
  type ShippingAddressSnapshot,
} from "../db";
import { parseCurrency } from "../lib/currency";
import { requireAuth, type Variables } from "../middleware/auth";
import type { Env } from "../env";

type Db = ReturnType<typeof createDb>;
type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;

// Mock sementara. Fase 9 (DOKU) & Fase 12 (Shipping API) akan menggantikan ini.
const MOCK_SHIPPING_FEE = 0;
const MOCK_TAX = 0;
const MOCK_DISCOUNT = 0;

function serializeOrder(order: OrderRow, items: OrderItemRow[]) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    tax: order.tax,
    discount: order.discount,
    total: order.total,
    shippingAddressSnapshot: order.shippingAddressSnapshot,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
    })),
  };
}

async function loadOrder(db: Db, orderId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return null;
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.createdAt));

  return serializeOrder(order, items);
}

export const checkoutRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

checkoutRoutes.use("*", requireAuth);

checkoutRoutes.post("/", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    addressId?: unknown;
    currency?: unknown;
  } | null;

  const currency = parseCurrency(
    typeof body?.currency === "string" ? body.currency : undefined,
  );
  if (!currency) {
    return c.json({ error: "Invalid currency. Use IDR or USD." }, 400);
  }

  const addressId = body?.addressId;
  if (typeof addressId !== "string" || addressId.length === 0) {
    return c.json({ error: "addressId is required." }, 400);
  }

  const user = c.get("user");
  const db = createDb(c.env.DB);

  // 1. Cart harus ada & tidak kosong.
  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, user.id))
    .limit(1);

  if (!cart) {
    return c.json({ error: "Cart is empty." }, 400);
  }

  // 2. Ambil item + produk + harga (harga dari DB, bukan dari client).
  const rows = await db
    .select({
      productId: products.id,
      name: products.name,
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
    .where(eq(cartItems.cartId, cart.id))
    .orderBy(asc(cartItems.createdAt));

  if (rows.length === 0) {
    return c.json({ error: "Cart is empty." }, 400);
  }

  // 3. Semua produk harus ACTIVE.
  const unavailable = rows.filter((row) => row.status !== "ACTIVE");
  if (unavailable.length > 0) {
    return c.json(
      {
        error: `Produk tidak tersedia: ${unavailable
          .map((row) => row.name)
          .join(", ")}`,
      },
      409,
    );
  }

  // 4. Cek stok awal (pengurangan atomik menyusul).
  const insufficient = rows.filter((row) => row.stock < row.quantity);
  if (insufficient.length > 0) {
    return c.json(
      {
        error: `Stok tidak cukup: ${insufficient
          .map((row) => row.name)
          .join(", ")}`,
      },
      409,
    );
  }

  // 5. Alamat harus milik user.
  const [address] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, user.id)))
    .limit(1);

  if (!address) {
    return c.json({ error: "Address not found." }, 404);
  }

  // 6. Hitung total di backend (total dari client diabaikan sepenuhnya).
  const subtotal = rows.reduce(
    (sum, row) => sum + row.unitPrice * row.quantity,
    0,
  );
  const shippingFee = MOCK_SHIPPING_FEE;
  const tax = MOCK_TAX;
  const discount = MOCK_DISCOUNT;
  const total = subtotal + shippingFee + tax - discount;

  const snapshot: ShippingAddressSnapshot = {
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    addressLine: address.addressLine,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
    country: address.country,
    countryCode: address.countryCode,
  };

  // 7. Kurangi stok secara atomik: hanya jika masih mencukupi.
  const stockResults = await c.env.DB.batch(
    rows.map((row) =>
      c.env.DB.prepare(
        "UPDATE products SET stock = stock - ?, updated_at = unixepoch() WHERE id = ? AND status = 'ACTIVE' AND stock >= ?",
      ).bind(row.quantity, row.productId, row.quantity),
    ),
  );

  const failed = rows.filter(
    (_, index) => (stockResults[index]?.meta.changes ?? 0) < 1,
  );

  if (failed.length > 0) {
    // Kompensasi: kembalikan stok yang sempat berkurang.
    const succeeded = rows.filter(
      (_, index) => (stockResults[index]?.meta.changes ?? 0) > 0,
    );
    if (succeeded.length > 0) {
      await c.env.DB.batch(
        succeeded.map((row) =>
          c.env.DB.prepare(
            "UPDATE products SET stock = stock + ?, updated_at = unixepoch() WHERE id = ?",
          ).bind(row.quantity, row.productId),
        ),
      );
    }

    return c.json(
      {
        error: `Stok tidak cukup: ${failed
          .map((row) => row.name)
          .join(", ")}`,
      },
      409,
    );
  }

  // 8. Simpan order + order_items + kosongkan cart dalam satu batch atomik.
  const orderId = crypto.randomUUID();
  const insertOrder = c.env.DB.prepare(
    `INSERT INTO orders (
       id, order_number, user_id, currency,
       subtotal, shipping_fee, tax, discount, total,
       status, shipping_address_snapshot, created_at, updated_at
     ) VALUES (
       ?, 'BK-' || printf('%04d', (
         SELECT COALESCE(MAX(CAST(substr(order_number, 4) AS INTEGER)), 0) + 1
         FROM orders
       )), ?, ?, ?, ?, ?, ?, ?, 'PENDING_PAYMENT', ?, unixepoch(), unixepoch()
     )`,
  ).bind(
    orderId,
    user.id,
    currency,
    subtotal,
    shippingFee,
    tax,
    discount,
    total,
    JSON.stringify(snapshot),
  );

  const insertItems = rows.map((row) =>
    c.env.DB.prepare(
      `INSERT INTO order_items (
         id, order_id, product_id, product_name, unit_price, quantity, subtotal, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())`,
    ).bind(
      crypto.randomUUID(),
      orderId,
      row.productId,
      row.name,
      row.unitPrice,
      row.quantity,
      row.unitPrice * row.quantity,
    ),
  );

  const clearCart = c.env.DB.prepare(
    "DELETE FROM cart_items WHERE cart_id = ?",
  ).bind(cart.id);

  try {
    await c.env.DB.batch([insertOrder, ...insertItems, clearCart]);
  } catch (error) {
    // Gagal menyimpan order -> kembalikan stok.
    await c.env.DB.batch(
      rows.map((row) =>
        c.env.DB.prepare(
          "UPDATE products SET stock = stock + ?, updated_at = unixepoch() WHERE id = ?",
        ).bind(row.quantity, row.productId),
      ),
    );
    console.error("checkout failed", error);
    return c.json({ error: "Failed to create order." }, 500);
  }

  return c.json({ data: await loadOrder(db, orderId) }, 201);
});

export const orderRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

orderRoutes.use("*", requireAuth);

orderRoutes.get("/", async (c) => {
  const user = c.get("user");
  const db = createDb(c.env.DB);

  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt));

  if (orderRows.length === 0) {
    return c.json({ data: [] });
  }

  const itemRows = await db
    .select({ item: orderItems })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(eq(orders.userId, user.id))
    .orderBy(asc(orderItems.createdAt));

  const byOrder = new Map<string, OrderItemRow[]>();
  for (const { item } of itemRows) {
    const list = byOrder.get(item.orderId) ?? [];
    list.push(item);
    byOrder.set(item.orderId, list);
  }

  const data = orderRows.map((order) =>
    serializeOrder(order, byOrder.get(order.id) ?? []),
  );

  return c.json({ data });
});

orderRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const db = createDb(c.env.DB);
  const id = c.req.param("id");

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, user.id)))
    .limit(1);

  if (!order) {
    return c.json({ error: "Order not found." }, 404);
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.createdAt));

  return c.json({ data: serializeOrder(order, items) });
});
