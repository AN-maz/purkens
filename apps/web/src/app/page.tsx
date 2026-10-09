import Link from "next/link";
import { ProductList } from "@/components/product-list";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-xl bg-neutral-900 px-6 py-12 text-white">
        <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">
          Karpet pilihan untuk rumah Anda
        </h1>
        <p className="mt-3 max-w-xl text-neutral-300">
          Koleksi karpet tenun tangan dan modern dari UMKM lokal. Harga tampil
          dalam IDR atau USD.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded bg-white px-5 py-2 font-medium text-neutral-900 hover:bg-neutral-200"
        >
          Lihat semua produk
        </Link>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Produk unggulan</h2>
          <Link href="/products" className="text-sm hover:underline">
            Lihat semua
          </Link>
        </div>
        <ProductList limit={4} />
      </section>
    </div>
  );
}
