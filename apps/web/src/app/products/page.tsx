import { ProductList } from "@/components/product-list";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Produk</h1>
      <ProductList />
    </div>
  );
}
