"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, type Cart } from "@/lib/api";
import { useAuth } from "./auth-provider";
import { useCurrency } from "./currency-provider";

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { currency } = useCurrency();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(null);
      return;
    }
    setLoading(true);
    try {
      const result = await apiFetch<{ data: Cart }>(
        `/cart?currency=${currency}`,
      );
      setCart(result.data);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [user, currency]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const addItem = useCallback(
    async (productId: string, quantity = 1) => {
      const result = await apiFetch<{ data: Cart }>(
        `/cart/items?currency=${currency}`,
        {
          method: "POST",
          body: JSON.stringify({ productId, quantity }),
        },
      );
      setCart(result.data);
    },
    [currency],
  );

  const updateItem = useCallback(
    async (itemId: string, quantity: number) => {
      const result = await apiFetch<{ data: Cart }>(
        `/cart/items/${itemId}?currency=${currency}`,
        {
          method: "PATCH",
          body: JSON.stringify({ quantity }),
        },
      );
      setCart(result.data);
    },
    [currency],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const result = await apiFetch<{ data: Cart }>(
        `/cart/items/${itemId}?currency=${currency}`,
        { method: "DELETE" },
      );
      setCart(result.data);
    },
    [currency],
  );

  return (
    <CartContext.Provider
      value={{ cart, loading, refresh, addItem, updateItem, removeItem }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart harus dipakai di dalam CartProvider");
  }
  return context;
}
