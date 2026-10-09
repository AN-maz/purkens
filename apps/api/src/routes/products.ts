import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";
import { createDb, productImages, productPrices, products } from "../db";
import type { Env } from "../env";

const CURRENCIES = ["IDR", "USD"] as const;
type Currency = (typeof CURRENCIES)[number];

function parseCurrency(value: string | undefined): Currency | null {
  const currency = (value ?? "IDR").toUpperCase();
  return CURRENCIES.includes(currency as Currency)
    ? (currency as Currency)
    : null;
}

export const productRoutes = new Hono<{ Bindings: Env }>();

productRoutes.get("/", async (c) => {
  const currency = parseCurrency(c.req.query("currency"));
  if (!currency) {
    return c.json({ error: "Invalid currency. Use IDR or USD." }, 400);
  }

  const db = createDb(c.env.DB);

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      stock: products.stock,
      status: products.status,
      currency: productPrices.currency,
      price: productPrices.amount,
    })
    .from(products)
    .innerJoin(
      productPrices,
      and(
        eq(productPrices.productId, products.id),
        eq(productPrices.currency, currency),
      ),
    )
    .where(eq(products.status, "ACTIVE"))
    .orderBy(asc(products.createdAt));

  const allImages = await db
    .select({
      productId: productImages.productId,
      url: productImages.url,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .orderBy(asc(productImages.sortOrder));

  const primaryImage = new Map<string, string>();
  for (const image of allImages) {
    if (!primaryImage.has(image.productId)) {
      primaryImage.set(image.productId, image.url);
    }
  }

  const data = rows.map((row) => ({
    ...row,
    image: primaryImage.get(row.id) ?? null,
  }));

  return c.json({ data });
});

productRoutes.get("/:slug", async (c) => {
  const currency = parseCurrency(c.req.query("currency"));
  if (!currency) {
    return c.json({ error: "Invalid currency. Use IDR or USD." }, 400);
  }

  const slug = c.req.param("slug");
  const db = createDb(c.env.DB);

  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      description: products.description,
      stock: products.stock,
      weightGrams: products.weightGrams,
      lengthCm: products.lengthCm,
      widthCm: products.widthCm,
      heightCm: products.heightCm,
      status: products.status,
      currency: productPrices.currency,
      price: productPrices.amount,
    })
    .from(products)
    .innerJoin(
      productPrices,
      and(
        eq(productPrices.productId, products.id),
        eq(productPrices.currency, currency),
      ),
    )
    .where(and(eq(products.slug, slug), eq(products.status, "ACTIVE")))
    .limit(1);

  if (!product) {
    return c.json({ error: "Product not found." }, 404);
  }

  const images = await db
    .select({ url: productImages.url })
    .from(productImages)
    .where(eq(productImages.productId, product.id))
    .orderBy(asc(productImages.sortOrder));

  return c.json({
    data: {
      ...product,
      images: images.map((image) => image.url),
    },
  });
});
