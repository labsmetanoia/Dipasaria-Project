"use client";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Field } from "@/components/ui";
import { waLink } from "@/lib/format";
import { useT } from "@/lib/i18n/client";

export function ContactForm({ whatsapp, storeName }: { whatsapp: string; storeName: string }) {
 const { locale } = useT();
 const c = locale === "en"
    ? { name: "Full name", phone: "WhatsApp number", subject: "Subject", message: "Your question", send: "Send via WhatsApp", subjects: ["Business account & wholesale prices", "Household order", "Supplier partnership", "Complaint or replacement", "Other"], hint: "The message opens in WhatsApp on your device; nothing is sent until you press send there." }
    : { name: "Nama lengkap", phone: "Nomor WhatsApp", subject: "Perihal", message: "Pesan Anda", send: "Kirim melalui WhatsApp", subjects: ["Akun bisnis dan harga grosir", "Pesanan rumah tangga", "Kerja sama pemasok", "Keluhan atau penggantian produk", "Lainnya"], hint: "Pesan akan terbuka di aplikasi WhatsApp Anda, dan baru terkirim setelah Anda menekan tombol kirim di sana." };
 const [f, setF] = useState({ name: "", phone: "", subject: c.subjects[0], message: "" });
 const text = `${locale === "en" ? "Hello" : "Halo"} ${storeName},\n\n${c.subject}: ${f.subject}\n${c.name}: ${f.name}\n${c.phone}: ${f.phone}\n\n${f.message}`;
 return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); window.open(waLink(whatsapp, text), "_blank"); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={c.name}><input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label={c.phone}><input className="input" inputMode="tel" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      </div>
      <Field label={c.subject}><select className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}>{c.subjects.map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label={c.message}><textarea className="input" rows={4} required value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Field>
      <div className="flex flex-wrap items-center gap-3"><button className="btn-accent"><MessageCircle className="h-4 w-4" /> {c.send}</button><p className="font-sans text-xs text-mute">{c.hint}</p></div>
    </form>
  );
}
