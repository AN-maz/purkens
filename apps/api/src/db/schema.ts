import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
};

export const products = sqliteTable(
  "products",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    stock: integer("stock").notNull().default(0),
    weightGrams: integer("weight_grams").notNull().default(0),
    lengthCm: integer("length_cm"),
    widthCm: integer("width_cm"),
    heightCm: integer("height_cm"),
    status: text("status", { enum: ["ACTIVE", "INACTIVE"] })
      .notNull()
      .default("ACTIVE"),
    ...timestamps,
  },
  (table) => [index("products_status_idx").on(table.status)],
);

export const productPrices = sqliteTable(
  "product_prices",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    currency: text("currency", { enum: ["IDR", "USD"] }).notNull(),
    amount: integer("amount").notNull(),
    ...timestamps,
  },
  (table) => [
    index("product_prices_product_id_idx").on(table.productId),
    uniqueIndex("product_prices_product_currency_uniq").on(
      table.productId,
      table.currency,
    ),
  ],
);

export const productImages = sqliteTable(
  "product_images",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index("product_images_product_id_idx").on(table.productId)],
);
