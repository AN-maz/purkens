"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useCart, useCurrency } from "./providers";

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { cart } = useCart();
  const router = useRouter();

  const count = cart?.totalQuantity ?? 0;

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          BUKENS
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/products" className="hover:underline">
            Produk
          </Link>
          <Link href="/cart" className="hover:underline">
            Keranjang{count > 0 ? ` (${count})` : ""}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <div className="flex overflow-hidden rounded border">
            {(["IDR", "USD"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCurrency(option)}
                className={`px-2 py-1 ${
                  currency === option
                    ? "bg-neutral-900 text-white"
                    : "bg-white text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {!loading &&
            (user ? (
              <div className="flex items-center gap-3">
                <span className="text-neutral-600">{user.name}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded border px-3 py-1 hover:bg-neutral-100"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="hover:underline">
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="rounded bg-neutral-900 px-3 py-1 text-white hover:bg-neutral-700"
                >
                  Daftar
                </Link>
              </div>
            ))}
        </div>
      </div>
    </header>
  );
}
