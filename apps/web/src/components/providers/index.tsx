"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./auth-provider";
import { CartProvider } from "./cart-provider";
import { CurrencyProvider } from "./currency-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <CartProvider>{children}</CartProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}

export { useAuth } from "./auth-provider";
export { useCart } from "./cart-provider";
export { useCurrency } from "./currency-provider";
