"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { adminLoginAction } from "@/actions/admin";
import { Logo } from "@/components/Logo";
import { Sisik } from "@/components/site/Decor";
import { Field } from "@/components/ui";

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(adminLoginAction, undefined);
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ocean-950 px-4">
      <Sisik />
      <form action={action} className="relative w-full max-w-sm border-t-4 border-coral-500 bg-white p-7 shadow-float">
        <Logo size="md" />
        <h1 className="mt-6 text-2xl text-ocean-900">Panel pengelola</h1>
        <p className="mt-1 text-sm text-mute">Masuk untuk mengelola pesanan, produk dan pelanggan.</p>
        <div className="mt-6 space-y-4">
          <Field label="Email"><input name="email" type="email" className="input" autoComplete="username" placeholder="pemilik@dipasaria.id" /></Field>
          <Field label="Kata sandi"><input name="password" type="password" className="input" autoComplete="current-password" required /></Field>
        </div>
        {state?.error && <p className="mt-3 text-sm text-gold-ink">{state.error}</p>}
        <button className="btn-primary mt-5 w-full" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Masuk"}</button>
        <p className="mt-4 text-xs text-mute">Mode demo (tanpa Supabase): email bebas, kata sandi dari DEMO_ADMIN_PASSWORD (bawaan: dipasaria).</p>
      </form>
    </main>
  );
}
