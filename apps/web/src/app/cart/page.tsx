"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/api";
import { useAuth, useCart, useCurrency } from "@/components/providers";

export default function CartPage() {
  const { user, loading: authLoading } = useAuth();
  const { cart, loading, updateItem, removeItem } = useCart();
  const { currency } = useCurrency();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleQuantity(itemId: string, quantity: number) {
    setBusyId(itemId);
    setError(null);
    try {
      await updateItem(itemId, quantity);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(itemId: string) {
    setBusyId(itemId);
    setError(null);
    try {
      await removeItem(itemId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || loading) {
    return <p className="text-sm text-neutral-500">Memuat keranjang…</p>;
  }

  if (!user) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Keranjang</h1>
        <p className="text-neutral-600">
          Silakan{" "}
          <Link href="/login?next=/cart" className="underline">
            masuk
          </Link>{" "}
          untuk melihat keranjang Anda.
        </p>
      </div>
    );
  }

  const items = cart?.items ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Keranjang</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <div className="space-y-3">
          <p className="text-neutral-600">Keranjang Anda masih kosong.</p>
          <Link
            href="/products"
            className="inline-block rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700"
          >
            Mulai belanja
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y rounded-lg border bg-white">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-4 p-4"
              >
                <div className="min-w-40 flex-1">
                  <Link
                    href={`/products/${item.slug}`}
                    className="font-medium hover:underline"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm text-neutral-500">
                    {formatPrice(item.unitPrice, currency)} / item
                  </p>
                  {item.status !== "ACTIVE" && (
                    <p className="text-xs text-red-600">Produk tidak aktif</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuantity(item.id, item.quantity - 1)}
                    disabled={busyId === item.id || item.quantity <= 1}
                    className="h-8 w-8 rounded border hover:bg-neutral-100 disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleQuantity(item.id, item.quantity + 1)}
                    disabled={busyId === item.id}
                    className="h-8 w-8 rounded border hover:bg-neutral-100 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                <div className="w-32 text-right font-medium">
                  {formatPrice(item.lineTotal, currency)}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  disabled={busyId === item.id}
                  className="text-sm text-red-600 hover:underline disabled:opacity-40"
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between rounded-lg border bg-white p-4">
            <span className="text-neutral-600">
              Subtotal ({cart?.totalQuantity} item)
            </span>
            <span className="text-xl font-semibold">
              {formatPrice(cart?.subtotal ?? 0, currency)}
            </span>
          </div>

          <p className="text-xs text-neutral-500">
            Subtotal dihitung di server. Ongkir & pajak dihitung saat checkout.
          </p>
        </>
      )}
    </div>
  );
}
