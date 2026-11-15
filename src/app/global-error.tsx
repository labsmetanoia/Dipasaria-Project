"use client";
// Last-resort screen when the root layout itself fails (it replaces <html>, so no app styles or providers).
import { useEffect } from "react";
import { sendClientError } from "@/components/ErrorReporter";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (!error.digest) sendClientError(error.message || "Root error", { stack: error.stack });
  }, [error]);
  return (
    <html lang="id">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF8F4", color: "#000", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, textTransform: "uppercase" }}>Maaf, ada gangguan.</h1>
          <p style={{ color: "#555" }}>Kami sudah menerima laporannya. Silakan coba lagi sebentar lagi.</p>
          {error.digest && <p style={{ fontFamily: "monospace", fontSize: 12, color: "#555" }}>Ref: {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: 16, padding: "12px 20px", background: "#EAB200", border: 0, fontWeight: 700, cursor: "pointer" }}>Coba lagi</button>
        </div>
      </body>
    </html>
  );
}
