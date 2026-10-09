"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiFetch,
  formatPrice,
  type ProductDetail as Product,
} from "@/lib/api";
import { useAuth, useCart, useCurrency } from "./providers";

export function ProductDetail({ slug }: { slug: string }) {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;
    setProduct(null);
    setError(null);
    setAdded(false);

    apiFetch<{ data: Product }>(`/products/${slug}?currency=${currency}`)
      .then((result) => {
        if (active) setProduct(result.data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Produk tidak ditemukan.");
        }
      });

    return () => {
      active = false;
    };
  }, [slug, currency]);

  async function handleAdd() {
    if (!product) return;
    if (!user) {
      router.push(`/login?next=/products/${slug}`);
      return;
    }
    setAdding(true);
    setError(null);
    try {
      await addItem(product.id, quantity);
      setAdded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah ke keranjang.");
    } finally {
      setAdding(false);
    }
  }

  if (error && !product) {
    return (
      <div className="space-y-3">
        <p className="text-red-600">{error}</p>
        <Link href="/products" className="text-sm hover:underline">
          ← Kembali ke daftar produk
        </Link>
      </div>
    );
  }

  if (!product) {
    return <p className="text-sm text-neutral-500">Memuat produk…</p>;
  }

  const mainImage = product.images[0] ?? null;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <div className="relative aspect-square overflow-hidden rounded-lg border bg-neutral-100">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              Tanpa gambar
            </div>
          )}
        </div>
        {product.images.length > 1 && (
          <div className="flex gap-2">
            {product.images.map((url) => (
              <div
                key={url}
                className="relative h-16 w-16 overflow-hidden rounded border bg-neutral-100"
              >
                <Image src={url} alt={product.name} fill className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <p className="text-3xl font-bold">
          {formatPrice(product.price, currency)}
        </p>
        <p className="text-sm text-neutral-500">Stok tersedia: {product.stock}</p>
        <p className="text-neutral-700">{product.description}</p>

        <div className="flex items-center gap-3">
          <label className="text-sm text-neutral-600" htmlFor="quantity">
            Jumlah
          </label>
          <input
            id="quantity"
            type="number"
            min={1}
            max={product.stock > 0 ? product.stock : 1}
            value={quantity}
            onChange={(event) =>
              setQuantity(Math.max(1, Number(event.target.value) || 1))
            }
            className="w-20 rounded border px-2 py-1"
          />
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || product.stock < 1}
          className="rounded bg-neutral-900 px-5 py-2 text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {product.stock < 1
            ? "Stok habis"
            : adding
              ? "Menambahkan…"
              : "Tambah ke keranjang"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {added && (
          <p className="text-sm text-green-700">
            Ditambahkan ke keranjang.{" "}
            <Link href="/cart" className="font-medium underline">
              Lihat keranjang
            </Link>
          </p>
        )}

        <div>
          <Link href="/products" className="text-sm text-neutral-500 hover:underline">
            ← Kembali ke daftar produk
          </Link>
        </div>
      </div>
    </div>
  );
}
