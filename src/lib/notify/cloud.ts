// Meta WhatsApp Cloud API: POST /{phone-number-id}/messages with type "template".
// Env: WHATSAPP_TOKEN (permanent system-user token), WHATSAPP_PHONE_NUMBER_ID, optional WHATSAPP_API_VERSION (default v26.0)
// and WHATSAPP_TEMPLATE_LANG (default "id").
import "server-only";

export function cloudConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

function base(): string {
  // WHATSAPP_API_BASE points automated tests at a local stand-in; only localhost is accepted.
  const o = process.env.WHATSAPP_API_BASE;
  if (o && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o)) return o;
  return "https://graph.facebook.com";
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string; retry: boolean };

export async function sendTemplate(to: string, template: string, params: string[]): Promise<SendResult> {
  const version = process.env.WHATSAPP_API_VERSION || "v26.0";
  const url = `${base()}/${version}/${encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID!)}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "id" },
          components: params.length ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] : [],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { messages?: Array<{ id: string }>; error?: { message?: string; code?: number } };
    if (res.ok && body.messages?.[0]?.id) return { ok: true, id: body.messages[0].id };
    const msg = `${res.status} ${body.error?.code ?? ""} ${body.error?.message ?? "unknown error"}`.trim();
    // Rate limits and server errors are worth retrying; a wrong template, number or token is not.
    return { ok: false, error: msg, retry: res.status === 429 || res.status >= 500 || body.error?.code === 130429 || body.error?.code === 131056 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), retry: true };
  }
}
