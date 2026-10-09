"use client";

import { useEffect, useState } from "react";
import { apiFetch, type Product } from "@/lib/api";
import { useCurrency } from "./providers";
import { ProductCard } from "./product-card";

export function ProductList({ limit }: { limit?: number }) {
  const { currency } = useCurrency();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setProducts(null);
    setError(null);

    apiFetch<{ data: Product[] }>(`/products?currency=${currency}`)
      .then((result) => {
        if (active) setProducts(result.data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Gagal memuat produk.");
        }
      });

    return () => {
      active = false;
    };
  }, [currency]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!products) {
    return <p className="text-sm text-neutral-500">Memuat produk…</p>;
  }

  const list = limit ? products.slice(0, limit) : products;

  if (list.length === 0) {
    return <p className="text-sm text-neutral-500">Belum ada produk.</p>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {list.map((product) => (
        <ProductCard key={product.id} product={product} currency={currency} />
      ))}
    </div>
  );
}
