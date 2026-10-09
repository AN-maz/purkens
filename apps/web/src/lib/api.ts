export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export type Currency = "IDR" | "USD";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error ?? `Request gagal (${response.status})`,
    );
  }

  return payload as T;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  stock: number;
  status: "ACTIVE" | "INACTIVE";
  currency: Currency;
  price: number;
  image: string | null;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  stock: number;
  weightGrams: number;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  status: "ACTIVE" | "INACTIVE";
  currency: Currency;
  price: number;
  images: string[];
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "INACTIVE";
  stock: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Cart {
  currency: Currency;
  items: CartItem[];
  subtotal: number;
  totalQuantity: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "ADMIN";
}

export interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  countryCode: string;
  isDefault: boolean;
}

export function formatPrice(amount: number, currency: Currency): string {
  if (currency === "IDR") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
}
