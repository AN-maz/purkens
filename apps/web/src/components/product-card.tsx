"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Currency, type Product } from "@/lib/api";

export function ProductCard({
  product,
  currency,
}: {
  product: Product;
  currency: Currency;
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-lg border bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-neutral-100">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            Tanpa gambar
          </div>
        )}
      </div>
      <div className="space-y-1 p-4">
        <h3 className="font-medium">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-neutral-500">
          {product.description}
        </p>
        <p className="pt-1 font-semibold">
          {formatPrice(product.price, currency)}
        </p>
        <p className="text-xs text-neutral-400">Stok: {product.stock}</p>
      </div>
    </Link>
  );
}
