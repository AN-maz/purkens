import { Suspense } from "react";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Memuat…</p>}>
      <RegisterForm />
    </Suspense>
  );
}
